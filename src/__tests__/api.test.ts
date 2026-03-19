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

// ─── POST /api/requests ──────────────────────────────────────────────────────

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
    const body = await res.json()
    expect(body.id).toBe(1)
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

  it('returns 400 if message is empty string', async () => {
    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', message: '' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('message is required')
  })

  it('returns 400 if message is whitespace-only', async () => {
    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ message: '   \n\t  ' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('trims name and contact fields', async () => {
    const created = { id: 2, name: 'Maria', contact: 'test@test.com', message: 'Hello', done: false, createdAt: new Date() }
    mockPrisma.create.mockResolvedValue(created)

    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ name: '  Maria  ', contact: '  test@test.com  ', message: 'Hello' }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)
    expect(mockPrisma.create).toHaveBeenCalledWith({
      data: {
        name: 'Maria',
        contact: 'test@test.com',
        message: 'Hello',
      },
    })
  })

  it('sets name and contact to null when not provided', async () => {
    const created = { id: 3, name: null, contact: null, message: 'Just a message', done: false, createdAt: new Date() }
    mockPrisma.create.mockResolvedValue(created)

    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ message: 'Just a message' }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)
    expect(mockPrisma.create).toHaveBeenCalledWith({
      data: {
        name: null,
        contact: null,
        message: 'Just a message',
      },
    })
  })

  it('sets name and contact to null when they are empty strings', async () => {
    const created = { id: 4, name: null, contact: null, message: 'Test', done: false, createdAt: new Date() }
    mockPrisma.create.mockResolvedValue(created)

    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ name: '', contact: '', message: 'Test' }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)
    expect(mockPrisma.create).toHaveBeenCalledWith({
      data: {
        name: null,
        contact: null,
        message: 'Test',
      },
    })
  })

  it('truncates message to 2000 characters', async () => {
    const longMessage = 'A'.repeat(3000)
    const created = { id: 5, name: null, contact: null, message: 'A'.repeat(2000), done: false, createdAt: new Date() }
    mockPrisma.create.mockResolvedValue(created)

    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ message: longMessage }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)
    const callArg = mockPrisma.create.mock.calls[0][0]
    expect(callArg.data.message).toHaveLength(2000)
  })

  it('trims message before storing', async () => {
    const created = { id: 6, name: null, contact: null, message: 'Trimmed', done: false, createdAt: new Date() }
    mockPrisma.create.mockResolvedValue(created)

    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ message: '  Trimmed  ' }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)
    expect(mockPrisma.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ message: 'Trimmed' }),
    })
  })
})

// ─── GET /api/requests ───────────────────────────────────────────────────────

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

  it('returns { ok: false } when x-admin-secret header is missing', async () => {
    mockVerify.mockReturnValue(false)

    const req = new NextRequest('http://localhost/api/requests')

    const res = await GET(req)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.data).toBeNull()
    // Should have been called with empty string when header is missing
    expect(mockVerify).toHaveBeenCalledWith('')
  })

  it('queries requests ordered by createdAt desc', async () => {
    mockVerify.mockReturnValue(true)
    mockPrisma.findMany.mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/requests', {
      headers: { 'x-admin-secret': 'banana123' },
    })

    await GET(req)
    expect(mockPrisma.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    })
  })

  it('does not query database when auth fails', async () => {
    mockVerify.mockReturnValue(false)

    const req = new NextRequest('http://localhost/api/requests', {
      headers: { 'x-admin-secret': 'wrong' },
    })

    await GET(req)
    expect(mockPrisma.findMany).not.toHaveBeenCalled()
  })
})

// ─── PATCH /api/requests/[id] ────────────────────────────────────────────────

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

  it('does not update database when auth fails', async () => {
    mockVerify.mockReturnValue(false)

    const req = new NextRequest('http://localhost/api/requests/1', {
      method: 'PATCH',
      headers: { 'x-admin-secret': 'wrong' },
    })

    await PATCH(req, { params: Promise.resolve({ id: '1' }) })
    expect(mockPrisma.update).not.toHaveBeenCalled()
  })

  it('passes parsed integer ID to prisma', async () => {
    mockVerify.mockReturnValue(true)
    mockPrisma.update.mockResolvedValue({ id: 42, name: null, contact: null, message: 'Test', done: true, createdAt: new Date() })

    const req = new NextRequest('http://localhost/api/requests/42', {
      method: 'PATCH',
      headers: { 'x-admin-secret': 'banana123' },
    })

    await PATCH(req, { params: Promise.resolve({ id: '42' }) })
    expect(mockPrisma.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { done: true },
    })
  })

  it('passes NaN to prisma when id is non-numeric (exposes missing validation)', async () => {
    mockVerify.mockReturnValue(true)
    mockPrisma.update.mockRejectedValue(new Error('Invalid value for argument `id`'))

    const req = new NextRequest('http://localhost/api/requests/abc', {
      method: 'PATCH',
      headers: { 'x-admin-secret': 'banana123' },
    })

    // parseInt('abc') = NaN — the route has no validation for this
    // This will cause an unhandled error from Prisma
    await expect(
      PATCH(req, { params: Promise.resolve({ id: 'abc' }) })
    ).rejects.toThrow()
  })
})

// ─── DELETE /api/requests/[id] ───────────────────────────────────────────────

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

  it('returns { ok: false } when secret is invalid', async () => {
    mockVerify.mockReturnValue(false)

    const req = new NextRequest('http://localhost/api/requests/1', {
      method: 'DELETE',
      headers: { 'x-admin-secret': 'wrong' },
    })

    const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) })
    const body = await res.json()
    expect(body.ok).toBe(false)
  })

  it('does not delete from database when auth fails', async () => {
    mockVerify.mockReturnValue(false)

    const req = new NextRequest('http://localhost/api/requests/1', {
      method: 'DELETE',
      headers: { 'x-admin-secret': 'wrong' },
    })

    await DELETE(req, { params: Promise.resolve({ id: '1' }) })
    expect(mockPrisma.delete).not.toHaveBeenCalled()
  })

  it('passes parsed integer ID to prisma', async () => {
    mockVerify.mockReturnValue(true)
    mockPrisma.delete.mockResolvedValue({ id: 7, name: null, contact: null, message: 'Test', done: false, createdAt: new Date() })

    const req = new NextRequest('http://localhost/api/requests/7', {
      method: 'DELETE',
      headers: { 'x-admin-secret': 'banana123' },
    })

    await DELETE(req, { params: Promise.resolve({ id: '7' }) })
    expect(mockPrisma.delete).toHaveBeenCalledWith({
      where: { id: 7 },
    })
  })

  it('passes NaN to prisma when id is non-numeric (exposes missing validation)', async () => {
    mockVerify.mockReturnValue(true)
    mockPrisma.delete.mockRejectedValue(new Error('Invalid value for argument `id`'))

    const req = new NextRequest('http://localhost/api/requests/notanumber', {
      method: 'DELETE',
      headers: { 'x-admin-secret': 'banana123' },
    })

    await expect(
      DELETE(req, { params: Promise.resolve({ id: 'notanumber' }) })
    ).rejects.toThrow()
  })
})
