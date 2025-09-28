import { PrismaClient } from "../../node_modules/.prisma/client-test";
import { prisma } from "../setup";

describe("User Management Tests", () => {
  const testUser = {
    telegramId: "user-mgmt-test-123",
    telegramUsername: "testuser",
    firstName: "Test",
    lastName: "User",
    phoneNumber: "+1234567890",
  };

  afterAll(async () => {
    // Clean up test data at the end - delete all test users created in this suite
    await prisma.user.deleteMany({
      where: {
        OR: [
          { telegramId: testUser.telegramId },
          { telegramId: "user-mgmt-admin-456" },
          { telegramId: { startsWith: "user-mgmt-role-" } },
        ],
      },
    });
  });

  test("should create user with user role by default", async () => {
    const uniqueTestUser = {
      ...testUser,
      telegramId: `${testUser.telegramId}-default`,
    };

    const user = await prisma.user.create({
      data: uniqueTestUser,
    });

    expect(user.role).toBe("user");
    expect(user.isVerified).toBe(false);
    expect(user.isActive).toBe(true);
    expect(user.telegramId).toBe(uniqueTestUser.telegramId);

    // Cleanup
    await prisma.user.deleteMany({ where: { id: user.id } });
  });

  test("should create user with admin role", async () => {
    const adminUser = await prisma.user.create({
      data: {
        ...testUser,
        telegramId: "user-mgmt-admin-456",
        role: "admin",
        isVerified: true,
      },
    });

    expect(adminUser.role).toBe("admin");
    expect(adminUser.isVerified).toBe(true);
  });

  test("should enforce unique telegramId constraint", async () => {
    const uniqueTestUser = {
      ...testUser,
      telegramId: `${testUser.telegramId}-unique`,
    };

    const user = await prisma.user.create({ data: uniqueTestUser });

    await expect(
      prisma.user.create({
        data: {
          ...uniqueTestUser,
          telegramUsername: "different_username",
        },
      }),
    ).rejects.toThrow();

    // Cleanup
    await prisma.user.deleteMany({ where: { id: user.id } });
  });

  test("should update user role", async () => {
    const uniqueTestUser = {
      ...testUser,
      telegramId: `${testUser.telegramId}-update-role`,
    };

    const user = await prisma.user.create({ data: uniqueTestUser });

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: "verified_user", isVerified: true },
    });

    expect(updatedUser.role).toBe("verified_user");
    expect(updatedUser.isVerified).toBe(true);

    // Cleanup
    await prisma.user.deleteMany({ where: { id: user.id } });
  });

  test("should update last activity timestamp", async () => {
    const uniqueTestUser = {
      ...testUser,
      telegramId: `${testUser.telegramId}-update-activity`,
    };

    const user = await prisma.user.create({ data: uniqueTestUser });
    const originalLastActivity = user.lastActivityAt;

    // Wait a moment to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Ensure user still exists before update
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!existingUser) {
      // If user was deleted, recreate it with the same ID
      await prisma.user.create({
        data: {
          ...uniqueTestUser,
          id: user.id,
        },
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastActivityAt: new Date() },
    });

    if (originalLastActivity && updatedUser.lastActivityAt) {
      expect(updatedUser.lastActivityAt.getTime()).toBeGreaterThan(
        originalLastActivity.getTime(),
      );
    } else {
      expect(updatedUser.lastActivityAt).toBeTruthy();
    }

    // Clean up this specific user
    await prisma.user.deleteMany({ where: { id: user.id } });
  });

  test("should handle user role enumeration", async () => {
    const roles = ["admin", "manager", "verified_user", "user"];

    for (const role of roles) {
      const user = await prisma.user.create({
        data: {
          ...testUser,
          telegramId: `user-mgmt-role-${roles.indexOf(role)}-${role}`,
          role: role,
        },
      });

      expect(user.role).toBe(role);

      // Clean up
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
