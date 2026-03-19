import { NextRequest } from 'next/server'

// Mock startup guard so it doesn't exit during tests
jest.mock('@/instrumentation', () => ({ register: jest.fn() }))

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    request: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
  verifySecret: jest.fn(),
}))

import { prisma } from '@/lib/db'
import { verifySecret } from '@/lib/auth'
import { POST, GET } from '@/app/api/requests/route'
import { PATCH, DELETE } from '@/app/api/requests/[id]/route'

const mockPrisma = prisma.request as jest.Mocked<typeof prisma.request>
const mockVerify = verifySecret as jest.MockedFunction<typeof verifySecret>

beforeEach(() => jest.clearAllMocks())

describe('POST /api/requests', () => {
  it('creates a request and returns 201', async () => {
    const created = { id: 1, name: 'Maria', contact: null, message: 'Help!', done: false, createdAt: new Date() }
    mockPrisma.create.mockResolvedValue(created)

    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ name: 'Maria', message: 'Help!' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('returns 400 if message is missing', async () => {
    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ name: 'Maria' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('GET /api/requests', () => {
  it('returns { ok: true, data } when secret is valid', async () => {
    mockVerify.mockReturnValue(true)
    const rows = [{ id: 1, name: null, contact: null, message: 'Test', done: false, createdAt: new Date() }]
    mockPrisma.findMany.mockResolvedValue(rows)

    const req = new NextRequest('http://localhost/api/requests', {
      headers: { 'x-admin-secret': 'banana123' },
    })

    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data).toHaveLength(1)
  })

  it('returns { ok: false, data: null } when secret is invalid', async () => {
    mockVerify.mockReturnValue(false)

    const req = new NextRequest('http://localhost/api/requests', {
      headers: { 'x-admin-secret': 'wrongword' },
    })

    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(false)
    expect(body.data).toBeNull()
  })
})

describe('PATCH /api/requests/[id]', () => {
  it('marks request as done when secret is valid', async () => {
    mockVerify.mockReturnValue(true)
    mockPrisma.update.mockResolvedValue({ id: 1, name: null, contact: null, message: 'Test', done: true, createdAt: new Date() })

    const req = new NextRequest('http://localhost/api/requests/1', {
      method: 'PATCH',
      headers: { 'x-admin-secret': 'banana123' },
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) })
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('returns { ok: false } when secret is invalid', async () => {
    mockVerify.mockReturnValue(false)

    const req = new NextRequest('http://localhost/api/requests/1', {
      method: 'PATCH',
      headers: { 'x-admin-secret': 'wrong' },
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) })
    const body = await res.json()
    expect(body.ok).toBe(false)
  })
})

describe('DELETE /api/requests/[id]', () => {
  it('deletes request when secret is valid', async () => {
    mockVerify.mockReturnValue(true)
    mockPrisma.delete.mockResolvedValue({ id: 1, name: null, contact: null, message: 'Test', done: true, createdAt: new Date() })

    const req = new NextRequest('http://localhost/api/requests/1', {
      method: 'DELETE',
      headers: { 'x-admin-secret': 'banana123' },
    })

    const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) })
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})
