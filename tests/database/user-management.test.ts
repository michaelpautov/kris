import { PrismaClient } from '@prisma/client'
import { prisma } from '../setup'

describe('User Management Tests', () => {
  const testUser = {
    telegramId: BigInt(123456789),
    telegramUsername: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    phoneNumber: '+1234567890',
  }

  afterEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { telegramId: testUser.telegramId }
    })
  })

  test('should create user with REGULAR_USER role by default', async () => {
    const user = await prisma.user.create({
      data: testUser
    })

    expect(user.role).toBe('REGULAR_USER')
    expect(user.isVerified).toBe(false)
    expect(user.isActive).toBe(true)
    expect(user.telegramId).toBe(testUser.telegramId)
  })

  test('should create user with ADMIN role', async () => {
    const adminUser = await prisma.user.create({
      data: {
        ...testUser,
        telegramId: BigInt(987654321),
        role: 'ADMIN',
        isVerified: true
      }
    })

    expect(adminUser.role).toBe('ADMIN')
    expect(adminUser.isVerified).toBe(true)
  })

  test('should enforce unique telegramId constraint', async () => {
    await prisma.user.create({ data: testUser })

    await expect(
      prisma.user.create({
        data: {
          ...testUser,
          telegramUsername: 'different_username'
        }
      })
    ).rejects.toThrow()
  })

  test('should update user role', async () => {
    const user = await prisma.user.create({ data: testUser })

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'VERIFIED_USER', isVerified: true }
    })

    expect(updatedUser.role).toBe('VERIFIED_USER')
    expect(updatedUser.isVerified).toBe(true)
  })

  test('should update last activity timestamp', async () => {
    const user = await prisma.user.create({ data: testUser })
    const originalLastActivity = user.lastActivityAt

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 100))

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastActivityAt: new Date() }
    })

    expect(updatedUser.lastActivityAt.getTime()).toBeGreaterThan(
      originalLastActivity.getTime()
    )
  })

  test('should handle user role enumeration', async () => {
    const roles = ['ADMIN', 'MANAGER', 'VERIFIED_USER', 'REGULAR_USER']

    for (const role of roles) {
      const user = await prisma.user.create({
        data: {
          ...testUser,
          telegramId: BigInt(testUser.telegramId + BigInt(roles.indexOf(role))),
          role: role as any
        }
      })

      expect(user.role).toBe(role)

      // Clean up
      await prisma.user.delete({ where: { id: user.id } })
    }
  })
})
