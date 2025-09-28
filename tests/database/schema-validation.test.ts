import { prisma } from "../setup";

describe("Schema Validation Tests", () => {
  test("should validate required environment variables", () => {
    const requiredVars = ["DATABASE_URL", "BOT_TOKEN", "JWT_SECRET"];

    requiredVars.forEach((varName) => {
      if (!process.env[varName]) {
        console.warn(`Warning: ${varName} not set in environment`);
      }
    });

    // At minimum, DATABASE_URL should be set for tests
    expect(process.env.DATABASE_URL).toBeDefined();
  });

  test("should have valid database URL format", () => {
    const dbUrl = process.env.DATABASE_URL;
    // For tests, we use SQLite
    expect(dbUrl).toMatch(/^file:/);
  });

  test("should connect with proper configuration", async () => {
    // Test that Prisma client can connect with current config
    await expect(prisma.$connect()).resolves.not.toThrow();

    // Test basic query execution for SQLite
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeDefined();
  });

  test("should support SQLite for testing", async () => {
    // Test SQLite version compatibility
    const result =
      (await prisma.$queryRaw`SELECT sqlite_version() as version`) as any[];
    const version = result[0].version;

    expect(version).toBeDefined();
    expect(typeof version).toBe("string");
    console.log("SQLite version:", version);
  });
});
