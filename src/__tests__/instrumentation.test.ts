describe('instrumentation register()', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('does not exit when ADMIN_SECRET is set', async () => {
    process.env.ADMIN_SECRET = 'test-secret'
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    const { register } = await import('@/instrumentation')
    await register()

    expect(mockExit).not.toHaveBeenCalled()
    mockExit.mockRestore()
  })

  it('exits with code 1 when ADMIN_SECRET is not set', async () => {
    delete process.env.ADMIN_SECRET
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    const mockError = jest.spyOn(console, 'error').mockImplementation(() => {})

    const { register } = await import('@/instrumentation')
    await register()

    expect(mockExit).toHaveBeenCalledWith(1)
    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining('ADMIN_SECRET')
    )
    mockExit.mockRestore()
    mockError.mockRestore()
  })

  it('exits with code 1 when ADMIN_SECRET is empty string', async () => {
    process.env.ADMIN_SECRET = ''
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    const mockError = jest.spyOn(console, 'error').mockImplementation(() => {})

    const { register } = await import('@/instrumentation')
    await register()

    expect(mockExit).toHaveBeenCalledWith(1)
    mockExit.mockRestore()
    mockError.mockRestore()
  })
})
