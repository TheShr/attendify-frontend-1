import { NextResponse } from 'next/server'
let ZONES:any[] = []
export async function GET(){ return NextResponse.json({ zones: ZONES }) }
export async function POST(req: Request){
  const body = await req.json()
  const zone = { id: crypto.randomUUID(), ...body }
  ZONES.push(zone)
  return NextResponse.json(zone, { status: 201 })
}
