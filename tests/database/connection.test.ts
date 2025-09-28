import { PrismaClient } from '@prisma/client'
import { prisma } from '../setup'

describe('Database Connection Tests', () => {
  test('should connect to database successfully', async () => {
    // Test basic database connection
    await expect(prisma.$connect()).resolves.not.toThrow()
  })

  test('should execute raw queries', async () => {
    // Test raw SQL execution
    const result = await prisma.$queryRaw`SELECT 1 as test`
    expect(result).toEqual([{ test: 1 }])
  })

  test('should handle database transactions', async () => {
    // Test transaction support
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT 1`
        return true
      })
    ).resolves.toBe(true)
  })

  test('should disconnect gracefully', async () => {
    // Test graceful disconnection
    const testPrisma = new PrismaClient()
    await testPrisma.$connect()
    await expect(testPrisma.$disconnect()).resolves.not.toThrow()
  })
})
