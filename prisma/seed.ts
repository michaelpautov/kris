import { PrismaClient } from '@prisma/client'
import { hashSync } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { telegramId: BigInt('111111111') },
    update: {},
    create: {
      telegramId: BigInt('111111111'),
      telegramUsername: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      phoneNumber: '+1234567890',
      isActive: true,
    }
  })

  console.log('✅ Created admin user:', adminUser.telegramUsername)

  // Create manager user
  const managerUser = await prisma.user.upsert({
    where: { telegramId: BigInt('222222222') },
    update: {},
    create: {
      telegramId: BigInt('222222222'),
      telegramUsername: 'manager',
      firstName: 'Manager',
      lastName: 'User',
      role: 'MANAGER',
      phoneNumber: '+1234567891',
      isActive: true,
    }
  })

  console.log('✅ Created manager user:', managerUser.telegramUsername)

  // Create verified users
  const verifiedUsers = []
  for (let i = 1; i <= 5; i++) {
    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(`33333333${i}`) },
      update: {},
      create: {
        telegramId: BigInt(`33333333${i}`),
        telegramUsername: `verified_user_${i}`,
        firstName: `Verified`,
        lastName: `User ${i}`,
        role: 'VERIFIED_USER',
        phoneNumber: `+123456789${i}`,
        isActive: true,
      }
    })
    verifiedUsers.push(user)
  }

  console.log('✅ Created 5 verified users')

  // Create sample client profiles
  const sampleClients = [
    {
      phoneNumber: '+1987654321',
      normalizedPhone: '+1987654321',
      firstName: 'John',
      lastName: 'Doe',
      status: 'VERIFIED_SAFE' as const,
      riskLevel: 'LOW' as const,
      aiSafetyScore: 8.5,
      createdBy: verifiedUsers[0].id
    },
    {
      phoneNumber: '+1987654322',
      normalizedPhone: '+1987654322',
      firstName: 'Jane',
      lastName: 'Smith',
      status: 'PENDING_VERIFICATION' as const,
      riskLevel: 'UNKNOWN' as const,
      createdBy: verifiedUsers[1].id
    },
    {
      phoneNumber: '+1987654323',
      normalizedPhone: '+1987654323',
      firstName: 'Bob',
      lastName: 'Johnson',
      status: 'FLAGGED_CONCERNING' as const,
      riskLevel: 'HIGH' as const,
      aiSafetyScore: 3.2,
      createdBy: verifiedUsers[2].id
    },
    {
      phoneNumber: '+1987654324',
      normalizedPhone: '+1987654324',
      firstName: 'Alice',
      lastName: 'Brown',
      status: 'VERIFIED_SAFE' as const,
      riskLevel: 'LOW' as const,
      aiSafetyScore: 9.1,
      createdBy: verifiedUsers[3].id
    },
    {
      phoneNumber: '+1987654325',
      normalizedPhone: '+1987654325',
      firstName: 'Charlie',
      lastName: 'Wilson',
      status: 'UNDER_REVIEW' as const,
      riskLevel: 'MEDIUM' as const,
      aiSafetyScore: 6.7,
      createdBy: verifiedUsers[4].id
    }
  ]

  const createdClients = []
  for (const clientData of sampleClients) {
    const client = await prisma.clientProfile.create({
      data: clientData
    })
    createdClients.push(client)
  }

  console.log('✅ Created 5 sample client profiles')

  // Create sample reviews
  const sampleReviews = [
    {
      clientProfileId: createdClients[0].id,
      reviewerId: verifiedUsers[1].id,
      rating: 5,
      reviewText: 'Excellent client, very respectful and professional.',
      isVerified: true,
      verificationMethod: 'IN_PERSON_MEETING' as const,
      encounterDate: new Date('2024-01-15'),
      locationCity: 'New York',
      locationCountry: 'USA'
    },
    {
      clientProfileId: createdClients[0].id,
      reviewerId: verifiedUsers[2].id,
      rating: 4,
      reviewText: 'Good experience, would recommend.',
      isVerified: true,
      verificationMethod: 'PHONE_VERIFICATION' as const,
      encounterDate: new Date('2024-02-10'),
      locationCity: 'New York',
      locationCountry: 'USA'
    },
    {
      clientProfileId: createdClients[3].id,
      reviewerId: verifiedUsers[0].id,
      rating: 5,
      reviewText: 'Outstanding client, highly recommended.',
      isVerified: true,
      verificationMethod: 'IN_PERSON_MEETING' as const,
      encounterDate: new Date('2024-03-05'),
      locationCity: 'Los Angeles',
      locationCountry: 'USA'
    },
    {
      clientProfileId: createdClients[2].id,
      reviewerId: verifiedUsers[4].id,
      rating: 2,
      reviewText: 'Concerning behavior, be cautious.',
      isVerified: true,
      verificationMethod: 'VIDEO_CALL' as const,
      flaggedForReview: true,
      encounterDate: new Date('2024-02-20'),
      locationCity: 'Chicago',
      locationCountry: 'USA'
    }
  ]

  for (const reviewData of sampleReviews) {
    await prisma.review.create({
      data: reviewData
    })
  }

  console.log('✅ Created sample reviews')

  // Create sample AI analyses
  const sampleAnalyses = [
    {
      clientProfileId: createdClients[0].id,
      analysisType: 'SAFETY_ASSESSMENT' as const,
      confidenceScore: 0.95,
      resultData: JSON.stringify({
        overallScore: 8.5,
        riskFactors: [],
        recommendations: ['continue_monitoring'],
        confidence: 0.95
      }),
      modelVersion: 'safety-v1.0',
      processingTimeMs: 250
    },
    {
      clientProfileId: createdClients[2].id,
      analysisType: 'SAFETY_ASSESSMENT' as const,
      confidenceScore: 0.88,
      resultData: JSON.stringify({
        overallScore: 3.2,
        riskFactors: [
          { factor: 'aggressive_language', severity: 'high', description: 'Multiple reports of verbal aggression' },
          { factor: 'payment_disputes', severity: 'medium', description: 'History of payment issues' }
        ],
        recommendations: ['require_verification', 'monitor_closely'],
        confidence: 0.88
      }),
      modelVersion: 'safety-v1.0',
      processingTimeMs: 320
    },
    {
      clientProfileId: createdClients[3].id,
      analysisType: 'TEXT_SENTIMENT' as const,
      confidenceScore: 0.92,
      resultData: JSON.stringify({
        sentiment: 'positive',
        score: 0.85,
        confidence: 0.92,
        keywords: ['professional', 'respectful', 'courteous']
      }),
      modelVersion: 'sentiment-v1.0',
      processingTimeMs: 180
    }
  ]

  for (const analysisData of sampleAnalyses) {
    await prisma.aiAnalysis.create({
      data: analysisData
    })
  }

  console.log('✅ Created sample AI analyses')

  // Create sample photos
  const samplePhotos = [
    {
      clientProfileId: createdClients[0].id,
      uploaderId: verifiedUsers[0].id,
      fileId: 'photo_001',
      storageType: 'MINIO' as const,
      originalFilename: 'client_photo_1.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024000,
      width: 1920,
      height: 1080,
      isProfilePhoto: true,
      status: 'APPROVED' as const,
      aiAnalysisCompleted: true
    },
    {
      clientProfileId: createdClients[3].id,
      uploaderId: verifiedUsers[3].id,
      fileId: 'photo_002',
      storageType: 'MINIO' as const,
      originalFilename: 'client_photo_2.jpg',
      mimeType: 'image/jpeg',
      fileSize: 850000,
      width: 1600,
      height: 1200,
      isProfilePhoto: true,
      status: 'APPROVED' as const,
      aiAnalysisCompleted: true
    }
  ]

  for (const photoData of samplePhotos) {
    await prisma.photo.create({
      data: photoData
    })
  }

  console.log('✅ Created sample photos')

  // Create default bot configurations
  const defaultConfigs = [
    { key: 'bot.welcome_message', value: JSON.stringify('Welcome to ClientCheck! Use /help to get started.'), description: 'Welcome message for new users' },
    { key: 'bot.max_search_results', value: JSON.stringify(10), description: 'Maximum search results to display' },
    { key: 'ai.safety_threshold', value: JSON.stringify(7.0), description: 'AI safety score threshold for flagging' },
    { key: 'ai.confidence_threshold', value: JSON.stringify(0.8), description: 'Minimum AI confidence score' },
    { key: 'rate_limit.default_requests', value: JSON.stringify(100), description: 'Default rate limit per hour' },
    { key: 'moderation.auto_flag_threshold', value: JSON.stringify(5.0), description: 'Auto-flag threshold score' }
  ]

  for (const configData of defaultConfigs) {
    await prisma.botConfiguration.upsert({
      where: { key: configData.key },
      update: {},
      create: {
        key: configData.key,
        value: configData.value,
        description: configData.description,
        isSensitive: false
      }
    })
  }

  console.log('✅ Created default bot configurations')

  // Create sample notifications
  const sampleNotifications = [
    {
      userId: verifiedUsers[0].id,
      type: 'REVIEW_ALERT' as const,
      title: 'New Review Posted',
      message: 'A new review has been posted for one of your clients.',
      data: JSON.stringify({ clientId: createdClients[0].id, reviewId: 1 })
    },
    {
      userId: verifiedUsers[2].id,
      type: 'SAFETY_WARNING' as const,
      title: 'Safety Warning',
      message: 'A client has been flagged for concerning behavior.',
      data: JSON.stringify({ clientId: createdClients[2].id, riskLevel: 'HIGH' })
    },
    {
      userId: adminUser.id,
      type: 'SYSTEM' as const,
      title: 'System Maintenance',
      message: 'Scheduled maintenance completed successfully.',
      isRead: true
    }
  ]

  for (const notificationData of sampleNotifications) {
    await prisma.notification.create({
      data: notificationData
    })
  }

  console.log('✅ Created sample notifications')

  // Create sample admin actions
  const sampleAdminActions = [
    {
      adminId: adminUser.id,
      actionType: 'CLIENT_STATUS_CHANGE' as const,
      targetType: 'CLIENT_PROFILE' as const,
      targetId: createdClients[2].id,
      details: JSON.stringify({
        oldStatus: 'PENDING_VERIFICATION',
        newStatus: 'FLAGGED_CONCERNING',
        reason: 'Multiple negative reviews'
      })
    },
    {
      adminId: managerUser.id,
      actionType: 'REVIEW_MODERATE' as const,
      targetType: 'REVIEW' as const,
      targetId: BigInt('1'),
      details: JSON.stringify({
        action: 'verified',
        moderatorNotes: 'Review verified through additional checks'
      })
    }
  ]

  for (const actionData of sampleAdminActions) {
    await prisma.adminAction.create({
      data: actionData
    })
  }

  console.log('✅ Created sample admin actions')

  console.log('🎉 Database seeding completed successfully!')
  console.log('')
  console.log('Created:')
  console.log('- 1 Admin user')
  console.log('- 1 Manager user')
  console.log('- 5 Verified users')
  console.log('- 5 Client profiles')
  console.log('- 4 Reviews')
  console.log('- 3 AI analyses')
  console.log('- 2 Photos')
  console.log('- 6 Bot configurations')
  console.log('- 3 Notifications')
  console.log('- 2 Admin actions')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
