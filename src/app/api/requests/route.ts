import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { verifySecret } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, contact, message } = body

  if (!message || message.trim() === '') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const result = await pool.query(
    `INSERT INTO "Request" (name, contact, message) VALUES ($1, $2, $3) RETURNING *`,
    [name?.trim() || null, contact?.trim() || null, message.trim().slice(0, 2000)]
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
