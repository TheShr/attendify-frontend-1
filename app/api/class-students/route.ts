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

// point to the SAME backend DB
const DB_PATH = "C:/Users/anujs/OneDrive/Desktop/final1/backend-test/instance/attendance_system.db";

let _db: any;
function db() {
  if (_db) return _db;
  const BetterSqlite3 = loadBetterSqlite3();
  _db = new BetterSqlite3(DB_PATH);
  return _db;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const idStr = url.searchParams.get("class_id") || url.searchParams.get("classId");
    const classId = Number(idStr);
    if (!Number.isFinite(classId)) {
      return NextResponse.json({ ok: false, error: "class_id is required and must be a number" }, { status: 400 });
    }

    const database = db();

    const cls = database
      .prepare(
        `SELECT id, class_name, section, subject, schedule_info, created_at
         FROM classes WHERE id = ?`
      )
      .get(classId);
    if (!cls) {
      return NextResponse.json({ ok: false, error: "Class not found" }, { status: 404 });
    }

    const students = database
      .prepare(
        `SELECT s.id, s.name, s.roll_no, s.email
           FROM students s
           JOIN enrollments e ON e.student_id = s.id
          WHERE e.class_id = ?
       ORDER BY s.name COLLATE NOCASE ASC`
      )
      .all(classId);

    return NextResponse.json({ ok: true, data: { class: cls, students } });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err?.message ?? "DB error" }, { status: 500 });
  }
}
