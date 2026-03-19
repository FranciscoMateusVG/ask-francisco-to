import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySecret } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const secret = req.headers.get('x-admin-secret') ?? ''
  if (!verifySecret(secret)) return NextResponse.json({ ok: false })

  await prisma.request.update({
    where: { id: parseInt(id) },
    data: { done: true },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const secret = req.headers.get('x-admin-secret') ?? ''
  if (!verifySecret(secret)) return NextResponse.json({ ok: false })

  await prisma.request.delete({
    where: { id: parseInt(id) },
  })

  return NextResponse.json({ ok: true })
}
