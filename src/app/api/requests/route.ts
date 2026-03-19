import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySecret } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, contact, message } = body

  if (!message || message.trim() === '') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const request = await prisma.request.create({
    data: {
      name: name?.trim() || null,
      contact: contact?.trim() || null,
      message: message.trim().slice(0, 2000),
    },
  })

  return NextResponse.json(request, { status: 201 })
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret') ?? ''

  if (!verifySecret(secret)) {
    return NextResponse.json({ ok: false, data: null })
  }

  const data = await prisma.request.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ ok: true, data })
}
