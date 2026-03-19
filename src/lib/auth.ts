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
