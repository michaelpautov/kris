import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test' })

const prisma = new PrismaClient()

beforeAll(async () => {
  // Clean database before tests
  await cleanDatabase()
})

afterAll(async () => {
  // Clean database after tests
  await cleanDatabase()
  await prisma.$disconnect()
})

beforeEach(async () => {
  // Clean database before each test
  await cleanDatabase()
})

async function cleanDatabase() {
  // Delete all data in reverse dependency order
  await prisma.adminAction.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.rateLimit.deleteMany()
  await prisma.userSession.deleteMany()
  await prisma.aiAnalysis.deleteMany()
  await prisma.photo.deleteMany()
  await prisma.review.deleteMany()
  await prisma.clientProfile.deleteMany()
  await prisma.user.deleteMany()
  await prisma.botConfiguration.deleteMany()
}

export { prisma }
