import { prisma } from "../setup";

describe("Rate Limit Tests (Simple)", () => {
  let testUserId: string;

  beforeAll(async () => {
    // Ensure clean state first
    await prisma.rateLimit.deleteMany();
    await prisma.user.deleteMany({ where: { telegramId: "rate-test-123456" } });

    // Create test user once for all tests
    const testUser = await prisma.user.create({
      data: {
        telegramId: "rate-test-123456",
        telegramUsername: "ratetest",
        firstName: "Rate",
        lastName: "Test",
        role: "user",
        isActive: true,
      },
    });
    testUserId = testUser.id;
  });

  afterEach(async () => {
    // Only cleanup rate limits between tests, keep user
    await prisma.rateLimit.deleteMany();
  });

  afterAll(async () => {
    // Cleanup everything at the end
    await prisma.rateLimit.deleteMany();
    await prisma.user.deleteMany();
  });

  test("should create rate limit record", async () => {
    // Ensure user exists for this test
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        telegramId: "rate-test-123456",
        telegramUsername: "ratetest",
        firstName: "Rate",
        lastName: "Test",
        role: "user",
        isActive: true,
      },
    });

    const rateLimit = await prisma.rateLimit.create({
      data: {
        userId: testUserId,
        action: "test_action",
        attempts: 1,
        windowStart: new Date(),
      },
    });

    expect(rateLimit.userId).toBe(testUserId);
    expect(rateLimit.action).toBe("test_action");
    expect(rateLimit.attempts).toBe(1);
  });

  test("should increment attempts for existing action", async () => {
    // Ensure user exists for this test
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        telegramId: "rate-test-123456",
        telegramUsername: "ratetest",
        firstName: "Rate",
        lastName: "Test",
        role: "user",
        isActive: true,
      },
    });

    const windowStart = new Date();

    const rateLimit = await prisma.rateLimit.create({
      data: {
        userId: testUserId,
        action: "test_action",
        attempts: 1,
        windowStart,
      },
    });

    const updated = await prisma.rateLimit.update({
      where: { id: rateLimit.id },
      data: { attempts: { increment: 1 } },
    });

    expect(updated.attempts).toBe(2);
  });

  test("should find rate limits by user and action", async () => {
    // Ensure user exists for this test
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        telegramId: "rate-test-123456",
        telegramUsername: "ratetest",
        firstName: "Rate",
        lastName: "Test",
        role: "user",
        isActive: true,
      },
    });

    await prisma.rateLimit.create({
      data: {
        userId: testUserId,
        action: "test_action",
        attempts: 3,
        windowStart: new Date(),
      },
    });

    const rateLimits = await prisma.rateLimit.findMany({
      where: {
        userId: testUserId,
        action: "test_action",
      },
    });

    expect(rateLimits).toHaveLength(1);
    expect(rateLimits[0].attempts).toBe(3);
  });

  test("should clean up old rate limit records", async () => {
    // Ensure user exists for this test
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        telegramId: "rate-test-123456",
        telegramUsername: "ratetest",
        firstName: "Rate",
        lastName: "Test",
        role: "user",
        isActive: true,
      },
    });

    const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

    await prisma.rateLimit.create({
      data: {
        userId: testUserId,
        action: "old_action",
        attempts: 1,
        windowStart: oldDate,
      },
    });

    // Delete old records (older than 1 hour)
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.rateLimit.deleteMany({
      where: {
        windowStart: { lt: cutoff },
      },
    });

    const remaining = await prisma.rateLimit.findMany({
      where: { userId: testUserId },
    });

    expect(remaining).toHaveLength(0);
  });
});
