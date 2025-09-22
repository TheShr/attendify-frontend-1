import { NextResponse } from 'next/server'
export async function PATCH(_req: Request, { params }: { params: { id: string } }){
  return NextResponse.json({ ok: true }) // TODO: real DB update
}
export async function DELETE(_req: Request, { params }: { params: { id: string } }){
  return NextResponse.json({ ok: true })
}
