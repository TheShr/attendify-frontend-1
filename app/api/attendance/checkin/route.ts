import { NextResponse } from 'next/server'
export async function POST(req: Request){
  const { lectureId, gps } = await req.json()
  // TODO: validate time + geofence
  return NextResponse.json({ ok: true, lectureId, gps })
}
