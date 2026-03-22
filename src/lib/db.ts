import pg from 'pg'

const globalForPool = globalThis as unknown as {
  pool: pg.Pool | undefined
}

export const pool =
  globalForPool.pool ??
  new pg.Pool({ connectionString: process.env.DATABASE_URL })

if (process.env.NODE_ENV !== 'production') globalForPool.pool = pool

export async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "Request" (
      id SERIAL PRIMARY KEY,
      name TEXT,
      contact TEXT,
      message TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Ticket fields — idempotent, safe to run on every startup
  const alterStatements = [
    `ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS title TEXT`,
    `ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS ticket_type TEXT`,
    `ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS affected_area TEXT`,
    `ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS steps_to_reproduce TEXT`,
    `ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS expected_behavior TEXT`,
    `ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS actual_behavior TEXT`,
    `ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'`,
  ]
  for (const sql of alterStatements) {
    await pool.query(sql)
  }
}
