import { NextResponse } from "next/server"

// --- Next route config ---
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

// --- DB wiring (better-sqlite3) ---
function loadBetterSqlite3(): any {
  try {
    // @ts-ignore avoid static resolution
    return (global as any).__bsqlite || ((global as any).__bsqlite = eval("require")("better-sqlite3"))
  } catch {
    throw new Error("better-sqlite3 is not installed. Run: npm i better-sqlite3")
  }
}

// Point to your BACKEND DB:
const DB_PATH = "C:/Users/anujs/OneDrive/Desktop/final1/backend-test/instance/attendance_system.db"

let _db: any
function db() {
  if (_db) return _db
  const BetterSqlite3 = loadBetterSqlite3()
  _db = new BetterSqlite3(DB_PATH)
  ensureSchema(_db)
  return _db
}

function ensureSchema(conn: any) {
  // Only minimal guards; we won’t mutate your real schema beyond safe creates.
  conn.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      section TEXT,
      subject TEXT,
      schedule_info TEXT,
      created_at TEXT DEFAULT datetime('now')
    );
  `)
  conn.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER,
      student_id INTEGER,
      name TEXT,
      roll_no TEXT,
      email TEXT,
      class_code TEXT,
      classCode TEXT
    );
  `)
  conn.exec(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      enrolled_at TEXT DEFAULT datetime('now'),
      UNIQUE(class_id, student_id)
    );
  `)
}

// --- helpers that adapt to your schema ---
function tableColumns(conn: any, table: string): Set<string> {
  const rows = conn.prepare(`PRAGMA table_info("${table}")`).all()
  return new Set(rows.map((r: any) => r.name))
}

/** returns the PK column name to use for students */
function studentPk(conn: any): "id" | "student_id" | null {
  const cols = tableColumns(conn, "students")
  if (cols.has("student_id")) return "student_id"
  if (cols.has("id")) return "id"
  return null
}

/** returns a safe SELECT expression that always yields a student id */
function studentIdExpr(conn: any): string {
  const cols = tableColumns(conn, "students")
  if (cols.has("student_id") && cols.has("id")) return "COALESCE(s.student_id, s.id)"
  if (cols.has("student_id")) return "s.student_id"
  if (cols.has("id")) return "s.id"
  // fallback to NULL to avoid SQL error
  return "NULL"
}

// --- GET /api/classes (list or one with students) ---
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const classIdParam = url.searchParams.get("class_id")
    const withStudentsParam = url.searchParams.get("with_students")
    const wantsStudents =
      !!withStudentsParam && withStudentsParam !== "0" && withStudentsParam.toLowerCase() !== "false"

    const conn = db()

    // One class + students
    if (classIdParam && wantsStudents) {
      const classId = Number(classIdParam)
      if (!Number.isFinite(classId)) {
        return NextResponse.json({ ok: false, error: "Invalid class_id" }, { status: 400 })
      }

      const cls = conn
        .prepare(
          `SELECT c.id, c.class_name, c.section, c.subject, c.schedule_info, c.created_at,
                  (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) AS student_count
           FROM classes c
           WHERE c.id = ?`
        )
        .get(classId)

      if (!cls) {
        return NextResponse.json({ ok: false, error: "Class not found" }, { status: 404 })
      }

      // Try enrollments first (JOIN uses detected PK)
      const pk = studentPk(conn)
      if (!pk) {
        return NextResponse.json(
          { ok: false, error: "students table has no id or student_id column" },
          { status: 500 }
        )
      }

      const idExpr = studentIdExpr(conn)

      let students: any[] = conn
        .prepare(
          `SELECT ${idExpr} AS student_id, s.name, s.roll_no, s.email
           FROM students s
           JOIN enrollments e ON e.student_id = s.${pk}
           WHERE e.class_id = ?
           ORDER BY s.name COLLATE NOCASE ASC`
        )
        .all(classId)

      // Fallback: match by class_code / classCode if no explicit enrollments
      if (!students.length) {
        const codes: string[] = []
        const name = (cls.class_name || "").trim()
        const section = (cls.section || "").trim()
        if (name) codes.push(name)                  // e.g., "maths101"
        if (name && section) codes.push(`${name}-${section}`) // e.g., "maths101-A"

        if (codes.length) {
          const placeholders = codes.map(() => "?").join(",")
          students = conn
            .prepare(
              `SELECT ${idExpr} AS student_id, s.name, s.roll_no, s.email
               FROM students s
               WHERE LOWER(COALESCE(s.class_code, s.classCode, '')) IN (${placeholders})
               ORDER BY s.name COLLATE NOCASE ASC`
            )
            .all(...codes.map((c) => c.toLowerCase()))
        }
      }

      return NextResponse.json({ ok: true, data: { class: cls, students } })
    }

    // List classes
    const rows = conn
      .prepare(
        `SELECT c.id, c.class_name, c.section, c.subject, c.schedule_info, c.created_at,
                COUNT(e.id) AS student_count
         FROM classes AS c
         LEFT JOIN enrollments AS e ON e.class_id = c.id
         GROUP BY c.id
         ORDER BY datetime(c.created_at) DESC, c.id DESC`
      )
      .all()

    return NextResponse.json({ ok: true, data: rows })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ ok: false, error: err?.message ?? "DB error" }, { status: 500 })
  }
}

// --- POST /api/classes (create) ---
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const class_name = String(body?.class_name ?? "").trim()
    const section = typeof body?.section === "string" ? body.section.trim() || null : null
    const subject = typeof body?.subject === "string" ? body.subject.trim() || null : null
    const schedule_info = typeof body?.schedule_info === "string" ? body.schedule_info.trim() || null : null

    if (!class_name) {
      return NextResponse.json({ ok: false, error: "class_name is required" }, { status: 400 })
    }

    const conn = db()
    const info = conn
      .prepare(`INSERT INTO classes (class_name, section, subject, schedule_info) VALUES (?, ?, ?, ?)`)
      .run(class_name, section, subject, schedule_info)

    const insertedId = Number(info.lastInsertRowid)
    const created = conn
      .prepare(
        `SELECT c.id, c.class_name, c.section, c.subject, c.schedule_info, c.created_at,
                COUNT(e.id) AS student_count
         FROM classes AS c
         LEFT JOIN enrollments AS e ON e.class_id = c.id
         WHERE c.id = ?
         GROUP BY c.id`
      )
      .get(insertedId)

    return NextResponse.json({ ok: true, data: created }, { status: 201 })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ ok: false, error: err?.message ?? "DB error" }, { status: 500 })
  }
}
