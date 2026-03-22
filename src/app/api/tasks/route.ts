import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

/**
 * Public endpoint — no auth required.
 * Returns all requests as tasks for Francisco's home-page task list.
 * Contact info is omitted to protect submitter privacy.
 */
export async function GET() {
  const result = await pool.query(
    `SELECT id, name, message, title, ticket_type, affected_area, priority, done, "createdAt"
     FROM "Request"
     ORDER BY "createdAt" DESC`
  )

  return NextResponse.json({ ok: true, data: result.rows })
}
