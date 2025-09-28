import { prisma } from "../setup";

describe("AI Analysis Tests (Simple)", () => {
  let testUserId: string;
  let testPhotoId: string;

  beforeEach(async () => {
    // Clean up first to ensure fresh state
    await prisma.aIAnalysis.deleteMany();
    await prisma.photo.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany({
      where: { telegramId: "ai-test-123456789" },
    });

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        telegramId: "ai-test-123456789",
        telegramUsername: "testuser",
        firstName: "Test",
        lastName: "User",
        role: "admin",
        isActive: true,
      },
    });
    testUserId = testUser.id;

    // Create test client
    const testClient = await prisma.client.create({
      data: {
        name: "Test Client",
        phone: "+1987654321",
        description: "Test client for AI analysis",
        status: "active",
      },
    });

    // Create test photo
    const testPhoto = await prisma.photo.create({
      data: {
        clientId: testClient.id,
        userId: testUserId,
        fileId: "test-file-123",
        fileName: "test.jpg",
        mimeType: "image/jpeg",
        fileSize: 1024000,
        status: "active",
      },
    });
    testPhotoId = testPhoto.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.photo.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();
  });

  test("should create AI analysis record", async () => {
    const analysis = await prisma.aIAnalysis.create({
      data: {
        type: "safety_assessment",
        targetType: "photo",
        targetId: testPhotoId,
        data: JSON.stringify({ safe: true, confidence: 0.95 }),
        confidence: 0.95,
        status: "completed",
      },
    });

    expect(analysis.type).toBe("safety_assessment");
    expect(analysis.targetType).toBe("photo");
    expect(analysis.status).toBe("completed");
    expect(analysis.confidence).toBe(0.95);
  });

  test("should find analysis by target", async () => {
    await prisma.aIAnalysis.create({
      data: {
        type: "face_detection",
        targetType: "photo",
        targetId: testPhotoId,
        data: JSON.stringify({ faces: 2 }),
        status: "completed",
      },
    });

    const analyses = await prisma.aIAnalysis.findMany({
      where: {
        targetType: "photo",
        targetId: testPhotoId,
      },
    });

    expect(analyses).toHaveLength(1);
    expect(analyses[0].type).toBe("face_detection");
  });

  test("should update analysis status", async () => {
    const analysis = await prisma.aIAnalysis.create({
      data: {
        type: "safety_assessment",
        targetType: "photo",
        targetId: testPhotoId,
        data: JSON.stringify({}),
        status: "pending",
      },
    });

    const updated = await prisma.aIAnalysis.update({
      where: { id: analysis.id },
      data: { status: "completed", confidence: 0.85 },
    });

    expect(updated.status).toBe("completed");
    expect(updated.confidence).toBe(0.85);
  });
});
