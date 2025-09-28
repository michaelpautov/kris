# Best Practices for Agent OS Development

> Version: 1.0  
> Last Updated: 2025-09-28  
> Project: ClientCheck

## 🎯 Development Philosophy

### Core Values
1. **User First** - Every decision prioritizes user experience and safety
2. **Security by Design** - Security considerations in every architectural decision
3. **Simplicity** - Simple solutions that solve real problems
4. **Incremental Progress** - Build working software in small, testable increments
5. **Documentation** - Code and decisions are well-documented

### Technical Principles
1. **Test-Driven Development** - Write tests first, then implementation
2. **Single Responsibility** - Each function/class has one clear purpose
3. **Fail Fast** - Detect and report errors as early as possible
4. **Immutability** - Prefer immutable data structures when possible
5. **Explicit over Implicit** - Be explicit about intentions and dependencies

## 🏗️ Architecture Guidelines

### Service Layer Design
```typescript
// ✅ Good - Clear service boundaries
class UserService {
  // Only user-related operations
  async createUser(data: CreateUserData): Promise<User>
  async getUserById(id: bigint): Promise<User | null>
  async updateUser(id: bigint, data: UpdateUserData): Promise<User>
}

class AuthenticationService {
  // Only auth-related operations
  async authenticateUser(telegramId: bigint): Promise<AuthResult>
  async createSession(userId: bigint): Promise<Session>
  async validateSession(token: string): Promise<User | null>
}
```

### Dependency Injection
```typescript
// ✅ Good - Injectable dependencies
class UserService {
  constructor(
    private prisma: PrismaClient,
    private logger: Logger,
    private eventBus: EventBus
  ) {}
}

// ✅ Good - Factory pattern for complex dependencies
class ServiceFactory {
  static createUserService(): UserService {
    return new UserService(
      getPrismaClient(),
      getLogger(),
      getEventBus()
    )
  }
}
```

## 🔒 Security Best Practices

### Input Validation
```typescript
// ✅ Good - Validate all inputs
import { z } from 'zod'

const CreateUserSchema = z.object({
  telegramId: z.bigint().positive(),
  firstName: z.string().min(1).max(64),
  lastName: z.string().max(64).optional(),
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/).optional()
})

async function createUser(data: unknown): Promise<User> {
  const validData = CreateUserSchema.parse(data)
  // Safe to use validData
}
```

### Database Security
```typescript
// ✅ Good - Use parameterized queries (Prisma does this automatically)
const user = await prisma.user.findUnique({
  where: { telegramId: userTelegramId }
})

// ✅ Good - Implement Row Level Security
async function setUserContext(userId: bigint): Promise<void> {
  await prisma.$executeRaw`SET app.current_user_id = ${userId.toString()}`
}

// ✅ Good - Sanitize sensitive data
function sanitizeUser(user: User): PublicUser {
  return {
    id: user.id,
    firstName: user.firstName,
    role: user.role,
    // Exclude sensitive fields like phoneNumber
  }
}
```

### Authentication & Authorization
```typescript
// ✅ Good - Clear permission checking
class PermissionService {
  canUserAccessClient(user: User, clientId: bigint): boolean {
    if (user.role === 'ADMIN') return true
    if (user.role === 'MANAGER') return true
    if (user.role === 'VERIFIED_USER' && user.isVerified) return true
    return false
  }

  canUserModifyReview(user: User, review: Review): boolean {
    if (user.role === 'ADMIN') return true
    return review.reviewerId === user.id
  }
}
```

## 🧪 Testing Strategy

### Test Structure
```typescript
// ✅ Good - Comprehensive test coverage
describe('UserService', () => {
  // Test data setup
  beforeEach(async () => {
    await setupTestDatabase()
  })

  afterEach(async () => {
    await cleanupTestDatabase()
  })

  // Happy path tests
  describe('createUser - Happy Path', () => {
    test('should create user with valid data')
    test('should return created user with correct properties')
    test('should set default values for optional fields')
  })

  // Error path tests
  describe('createUser - Error Cases', () => {
    test('should reject invalid telegram ID')
    test('should reject duplicate telegram ID')
    test('should reject missing required fields')
  })

  // Edge cases
  describe('createUser - Edge Cases', () => {
    test('should handle very long names')
    test('should handle special characters in names')
    test('should handle concurrent creation attempts')
  })
})
```

### Integration Tests
```typescript
// ✅ Good - Test real database interactions
describe('User Integration Tests', () => {
  test('should create user and retrieve by ID', async () => {
    const userData = createTestUserData()
    
    const createdUser = await userService.createUser(userData)
    const retrievedUser = await userService.getUserById(createdUser.id)
    
    expect(retrievedUser).toEqual(createdUser)
  })

  test('should enforce database constraints', async () => {
    const userData = createTestUserData()
    
    await userService.createUser(userData)
    
    await expect(
      userService.createUser(userData) // Same telegram ID
    ).rejects.toThrow('User already exists')
  })
})
```

## 📊 Data Management

### Database Patterns
```typescript
// ✅ Good - Use transactions for related operations
async function createUserWithProfile(userData: CreateUserData): Promise<User> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: userData })
    
    await tx.userProfile.create({
      data: {
        userId: user.id,
        preferences: getDefaultPreferences(),
        settings: getDefaultSettings()
      }
    })
    
    return user
  })
}

// ✅ Good - Implement soft deletes
async function deleteUser(userId: bigint, deletedBy: bigint): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      deletedAt: new Date(),
      deletedBy
    }
  })
  
  // Log the action
  await auditService.logAction({
    userId: deletedBy,
    action: 'USER_DELETE',
    targetId: userId
  })
}
```

### Data Validation
```typescript
// ✅ Good - Business logic validation
class UserValidator {
  static validateCreateData(data: CreateUserData): ValidationResult {
    const errors: string[] = []
    
    if (!this.isValidTelegramId(data.telegramId)) {
      errors.push('Invalid Telegram ID format')
    }
    
    if (!this.isValidName(data.firstName)) {
      errors.push('First name must be 1-64 characters')
    }
    
    if (data.phoneNumber && !this.isValidPhoneNumber(data.phoneNumber)) {
      errors.push('Invalid phone number format')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
```

## 🚀 Performance Optimization

### Database Optimization
```typescript
// ✅ Good - Use select for specific fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    firstName: true,
    lastName: true,
    role: true
  },
  where: { isActive: true },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: offset
})

// ✅ Good - Use include strategically
const userWithReviews = await prisma.user.findUnique({
  where: { id },
  include: {
    reviews: {
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 5 // Limit included data
    }
  }
})
```

### Caching Strategy
```typescript
// ✅ Good - Cache frequently accessed data
class UserService {
  private cache = new Map<string, User>()
  
  async getUserById(id: bigint, useCache = true): Promise<User | null> {
    const cacheKey = `user:${id}`
    
    if (useCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }
    
    const user = await this.prisma.user.findUnique({ where: { id } })
    
    if (user && useCache) {
      this.cache.set(cacheKey, user)
      // Set expiration
      setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000)
    }
    
    return user
  }
}
```

## 🔍 Monitoring & Observability

### Logging
```typescript
// ✅ Good - Structured logging
class Logger {
  info(message: string, context: Record<string, any> = {}) {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }))
  }
  
  error(message: string, error: Error, context: Record<string, any> = {}) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString(),
      ...context
    }))
  }
}

// Usage
logger.info('User created successfully', {
  userId: user.id,
  telegramId: user.telegramId,
  role: user.role
})
```

### Error Tracking
```typescript
// ✅ Good - Comprehensive error handling
class UserService {
  async createUser(data: CreateUserData): Promise<Result<User>> {
    try {
      const validation = UserValidator.validateCreateData(data)
      if (!validation.isValid) {
        return {
          success: false,
          error: new ValidationError(validation.errors)
        }
      }
      
      const user = await this.prisma.user.create({ data })
      
      logger.info('User created successfully', {
        userId: user.id,
        telegramId: user.telegramId
      })
      
      return { success: true, data: user }
      
    } catch (error) {
      logger.error('Failed to create user', error, {
        telegramId: data.telegramId,
        operation: 'createUser'
      })
      
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error')
      }
    }
  }
}
```

## 🔄 Code Review Guidelines

### Review Checklist
- [ ] **Security**: Are inputs validated? Are permissions checked?
- [ ] **Performance**: Are database queries optimized? Is caching used appropriately?
- [ ] **Testing**: Are tests comprehensive? Do they cover edge cases?
- [ ] **Documentation**: Is the code self-documenting? Are complex parts explained?
- [ ] **Error Handling**: Are errors handled gracefully? Are they logged properly?
- [ ] **Style**: Does the code follow style guidelines? Is it consistent?

### Review Comments
```typescript
// ✅ Good review comment
// Consider adding input validation here. What happens if userId is negative?

// ✅ Good review comment  
// This query could be slow with large datasets. Consider adding pagination.

// ✅ Good review comment
// Missing error handling. What if the database is unavailable?
```

## 🚀 Deployment & Production

### Environment Configuration
```typescript
// ✅ Good - Environment-specific config
class Config {
  static get database() {
    return {
      url: process.env.DATABASE_URL!,
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
      timeout: parseInt(process.env.DB_TIMEOUT || '30000')
    }
  }
  
  static get security() {
    return {
      jwtSecret: process.env.JWT_SECRET!,
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400')
    }
  }
  
  static validate() {
    const required = ['DATABASE_URL', 'JWT_SECRET', 'BOT_TOKEN']
    const missing = required.filter(key => !process.env[key])
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }
  }
}
```

### Health Checks
```typescript
// ✅ Good - Comprehensive health checks
class HealthService {
  async checkHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMinIO(),
      this.checkExternalAPIs()
    ])
    
    return {
      status: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'unhealthy',
      checks: {
        database: checks[0].status === 'fulfilled',
        redis: checks[1].status === 'fulfilled',
        minio: checks[2].status === 'fulfilled',
        externalAPIs: checks[3].status === 'fulfilled'
      },
      timestamp: new Date().toISOString()
    }
  }
}
```

This comprehensive guide ensures high-quality, maintainable code across all Agent OS projects.