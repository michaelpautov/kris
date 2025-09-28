import { PrismaClient } from "../node_modules/.prisma/client-test";
import dotenv from "dotenv";

// Load test environment variables
dotenv.config({ path: ".env.test" });

const prisma = new PrismaClient();

// Removed global beforeAll cleanup to avoid test interference

afterAll(async () => {
  // Clean database after tests
  await cleanDatabase();
  await prisma.$disconnect();
});

// Removed beforeEach cleanup to avoid interfering with individual test data management

async function cleanDatabase() {
  // Delete all data in reverse dependency order (for SQLite test schema)
  try {
    await prisma.aIAnalysis.deleteMany();
    await prisma.adminAction.deleteMany();
    await prisma.userSession.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.rateLimit.deleteMany();
    await prisma.photo.deleteMany();
    await prisma.review.deleteMany();
    await prisma.clientProfile.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();
    await prisma.botConfig.deleteMany();
    await prisma.botConfiguration.deleteMany();
  } catch (error) {
    // Ignore cleanup errors during tests
    console.warn("Database cleanup error:", error);
  }
}

export { prisma };
