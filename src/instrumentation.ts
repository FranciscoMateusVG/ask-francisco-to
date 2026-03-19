export async function register() {
  if (!process.env.ADMIN_SECRET) {
    console.error('FATAL: ADMIN_SECRET environment variable is not set. Refusing to start.')
    process.exit(1)
  }
}
