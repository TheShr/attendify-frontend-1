// app/api/register-student/route.ts (or .js)
import { NextResponse } from 'next/server';

export const runtime = 'nodejs'; // file streaming is safer on node runtime
const API_BASE = (() => {
  const candidates = [
    process.env.NEXT_PUBLIC_API_URL,
    process.env.NEXT_PUBLIC_API_BASE,
    process.env.VITE_API_URL,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim().replace(/\/$/, '');
    }
  }
  return 'http://localhost:5000/api';
})();

export async function POST(req: Request) {
  const ct = req.headers.get('content-type') || '';
  try {
    if (ct.startsWith('multipart/form-data')) {
      // accept form + file from the browser
      const inForm = await req.formData();
      const outForm = new FormData();
      for (const [k, v] of inForm) {
        if (v instanceof File) outForm.append(k, v, v.name);
        else outForm.append(k, String(v));
      }
      // forward to Flask
      const r = await fetch(`${API_BASE}/register-student`, { method: 'POST', body: outForm });
      const body = await r.text();
      return new NextResponse(body, {
        status: r.status,
        headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' },
      });
    } else {
      // JSON fallback (e.g., if you ever send data URLs instead of files)
      const json = await req.json().catch(() => ({}));
      const r = await fetch(`${API_BASE}/register-student`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(json),
      });
      const body = await r.text();
      return new NextResponse(body, {
        status: r.status,
        headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' },
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: 'proxy_failed', detail: String(err) }, { status: 502 });
  }
}
