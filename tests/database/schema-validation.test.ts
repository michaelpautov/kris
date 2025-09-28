import { prisma } from '../setup'

describe('Schema Validation Tests', () => {
  test('should validate required environment variables', () => {
    const requiredVars = [
      'DATABASE_URL',
      'BOT_TOKEN',
      'JWT_SECRET'
    ]

    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        console.warn(`Warning: ${varName} not set in environment`)
      }
    })

    // At minimum, DATABASE_URL should be set for tests
    expect(process.env.DATABASE_URL).toBeDefined()
  })

  test('should have valid database URL format', () => {
    const dbUrl = process.env.DATABASE_URL
    expect(dbUrl).toMatch(/^postgresql:\/\//)
  })

  test('should connect with proper configuration', async () => {
    // Test that Prisma client can connect with current config
    await expect(prisma.$connect()).resolves.not.toThrow()

    // Test basic query execution
    const result = await prisma.$queryRaw`SELECT current_database()`
    expect(result).toBeDefined()
  })

  test('should support required PostgreSQL version', async () => {
    // Test PostgreSQL version compatibility (13+)
    const result = await prisma.$queryRaw`SELECT version()` as any[]
    const version = result[0].version

    expect(version).toContain('PostgreSQL')
    // Extract version number and check it's 13+
    const versionMatch = version.match(/PostgreSQL (\d+)\./)
    if (versionMatch) {
      const majorVersion = parseInt(versionMatch[1])
      expect(majorVersion).toBeGreaterThanOrEqual(13)
    }
  })
})
