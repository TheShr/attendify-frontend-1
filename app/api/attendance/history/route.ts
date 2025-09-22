import { NextResponse } from "next/server";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function loadBetterSqlite3(): any {
  try {
    // @ts-ignore
    return (global as any).__bsqlite || ((global as any).__bsqlite = eval("require")("better-sqlite3"));
  } catch {
    throw new Error("better-sqlite3 is not installed. Run: npm i better-sqlite3");
  }
}

const DB_PATH = path.join(process.cwd(), "instance", "attendance_system.db");

let _db: any;
function db() {
  if (_db) return _db;
  const BetterSqlite3 = loadBetterSqlite3();
  _db = new BetterSqlite3(DB_PATH);
  ensureSchema(_db);
  return _db;
}

function ensureSchema(conn: any) {
  // minimal schema to match your existing route
  conn.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      section TEXT,
      subject TEXT,
      schedule_info TEXT,
      created_at TEXT DEFAULT datetime('now')
    );
  `);
  conn.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      roll_no TEXT,
      email TEXT
    );
  `);
  conn.exec(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      enrolled_at TEXT DEFAULT datetime('now'),
      UNIQUE(class_id, student_id)
    );
  `);
  conn.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      status TEXT NOT NULL,
      recognized_name TEXT,
      source TEXT DEFAULT 'manual'
    );
  `);
}

type ManualAttendanceRecord = {
  student_id: number;
  status: "present" | "absent" | "late";
  time: string | null;
  recognized_name: string | null;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const classIdParam = url.searchParams.get("class_id");
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const search = (url.searchParams.get("student_query") ?? "").trim();
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("page_size") ?? 20)));
    const offset = (page - 1) * pageSize;

    const where: string[] = [];
    const params: Array<string | number> = [];

    if (classIdParam && classIdParam !== "all") {
      where.push("a.class_id = ?");
      params.push(Number(classIdParam));
    }
    if (startDate) {
      where.push("date(a.date) >= date(?)");
      params.push(startDate);
    }
    if (endDate) {
      where.push("date(a.date) <= date(?)");
      params.push(endDate);
    }
    if (search) {
      where.push("(s.name LIKE ? OR s.roll_no LIKE ?)");
      const pattern = `%${search}%`;
      params.push(pattern, pattern);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const database = db();

    const totalRow = database
      .prepare(
        `SELECT COUNT(*) AS count
         FROM attendance a
         JOIN students s ON s.id = a.student_id
         JOIN classes c ON c.id = a.class_id
         ${whereSql}`
      )
      .get(...params);

    const total = Number(totalRow?.count ?? 0);

    const rows = database
      .prepare(
        `SELECT a.id,
                a.date,
                a.time,
                a.status,
                a.recognized_name,
                a.source,
                s.id AS student_id,
                s.name AS student_name,
                s.roll_no,
                c.id AS class_id,
                c.class_name,
                c.section
         FROM attendance a
         JOIN students s ON s.id = a.student_id
         JOIN classes c ON c.id = a.class_id
         ${whereSql}
         ORDER BY date(a.date) DESC, a.time DESC, a.id DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, offset);

    return NextResponse.json({
      ok: true,
      data: rows,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ ok: false, error: error?.message ?? "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const classId = Number(body?.class_id);
    const dateRaw = typeof body?.date === "string" ? body.date.trim() : "";
    const itemsRaw = Array.isArray(body?.items) ? body.items : [];
    const sourceRaw = typeof body?.source === "string" ? body.source.trim().toLowerCase() : "manual"; // "manual" | "facial"

    if (!Number.isFinite(classId) || classId <= 0) {
      return NextResponse.json({ ok: false, error: "class_id must be a positive number" }, { status: 400 });
    }
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateRaw)) {
      return NextResponse.json({ ok: false, error: "date must be YYYY-MM-DD" }, { status: 400 });
    }

    const normalizedItems: ManualAttendanceRecord[] = [];
    for (const item of itemsRaw) {
      const studentId = Number(item?.student_id);
      const st = (typeof item?.status === "string" ? item.status.toLowerCase().trim() : "") as ManualAttendanceRecord["status"];
      if (!Number.isFinite(studentId)) continue;

      // normalize: accept "present" | "absent" | "late" (late -> present in this schema)
      const statusValue: "present" | "absent" =
        st === "absent" ? "absent" : "present";

      const timeValue =
        item?.time === null
          ? null
          : typeof item?.time === "string"
          ? item.time.trim() || null
          : null;

      const recognizedNameValue =
        item?.recognized_name === null
          ? null
          : typeof item?.recognized_name === "string"
          ? item.recognized_name.trim() || null
          : null;

      normalizedItems.push({
        student_id: studentId,
        status: statusValue,
        time: timeValue,
        recognized_name: recognizedNameValue,
      });
    }

    if (!normalizedItems.length) {
      return NextResponse.json({ ok: false, error: "items must include at least one valid attendance record" }, { status: 400 });
    }

    const database = db();
    const enrollmentCheck = database.prepare(`SELECT 1 FROM enrollments WHERE class_id = ? AND student_id = ?`);
    const insertStmt = database.prepare(
      `INSERT INTO attendance (student_id, class_id, date, time, status, recognized_name, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const runInsert = database.transaction((records: ManualAttendanceRecord[]) => {
      let count = 0;
      for (const r of records) {
        const ok = enrollmentCheck.get(classId, r.student_id);
        if (!ok) {
          throw new Error(`Student ${r.student_id} is not enrolled in class ${classId}`);
        }
        insertStmt.run(
          r.student_id,
          classId,
          dateRaw,
          r.time,
          r.status,
          r.recognized_name,
          sourceRaw === "facial" ? "facial" : "manual"
        );
        count++;
      }
      return count;
    });

    const inserted = runInsert(normalizedItems);
    return NextResponse.json({ ok: true, inserted });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ ok: false, error: error?.message ?? "DB error" }, { status: 500 });
  }
}

/*
NOTE for the alternate schema (screenshot) where attendance has:
  attendance_id, student_id, session_id, timestamp, status, method, marked_by, geo_lat, geo_long
You could replace the insertStmt with:

const insertStmt = database.prepare(
  `INSERT INTO attendance (student_id, session_id, timestamp, status, method, marked_by, geo_lat, geo_long)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

…then map:
- session_id: from body.session_id (or create one per session)
- timestamp: r.time ?? datetime('now')
- status: r.status
- method: sourceRaw === 'facial' ? 'facial' : 'manual'
- marked_by: NULL or current user id
- geo_lat/geo_long: from request (if you collect it)

and remove date/class_id fields (since that schema doesn’t have them).
*/
