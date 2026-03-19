export async function register() {
  if (!process.env.ADMIN_SECRET) {
    console.error('FATAL: ADMIN_SECRET environment variable is not set. Refusing to start.')
    process.exit(1)
  }

  // Ensure the database table exists on startup
  if (typeof window === 'undefined') {
    const { ensureSchema } = await import('@/lib/db')
    await ensureSchema()
    console.log('Database schema ensured.')
  }
}
