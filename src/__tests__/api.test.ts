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
  const baseRow = {
    id: 1, name: 'Maria', contact: null, message: 'Help!', title: null,
    ticket_type: null, affected_area: null, steps_to_reproduce: null,
    expected_behavior: null, actual_behavior: null, priority: 'medium',
    done: false, createdAt: new Date(),
  }

  it('creates a request and returns 201', async () => {
    mockQuery.mockResolvedValue({ rows: [baseRow], rowCount: 1, command: 'INSERT', oid: 0, fields: [] })

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
    mockQuery.mockResolvedValue({ rows: [baseRow], rowCount: 1, command: 'INSERT', oid: 0, fields: [] })

    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ name: '  Maria  ', contact: '  test@test.com  ', message: 'Hello' }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)
    const callArgs = mockQuery.mock.calls[0][1] as unknown[]
    expect(callArgs[0]).toBe('Maria')
    expect(callArgs[1]).toBe('test@test.com')
    expect(callArgs[2]).toBe('Hello')
  })

  it('sets name and contact to null when not provided', async () => {
    mockQuery.mockResolvedValue({ rows: [baseRow], rowCount: 1, command: 'INSERT', oid: 0, fields: [] })

    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ message: 'Just a message' }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)
    const callArgs = mockQuery.mock.calls[0][1] as unknown[]
    expect(callArgs[0]).toBeNull()
    expect(callArgs[1]).toBeNull()
    expect(callArgs[2]).toBe('Just a message')
  })

  it('sets name and contact to null when they are empty strings', async () => {
    mockQuery.mockResolvedValue({ rows: [baseRow], rowCount: 1, command: 'INSERT', oid: 0, fields: [] })

    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ name: '', contact: '', message: 'Test' }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)
    const callArgs = mockQuery.mock.calls[0][1] as unknown[]
    expect(callArgs[0]).toBeNull()
    expect(callArgs[1]).toBeNull()
    expect(callArgs[2]).toBe('Test')
  })

  it('truncates message to 2000 characters', async () => {
    const longMessage = 'A'.repeat(3000)
    mockQuery.mockResolvedValue({ rows: [baseRow], rowCount: 1, command: 'INSERT', oid: 0, fields: [] })

    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ message: longMessage }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)
    const callArgs = mockQuery.mock.calls[0][1] as unknown[]
    expect((callArgs[2] as string)).toHaveLength(2000)
  })

  it('trims message before storing', async () => {
    mockQuery.mockResolvedValue({ rows: [baseRow], rowCount: 1, command: 'INSERT', oid: 0, fields: [] })

    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ message: '  Trimmed  ' }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)
    const callArgs = mockQuery.mock.calls[0][1] as unknown[]
    expect(callArgs[2]).toBe('Trimmed')
  })

  it('stores ticket fields when provided', async () => {
    mockQuery.mockResolvedValue({ rows: [baseRow], rowCount: 1, command: 'INSERT', oid: 0, fields: [] })

    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Crashes on submit',
        title: 'Login bug',
        ticket_type: 'bug',
        priority: 'high',
        affected_area: 'Login page',
        steps_to_reproduce: '1. Go to login\n2. Click submit',
        expected_behavior: 'Should log in',
        actual_behavior: 'Crashes',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)
    const callArgs = mockQuery.mock.calls[0][1] as unknown[]
    expect(callArgs[3]).toBe('Login bug')       // title
    expect(callArgs[4]).toBe('bug')              // ticket_type
    expect(callArgs[5]).toBe('Login page')       // affected_area
    expect(callArgs[6]).toBe('1. Go to login\n2. Click submit') // steps_to_reproduce
    expect(callArgs[7]).toBe('Should log in')   // expected_behavior
    expect(callArgs[8]).toBe('Crashes')          // actual_behavior
    expect(callArgs[9]).toBe('high')             // priority
  })

  it('defaults priority to medium when not provided', async () => {
    mockQuery.mockResolvedValue({ rows: [baseRow], rowCount: 1, command: 'INSERT', oid: 0, fields: [] })

    const req = new NextRequest('http://localhost/api/requests', {
      method: 'POST',
      body: JSON.stringify({ message: 'Test' }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)
    const callArgs = mockQuery.mock.calls[0][1] as unknown[]
    expect(callArgs[9]).toBe('medium')
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
