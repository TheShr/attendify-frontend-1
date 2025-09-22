import { NextResponse } from 'next/server'

export async function GET() {
  // TODO: replace with real DB query aggregations; ensure data is anonymized
  return NextResponse.json({
    attendanceAvg: 0.82,
    compliancePct: 0.71,
    atRiskCohorts: 18,
    institutions: 124,
  })
}
