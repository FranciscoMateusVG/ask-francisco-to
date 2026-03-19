import { NextRequest } from 'next/server'

// Mock startup guard so it doesn't exit during tests
jest.mock('@/instrumentation', () => ({ register: jest.fn() }))

// Mock pg pool
jest.mock('@/lib/db', () => ({
  pool: {
    query: jest.fn(),
  },
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
  verifySecret: jest.fn(),
}))

import { pool } from '@/lib/db'
import { verifySecret } from '@/lib/auth'
import { POST, GET } from '@/app/api/requests/route'
import { PATCH, DELETE } from '@/app/api/requests/[id]/route'

const mockQuery = pool.query as jest.MockedFunction<typeof pool.query>
const mockVerify = verifySecret as jest.MockedFunction<typeof verifySecret>

beforeEach(() => jest.clearAllMocks())

// ─── POST /api/requests ──────────────────────────────────────────────────────

describe('POST /api/requests', () => {
  it('creates a request and returns 201', async () => {
    const created = { id: 1, name: 'Maria', contact: null, message: 'Help!', done: false, createdAt: new Date() }
    mockQuery.mockResolvedValue({ rows: [created], rowCount: 1, command: 'INSERT', oid: 0, fields: [] })

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
    mockQuery.mockResolvedValue({ rows: [created], rowCount: 1, command: 'INSERT', oid: 0, fields: [] })

    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ name: '  Maria  ', contact: '  test@test.com  ', message: 'Hello' }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      ['Maria', 'test@test.com', 'Hello']
    )
  })

  it('sets name and contact to null when not provided', async () => {
    const created = { id: 3, name: null, contact: null, message: 'Just a message', done: false, createdAt: new Date() }
    mockQuery.mockResolvedValue({ rows: [created], rowCount: 1, command: 'INSERT', oid: 0, fields: [] })

    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ message: 'Just a message' }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [null, null, 'Just a message']
    )
  })

  it('sets name and contact to null when they are empty strings', async () => {
    const created = { id: 4, name: null, contact: null, message: 'Test', done: false, createdAt: new Date() }
    mockQuery.mockResolvedValue({ rows: [created], rowCount: 1, command: 'INSERT', oid: 0, fields: [] })

    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ name: '', contact: '', message: 'Test' }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [null, null, 'Test']
    )
  })

  it('truncates message to 2000 characters', async () => {
    const longMessage = 'A'.repeat(3000)
    const created = { id: 5, name: null, contact: null, message: 'A'.repeat(2000), done: false, createdAt: new Date() }
    mockQuery.mockResolvedValue({ rows: [created], rowCount: 1, command: 'INSERT', oid: 0, fields: [] })

    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ message: longMessage }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)
    const callArgs = mockQuery.mock.calls[0][1] as string[]
    expect(callArgs[2]).toHaveLength(2000)
  })

  it('trims message before storing', async () => {
    const created = { id: 6, name: null, contact: null, message: 'Trimmed', done: false, createdAt: new Date() }
    mockQuery.mockResolvedValue({ rows: [created], rowCount: 1, command: 'INSERT', oid: 0, fields: [] })

    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ message: '  Trimmed  ' }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)
    const callArgs = mockQuery.mock.calls[0][1] as string[]
    expect(callArgs[2]).toBe('Trimmed')
  })
})

// ─── GET /api/requests ───────────────────────────────────────────────────────

describe('GET /api/requests', () => {
  it('returns { ok: true, data } when secret is valid', async () => {
    mockVerify.mockReturnValue(true)
    const rows = [{ id: 1, name: null, contact: null, message: 'Test', done: false, createdAt: new Date() }]
    mockQuery.mockResolvedValue({ rows, rowCount: 1, command: 'SELECT', oid: 0, fields: [] })

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
    expect(mockVerify).toHaveBeenCalledWith('')
  })

  it('does not query database when auth fails', async () => {
    mockVerify.mockReturnValue(false)

    const req = new NextRequest('http://localhost/api/requests', {
      headers: { 'x-admin-secret': 'wrong' },
    })

    await GET(req)
    expect(mockQuery).not.toHaveBeenCalled()
  })
})

// ─── PATCH /api/requests/[id] ────────────────────────────────────────────────

describe('PATCH /api/requests/[id]', () => {
  it('marks request as done when secret is valid', async () => {
    mockVerify.mockReturnValue(true)
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] })

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
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('passes parsed integer ID to query', async () => {
    mockVerify.mockReturnValue(true)
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] })

    const req = new NextRequest('http://localhost/api/requests/42', {
      method: 'PATCH',
      headers: { 'x-admin-secret': 'banana123' },
    })

    await PATCH(req, { params: Promise.resolve({ id: '42' }) })
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [42]
    )
  })
})

// ─── DELETE /api/requests/[id] ───────────────────────────────────────────────

describe('DELETE /api/requests/[id]', () => {
  it('deletes request when secret is valid', async () => {
    mockVerify.mockReturnValue(true)
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1, command: 'DELETE', oid: 0, fields: [] })

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
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('passes parsed integer ID to query', async () => {
    mockVerify.mockReturnValue(true)
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1, command: 'DELETE', oid: 0, fields: [] })

    const req = new NextRequest('http://localhost/api/requests/7', {
      method: 'DELETE',
      headers: { 'x-admin-secret': 'banana123' },
    })

    await DELETE(req, { params: Promise.resolve({ id: '7' }) })
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [7]
    )
  })
})
