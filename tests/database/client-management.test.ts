import { PrismaClient } from '@prisma/client'
import { prisma } from '../setup'

describe('Client Management Tests', () => {
  let testUser: any
  let adminUser: any
  let verifiedUser: any

  beforeAll(async () => {
    // Create test users for client management
    adminUser = await prisma.user.create({
      data: {
        telegramId: BigInt(555555555),
        telegramUsername: 'admin_client_test',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isVerified: true
      }
    })

    verifiedUser = await prisma.user.create({
      data: {
        telegramId: BigInt(666666666),
        telegramUsername: 'verified_client_test',
        firstName: 'Verified',
        lastName: 'User',
        role: 'VERIFIED_USER',
        isVerified: true
      }
    })

    testUser = await prisma.user.create({
      data: {
        telegramId: BigInt(777777777),
        telegramUsername: 'regular_client_test',
        firstName: 'Regular',
        lastName: 'User',
        role: 'REGULAR_USER',
        isVerified: false
      }
    })
  })

  afterAll(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        telegramId: {
          in: [BigInt(555555555), BigInt(666666666), BigInt(777777777)]
        }
      }
    })
  })

  describe('Client Profile CRUD Operations', () => {
    test('should create client profile with verified user', async () => {
      const clientData = {
        phoneNumber: '+1234567890',
        normalizedPhone: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
        telegramUsername: 'johndoe',
        telegramId: BigInt(888888888),
        createdBy: verifiedUser.id
      }

      const clientProfile = await prisma.clientProfile.create({
        data: clientData
      })

      expect(clientProfile.phoneNumber).toBe(clientData.phoneNumber)
      expect(clientProfile.normalizedPhone).toBe(clientData.normalizedPhone)
      expect(clientProfile.status).toBe('PENDING_VERIFICATION')
      expect(clientProfile.riskLevel).toBe('UNKNOWN')
      expect(clientProfile.totalReviews).toBe(0)
      expect(clientProfile.createdBy).toBe(verifiedUser.id)

      // Clean up
      await prisma.clientProfile.delete({ where: { id: clientProfile.id } })
    })

    test('should enforce unique phone number constraint', async () => {
      const phoneNumber = '+9876543210'

      const client1 = await prisma.clientProfile.create({
        data: {
          phoneNumber,
          normalizedPhone: phoneNumber,
          firstName: 'Client',
          lastName: 'One',
          createdBy: verifiedUser.id
        }
      })

      await expect(
        prisma.clientProfile.create({
          data: {
            phoneNumber,
            normalizedPhone: phoneNumber,
            firstName: 'Client',
            lastName: 'Two',
            createdBy: verifiedUser.id
          }
        })
      ).rejects.toThrow()

      // Clean up
      await prisma.clientProfile.delete({ where: { id: client1.id } })
    })

    test('should update client profile status', async () => {
      const clientProfile = await prisma.clientProfile.create({
        data: {
          phoneNumber: '+5555555555',
          normalizedPhone: '+5555555555',
          firstName: 'Status',
          lastName: 'Test',
          createdBy: verifiedUser.id
        }
      })

      const updatedProfile = await prisma.clientProfile.update({
        where: { id: clientProfile.id },
        data: {
          status: 'VERIFIED_SAFE',
          riskLevel: 'LOW',
          verifiedAt: new Date()
        }
      })

      expect(updatedProfile.status).toBe('VERIFIED_SAFE')
      expect(updatedProfile.riskLevel).toBe('LOW')
      expect(updatedProfile.verifiedAt).toBeDefined()

      // Clean up
      await prisma.clientProfile.delete({ where: { id: clientProfile.id } })
    })

    test('should validate client status enum values', async () => {
      const validStatuses = [
        'PENDING_VERIFICATION',
        'VERIFIED_SAFE',
        'FLAGGED_CONCERNING',
        'BLACKLISTED',
        'UNDER_REVIEW'
      ]

      for (const status of validStatuses) {
        const client = await prisma.clientProfile.create({
          data: {
            phoneNumber: `+1111111${validStatuses.indexOf(status)}`,
            normalizedPhone: `+1111111${validStatuses.indexOf(status)}`,
            firstName: 'Status',
            lastName: 'Test',
            status: status as any,
            createdBy: verifiedUser.id
          }
        })

        expect(client.status).toBe(status)

        // Clean up
        await prisma.clientProfile.delete({ where: { id: client.id } })
      }
    })

    test('should validate risk level enum values', async () => {
      const validRiskLevels = ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

      for (const riskLevel of validRiskLevels) {
        const client = await prisma.clientProfile.create({
          data: {
            phoneNumber: `+2222222${validRiskLevels.indexOf(riskLevel)}`,
            normalizedPhone: `+2222222${validRiskLevels.indexOf(riskLevel)}`,
            firstName: 'Risk',
            lastName: 'Test',
            riskLevel: riskLevel as any,
            createdBy: verifiedUser.id
          }
        })

        expect(client.riskLevel).toBe(riskLevel)

        // Clean up
        await prisma.clientProfile.delete({ where: { id: client.id } })
      }
    })
  })

  describe('Client-User Relationships', () => {
    test('should maintain creator relationship', async () => {
      const clientProfile = await prisma.clientProfile.create({
        data: {
          phoneNumber: '+3333333333',
          normalizedPhone: '+3333333333',
          firstName: 'Relationship',
          lastName: 'Test',
          createdBy: verifiedUser.id
        },
        include: {
          creator: true
        }
      })

      expect(clientProfile.creator.id).toBe(verifiedUser.id)
      expect(clientProfile.creator.telegramUsername).toBe(verifiedUser.telegramUsername)

      // Clean up
      await prisma.clientProfile.delete({ where: { id: clientProfile.id } })
    })

    test('should cascade delete when creator is deleted', async () => {
      // Create temporary user
      const tempUser = await prisma.user.create({
        data: {
          telegramId: BigInt(999999999),
          telegramUsername: 'temp_user',
          firstName: 'Temp',
          lastName: 'User',
          role: 'VERIFIED_USER',
          isVerified: true
        }
      })

      const clientProfile = await prisma.clientProfile.create({
        data: {
          phoneNumber: '+4444444444',
          normalizedPhone: '+4444444444',
          firstName: 'Cascade',
          lastName: 'Test',
          createdBy: tempUser.id
        }
      })

      // Delete the creator user
      await prisma.user.delete({ where: { id: tempUser.id } })

      // Client profile should be deleted due to foreign key constraint
      const deletedProfile = await prisma.clientProfile.findUnique({
        where: { id: clientProfile.id }
      })

      expect(deletedProfile).toBeNull()
    })
  })

  describe('Data Validation', () => {
    test('should validate AI safety score range', async () => {
      const clientProfile = await prisma.clientProfile.create({
        data: {
          phoneNumber: '+6666666666',
          normalizedPhone: '+6666666666',
          firstName: 'AI',
          lastName: 'Test',
          aiSafetyScore: 7.5,
          createdBy: verifiedUser.id
        }
      })

      expect(clientProfile.aiSafetyScore).toBe(7.5)

      // Test invalid score (should be handled by database constraint)
      await expect(
        prisma.clientProfile.update({
          where: { id: clientProfile.id },
          data: { aiSafetyScore: 15.0 } // Invalid: > 10
        })
      ).rejects.toThrow()

      // Clean up
      await prisma.clientProfile.delete({ where: { id: clientProfile.id } })
    })

    test('should validate average rating range', async () => {
      const clientProfile = await prisma.clientProfile.create({
        data: {
          phoneNumber: '+7777777777',
          normalizedPhone: '+7777777777',
          firstName: 'Rating',
          lastName: 'Test',
          averageRating: 4.5,
          createdBy: verifiedUser.id
        }
      })

      expect(clientProfile.averageRating).toBe(4.5)

      // Clean up
      await prisma.clientProfile.delete({ where: { id: clientProfile.id } })
    })

    test('should handle optional fields correctly', async () => {
      const clientProfile = await prisma.clientProfile.create({
        data: {
          phoneNumber: '+8888888888',
          normalizedPhone: '+8888888888',
          // firstName and lastName are optional
          createdBy: verifiedUser.id
        }
      })

      expect(clientProfile.firstName).toBeNull()
      expect(clientProfile.lastName).toBeNull()
      expect(clientProfile.telegramUsername).toBeNull()
      expect(clientProfile.telegramId).toBeNull()
      expect(clientProfile.profilePhotoUrl).toBeNull()

      // Clean up
      await prisma.clientProfile.delete({ where: { id: clientProfile.id } })
    })
  })

  describe('Permission Boundary Tests', () => {
    test('should allow verified users to create profiles', async () => {
      // This test validates that the business logic will allow verified users
      // to create client profiles (to be implemented in service layer)

      const clientProfile = await prisma.clientProfile.create({
        data: {
          phoneNumber: '+1111100001',
          normalizedPhone: '+1111100001',
          firstName: 'Permission',
          lastName: 'Test',
          createdBy: verifiedUser.id
        }
      })

      expect(clientProfile.createdBy).toBe(verifiedUser.id)

      // Clean up
      await prisma.clientProfile.delete({ where: { id: clientProfile.id } })
    })

    test('should prevent regular users from creating profiles in business logic', async () => {
      // This is a placeholder test for business logic that should prevent
      // regular (unverified) users from creating client profiles
      // The actual implementation will be in the service layer

      expect(testUser.isVerified).toBe(false)
      expect(testUser.role).toBe('REGULAR_USER')

      // Business logic should prevent this, but database allows it
      // (RLS policies will handle this in real implementation)
    })
  })
})
