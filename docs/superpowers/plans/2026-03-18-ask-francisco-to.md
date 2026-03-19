# Ask Francisco To — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public request intake website where anyone can leave a request for Francisco, and Francisco can view and manage them via a secret-word-protected admin page.

**Architecture:** Next.js App Router handles both frontend and API routes in a single container. PostgreSQL stores requests via Prisma ORM. A second Docker Compose service runs Postgres with a named volume for persistence. The app entrypoint runs `prisma migrate deploy` before starting the Next.js server, ensuring schema is always current on deploy.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Prisma ORM, PostgreSQL 16, Tailwind CSS, Jest + Testing Library, Docker Compose

---

## File Map

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Prisma data model — `Request` table |
| `src/lib/db.ts` | Prisma client singleton (safe for Next.js hot-reload) |
| `src/lib/auth.ts` | `verifySecret(provided)` — constant-time comparison against `ADMIN_SECRET` |
| `src/app/api/requests/route.ts` | `POST /api/requests` (public), `GET /api/requests` (admin) |
| `src/app/api/requests/[id]/route.ts` | `PATCH /api/requests/[id]` (mark done), `DELETE /api/requests/[id]` |
| `src/app/page.tsx` | Public submission form page |
| `src/app/admin/page.tsx` | Admin view page |
| `src/components/RequestForm.tsx` | Controlled form component — name, contact, message fields |
| `src/components/AdminPanel.tsx` | Admin UI — pending list, completed section, unlock field |
| `src/__tests__/auth.test.ts` | Unit tests for `verifySecret` |
| `src/__tests__/api.test.ts` | Integration tests for API routes (Prisma mocked) |
| `Dockerfile` | Multi-stage build: deps → builder → runner |
| `docker-compose.yml` | Two services: `app` + `db` (postgres:16-alpine) |
| `entrypoint.sh` | Runs `prisma migrate deploy` then `node server.js` |
| `.env.example` | Template with `ADMIN_SECRET`, `POSTGRES_PASSWORD`, `DATABASE_URL` |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`
- Create: `src/app/layout.tsx`, `src/app/globals.css`
- Create: `.env.example`

- [ ] **Step 1: Bootstrap Next.js app with TypeScript and Tailwind**

```bash
cd /Users/franciscogoncalves/ask-francisco-to
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-eslint
```

- [ ] **Step 2: Install Prisma and pg dependencies**

```bash
npm install prisma @prisma/client
npm install --save-dev jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
npx prisma init
```

- [ ] **Step 3: Create `.env.example`**

```
# Secret word for the admin panel — set something only you know
ADMIN_SECRET=

# Postgres password (used by both services)
POSTGRES_PASSWORD=

# Connection string — update yourpassword to match POSTGRES_PASSWORD
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/askfranciscoto
```

- [ ] **Step 4: Configure Jest — create `jest.config.ts`**

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

export default createJestConfig(config)
```

- [ ] **Step 5: Verify scaffold compiles**

```bash
npm run build
```

Expected: build succeeds (may show no pages yet, that's fine)

- [ ] **Step 6: Commit**

```bash
git init  # if not already a git repo
git add .
git commit -m "feat: scaffold Next.js app with Prisma and Tailwind"
```

---

## Task 2: Database Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/db.ts`

- [ ] **Step 1: Write the Prisma schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Request {
  id        Int      @id @default(autoincrement())
  name      String?
  contact   String?
  message   String
  done      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Create the Prisma client singleton — `src/lib/db.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 3: Generate Prisma client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client` message

- [ ] **Step 4: Run migration (requires local Postgres running)**

If you have Docker available locally:
```bash
docker run -d --name pg-dev -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=askfranciscoto -p 5432:5432 postgres:16-alpine
```

Then copy `.env.example` to `.env` and set `DATABASE_URL=postgresql://postgres:dev@localhost:5432/askfranciscoto`, then:

```bash
npx prisma migrate dev --name init
```

Expected: migration file created in `prisma/migrations/`

- [ ] **Step 5: Commit**

```bash
git add prisma/ src/lib/db.ts
git commit -m "feat: add Prisma schema and db client singleton"
```

---

## Task 3: Auth Utility (TDD)

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/__tests__/auth.test.ts`

- [ ] **Step 1: Write failing tests — `src/__tests__/auth.test.ts`**

```typescript
import { verifySecret } from '@/lib/auth'

describe('verifySecret', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, ADMIN_SECRET: 'banana123' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns true when the provided secret matches ADMIN_SECRET', () => {
    expect(verifySecret('banana123')).toBe(true)
  })

  it('returns false when the provided secret does not match', () => {
    expect(verifySecret('wrongpassword')).toBe(false)
  })

  it('returns false when provided secret is empty', () => {
    expect(verifySecret('')).toBe(false)
  })

  it('returns false when provided secret is different length', () => {
    expect(verifySecret('banana')).toBe(false)
  })

  it('returns false when ADMIN_SECRET env var is not set', () => {
    delete process.env.ADMIN_SECRET
    expect(verifySecret('banana123')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest src/__tests__/auth.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/auth'`

- [ ] **Step 3: Implement `src/lib/auth.ts`**

```typescript
import { createHash, timingSafeEqual } from 'crypto'

function hash(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

export function verifySecret(provided: string): boolean {
  const expected = process.env.ADMIN_SECRET
  if (!expected || !provided) return false

  try {
    return timingSafeEqual(hash(provided), hash(expected))
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest src/__tests__/auth.test.ts --no-coverage
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/__tests__/auth.test.ts
git commit -m "feat: add constant-time secret verification utility"
```

---

## Task 4: API Routes (TDD)

**Files:**
- Create: `src/app/api/requests/route.ts`
- Create: `src/app/api/requests/[id]/route.ts`
- Create: `src/__tests__/api.test.ts`

- [ ] **Step 1: Write failing API tests — `src/__tests__/api.test.ts`**

```typescript
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

    const res = await PATCH(req, { params: { id: '1' } })
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('returns { ok: false } when secret is invalid', async () => {
    mockVerify.mockReturnValue(false)

    const req = new NextRequest('http://localhost/api/requests/1', {
      method: 'PATCH',
      headers: { 'x-admin-secret': 'wrong' },
    })

    const res = await PATCH(req, { params: { id: '1' } })
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

    const res = await DELETE(req, { params: { id: '1' } })
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest src/__tests__/api.test.ts --no-coverage
```

Expected: FAIL — modules not found

- [ ] **Step 3: Implement `src/app/api/requests/route.ts`**

```typescript
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
```

- [ ] **Step 4: Implement `src/app/api/requests/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySecret } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const secret = req.headers.get('x-admin-secret') ?? ''
  if (!verifySecret(secret)) return NextResponse.json({ ok: false })

  await prisma.request.update({
    where: { id: parseInt(params.id) },
    data: { done: true },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const secret = req.headers.get('x-admin-secret') ?? ''
  if (!verifySecret(secret)) return NextResponse.json({ ok: false })

  await prisma.request.delete({
    where: { id: parseInt(params.id) },
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Run all tests — confirm they pass**

```bash
npx jest --no-coverage
```

Expected: PASS — all tests

- [ ] **Step 6: Commit**

```bash
git add src/app/api/ src/__tests__/api.test.ts
git commit -m "feat: add API routes for requests with tests"
```

---

## Task 5: Public Submission Form

**Files:**
- Create: `src/components/RequestForm.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create `src/components/RequestForm.tsx`**

```tsx
'use client'

import { useState } from 'react'

type State = 'idle' | 'loading' | 'success' | 'error'

export function RequestForm() {
  const [state, setState] = useState<State>('idle')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
  const [validationError, setValidationError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError('')

    if (!message.trim()) {
      setValidationError('Please write your request before sending.')
      return
    }

    setState('loading')

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact, message }),
      })

      if (!res.ok) throw new Error('Server error')
      setState('success')
    } catch {
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl text-center">
        <div className="text-5xl mb-4">🙌</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Got it, thanks!</h2>
        <p className="text-gray-500 text-sm">Francisco will see your request. You&apos;re done!</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
      <div className="mb-4">
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
          Your name <span className="text-gray-300 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="João Silva"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-purple-400"
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
          How to reach you <span className="text-gray-300 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={contact}
          onChange={e => setContact(e.target.value)}
          placeholder="WhatsApp, email, whatever works..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-purple-400"
        />
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
          What do you need? <span className="text-purple-400">*</span>
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Ask Francisco to..."
          maxLength={2000}
          rows={4}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-purple-400 resize-none"
        />
        {validationError && (
          <p className="text-red-400 text-xs mt-1">{validationError}</p>
        )}
      </div>

      {state === 'error' && (
        <p className="text-red-400 text-sm mb-3 text-center">Something went wrong, please try again.</p>
      )}

      <button
        type="submit"
        disabled={state === 'loading'}
        className="w-full bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-60"
      >
        {state === 'loading' ? 'Sending...' : 'Send Request ✨'}
      </button>

      <p className="text-center text-xs text-gray-300 mt-3">* only the request is required</p>
    </form>
  )
}
```

- [ ] **Step 2: Update `src/app/page.tsx`**

```tsx
import { RequestForm } from '@/components/RequestForm'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-500 to-purple-800 flex flex-col items-center justify-center px-4 py-12">
      <h1 className="text-white text-3xl font-bold mb-2">✉️ Ask Francisco To...</h1>
      <p className="text-purple-200 text-sm mb-8">Need something done? Leave your request below 👋</p>
      <RequestForm />
    </main>
  )
}
```

- [ ] **Step 3: Run dev server and verify the form looks right**

```bash
npm run dev
```

Open http://localhost:3000. Check:
- Purple gradient background
- Form with 3 fields (name, contact, message)
- Submit button
- Try submitting with empty message — should show validation error
- Try submitting with a message — should show thank-you screen

- [ ] **Step 4: Commit**

```bash
git add src/components/RequestForm.tsx src/app/page.tsx
git commit -m "feat: add public request submission form"
```

---

## Task 6: Admin Panel

**Files:**
- Create: `src/components/AdminPanel.tsx`
- Create: `src/app/admin/page.tsx`

- [ ] **Step 1: Create `src/components/AdminPanel.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'

type Request = {
  id: number
  name: string | null
  contact: string | null
  message: string
  done: boolean
  createdAt: string
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'))
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function AdminPanel() {
  const [secret, setSecret] = useState('')
  const [requests, setRequests] = useState<Request[]>([])
  const [unlocked, setUnlocked] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  async function fetchRequests(s: string) {
    const res = await fetch('/api/requests', {
      headers: { 'x-admin-secret': s },
    })
    const body = await res.json()
    if (body.ok) {
      setRequests(body.data)
      setUnlocked(true)
    } else {
      setUnlocked(false)
    }
  }

  async function markDone(id: number) {
    await fetch(`/api/requests/${id}`, {
      method: 'PATCH',
      headers: { 'x-admin-secret': secret },
    })
    setRequests(prev => prev.map(r => r.id === id ? { ...r, done: true } : r))
  }

  async function deleteRequest(id: number) {
    await fetch(`/api/requests/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-secret': secret },
    })
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  const pending = requests.filter(r => !r.done)
  const completed = requests.filter(r => r.done)

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Requests</h1>
        <span className="bg-purple-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
          {pending.length} pending
        </span>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center gap-3 mb-6 text-sm">
        <span>🔑</span>
        <input
          type="password"
          placeholder="enter secret word"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchRequests(secret)}
          className="border border-gray-200 rounded px-2 py-1 text-sm w-36 focus:outline-none"
        />
        <button
          onClick={() => fetchRequests(secret)}
          className="bg-purple-500 text-white text-xs font-semibold px-3 py-1 rounded"
        >
          Unlock
        </button>
        {unlocked && <span className="text-green-500 font-semibold text-xs">✓ unlocked</span>}
      </div>

      {unlocked && (
        <>
          {pending.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">No pending requests. You&apos;re all caught up! 🎉</p>
          )}

          {pending.map(r => (
            <div key={r.id} className="bg-white rounded-xl p-4 mb-3 border-l-4 border-purple-400 shadow-sm flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-800 mb-1">{r.message}</p>
                <p className="text-xs text-gray-400">
                  {r.name || 'Anonymous'}
                  {r.contact && ` · ${r.contact}`}
                  {` · ${timeAgo(r.createdAt)}`}
                </p>
              </div>
              <div className="flex gap-2 ml-4 flex-shrink-0">
                <button
                  onClick={() => markDone(r.id)}
                  className="bg-green-50 text-green-500 text-xs font-semibold px-2 py-1 rounded"
                >
                  ✓ Done
                </button>
                <button
                  onClick={() => deleteRequest(r.id)}
                  className="bg-red-50 text-red-400 text-xs font-semibold px-2 py-1 rounded"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          {completed.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-3 block"
              >
                {showCompleted ? '▾' : '▸'} Show completed ({completed.length})
              </button>

              {showCompleted && completed.map(r => (
                <div key={r.id} className="bg-white rounded-xl p-4 mb-3 border-l-4 border-gray-200 shadow-sm flex justify-between items-start opacity-60">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1 line-through">{r.message}</p>
                    <p className="text-xs text-gray-400">
                      {r.name || 'Anonymous'}
                      {r.contact && ` · ${r.contact}`}
                      {` · ${timeAgo(r.createdAt)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteRequest(r.id)}
                    className="bg-red-50 text-red-400 text-xs font-semibold px-2 py-1 rounded ml-4 flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/admin/page.tsx`**

```tsx
import { AdminPanel } from '@/components/AdminPanel'

export default function AdminPage() {
  return <AdminPanel />
}
```

- [ ] **Step 3: Verify admin page in dev server**

Open http://localhost:3000/admin. Check:
- Secret word field renders
- Entering wrong word shows nothing
- Entering correct word (from your `.env`) shows request list
- Mark done moves item to completed section
- Completed section is collapsed by default, toggle works
- Delete removes item from list

- [ ] **Step 4: Commit**

```bash
git add src/components/AdminPanel.tsx src/app/admin/page.tsx
git commit -m "feat: add admin panel with request management"
```

---

## Task 7: Docker Setup

**Files:**
- Create: `Dockerfile`
- Create: `entrypoint.sh`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create `entrypoint.sh`**

```bash
#!/bin/sh
set -e
echo "Running database migrations..."
npx prisma migrate deploy
echo "Starting server..."
exec node server.js
```

Make it executable:
```bash
chmod +x entrypoint.sh
```

- [ ] **Step 2: Create `Dockerfile`**

```dockerfile
FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache python3 make g++
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
```

- [ ] **Step 3: Enable standalone output in `next.config.ts`**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
}

export default nextConfig
```

- [ ] **Step 4: Create `docker-compose.yml`**

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - ADMIN_SECRET=${ADMIN_SECRET}
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/askfranciscoto
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=askfranciscoto
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
```

- [ ] **Step 5: Test the Docker build locally**

```bash
cp .env.example .env
# Edit .env and fill in ADMIN_SECRET and POSTGRES_PASSWORD
docker compose up --build
```

Open http://localhost:3000 — form should load and work end-to-end.

- [ ] **Step 6: Commit**

```bash
git add Dockerfile entrypoint.sh docker-compose.yml next.config.ts .env.example
git commit -m "feat: add Docker setup for Dokploy deployment"
```

---

## Task 8: Startup Guard

**Files:**
- Create: `src/instrumentation.ts`

Next.js App Router loads route modules lazily (on first request), so an `assertEnv()` call in a route file won't fire at server startup. Instead, use Next.js's `instrumentation.ts` hook, which runs once when the server boots — before handling any requests.

- [ ] **Step 1: Create `src/instrumentation.ts`**

```typescript
export async function register() {
  if (!process.env.ADMIN_SECRET) {
    console.error('FATAL: ADMIN_SECRET environment variable is not set. Refusing to start.')
    process.exit(1)
  }
}
```

- [ ] **Step 2: Enable instrumentation in `next.config.ts`**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
}

export default nextConfig
```

> **Note:** `instrumentationHook` is only needed for Next.js < 15. If using Next.js 15+, instrumentation is enabled by default — remove the `experimental` block.

- [ ] **Step 3: Also add the guard to `entrypoint.sh` for belt-and-suspenders**

Update `entrypoint.sh`:

```bash
#!/bin/sh
set -e

if [ -z "$ADMIN_SECRET" ]; then
  echo "FATAL: ADMIN_SECRET is not set. Refusing to start."
  exit 1
fi

echo "Running database migrations..."
npx prisma migrate deploy
echo "Starting server..."
exec node server.js
```

- [ ] **Step 4: Verify it works**

```bash
ADMIN_SECRET="" npm run dev
```

Expected: server crashes at boot with the FATAL message (not on first request). Then run normally:

```bash
npm run dev
```

Expected: server starts fine.

- [ ] **Step 5: Commit**

```bash
git add src/instrumentation.ts next.config.ts entrypoint.sh
git commit -m "feat: crash on startup if ADMIN_SECRET is not set"
```

---

## Task 9: Final Checks & Deploy

- [ ] **Step 1: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass

- [ ] **Step 2: Do a full production build**

```bash
npm run build
```

Expected: no errors

- [ ] **Step 3: Deploy to Dokploy**

In Dokploy:
1. Create a new Compose application
2. Point it at your Git repo
3. Set environment variables: `ADMIN_SECRET`, `POSTGRES_PASSWORD`
4. Deploy

- [ ] **Step 4: Smoke test production**

- Visit the live URL — form loads
- Submit a test request
- Go to `/admin`, enter secret word — request appears
- Mark it done — moves to completed
- Delete it — disappears

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: final cleanup before deploy"
```
