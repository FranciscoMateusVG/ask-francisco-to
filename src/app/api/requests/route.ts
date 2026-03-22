import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { verifySecret } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    name,
    contact,
    message,
    title,
    ticket_type,
    affected_area,
    steps_to_reproduce,
    expected_behavior,
    actual_behavior,
    priority,
  } = body

  if (!message || message.trim() === '') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const result = await pool.query(
    `INSERT INTO "Request" (name, contact, message, title, ticket_type, affected_area, steps_to_reproduce, expected_behavior, actual_behavior, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      name?.trim() || null,
      contact?.trim() || null,
      message.trim().slice(0, 2000),
      title?.trim() || null,
      ticket_type || null,
      affected_area?.trim() || null,
      steps_to_reproduce?.trim() || null,
      expected_behavior?.trim() || null,
      actual_behavior?.trim() || null,
      priority || 'medium',
    ]
  )

  return NextResponse.json(result.rows[0], { status: 201 })
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret') ?? ''
  if (!verifySecret(secret)) {
    return NextResponse.json({ ok: false, data: null })
  }

  const result = await pool.query(
    `SELECT * FROM "Request" ORDER BY "createdAt" DESC`
  )

  return NextResponse.json({ ok: true, data: result.rows })
}
