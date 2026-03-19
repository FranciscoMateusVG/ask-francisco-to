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
}
