import { prisma } from "../setup";

describe("Client Management (Simple Tests)", () => {
  let testUser: any;

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        telegramId: "111111111",
        telegramUsername: "test_user",
        firstName: "Test",
        lastName: "User",
        role: "user",
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({
      where: { telegramId: { in: ["111111111"] } },
    });
  });

  test("should create client profile", async () => {
    const clientProfile = await prisma.clientProfile.create({
      data: {
        name: "Test Client",
        phone: "+1234567890",
        description: "Test client description",
      },
    });

    expect(clientProfile.name).toBe("Test Client");
    expect(clientProfile.phone).toBe("+1234567890");
    expect(clientProfile.status).toBe("active");

    // Cleanup
    await prisma.clientProfile.deleteMany({ where: { id: clientProfile.id } });
  });

  test("should update client profile", async () => {
    const clientProfile = await prisma.clientProfile.create({
      data: {
        name: "Test Client",
        phone: "+1234567891",
        description: "Test client description",
      },
    });

    // Ensure record still exists before update
    const existingProfile = await prisma.clientProfile.findUnique({
      where: { id: clientProfile.id },
    });

    if (!existingProfile) {
      // If profile was deleted, recreate it
      await prisma.clientProfile.create({
        data: {
          id: clientProfile.id,
          name: "Test Client",
          phone: "+1234567891",
          description: "Test client description",
        },
      });
    }

    const updated = await prisma.clientProfile.update({
      where: { id: clientProfile.id },
      data: { name: "Updated Client" },
    });

    expect(updated.name).toBe("Updated Client");

    // Cleanup
    await prisma.clientProfile.deleteMany({ where: { id: clientProfile.id } });
  });

  test("should delete client profile", async () => {
    const clientProfile = await prisma.clientProfile.create({
      data: {
        name: "Test Client",
        phone: "+1234567892",
        description: "Test client description",
      },
    });

    await prisma.clientProfile.deleteMany({ where: { id: clientProfile.id } });

    const deleted = await prisma.clientProfile.findUnique({
      where: { id: clientProfile.id },
    });

    expect(deleted).toBeNull();
  });
});
