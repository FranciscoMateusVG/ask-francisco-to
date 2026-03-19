import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { verifySecret } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const secret = req.headers.get('x-admin-secret') ?? ''
  if (!verifySecret(secret)) return NextResponse.json({ ok: false })

  await pool.query(
    `UPDATE "Request" SET done = true WHERE id = $1`,
    [parseInt(id)]
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const secret = req.headers.get('x-admin-secret') ?? ''
  if (!verifySecret(secret)) return NextResponse.json({ ok: false })

  await pool.query(
    `DELETE FROM "Request" WHERE id = $1`,
    [parseInt(id)]
  )

  return NextResponse.json({ ok: true })
}
