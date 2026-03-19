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
