# Code Style Standards for Agent OS

> Version: 1.0  
> Last Updated: 2025-09-28  
> Project: ClientCheck

## 📋 Overview

This document defines code style standards for Agent OS projects to ensure consistent, maintainable, and readable code across all implementations.

## 🎯 Core Principles

1. **Simplicity Over Complexity** - Write simple, clear code that solves the problem
2. **Consistency** - Follow established patterns throughout the codebase
3. **Readability** - Code should tell a story that any developer can understand
4. **Maintainability** - Write code that's easy to modify and extend
5. **Performance** - Consider performance implications of code decisions

## 📁 File Structure & Naming

### Directory Structure
```
src/
├── services/           # Business logic services
├── controllers/        # API/Bot controllers
├── database/          # Database connection and utilities
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
├── middleware/        # Express/Bot middleware
└── constants/         # Application constants
```

### File Naming
- **Files**: Use kebab-case: `user-service.ts`, `client-controller.ts`
- **Classes**: Use PascalCase: `UserService`, `ClientController`
- **Functions**: Use camelCase: `getUserById`, `createClient`
- **Constants**: Use SCREAMING_SNAKE_CASE: `MAX_FILE_SIZE`, `DEFAULT_TIMEOUT`

## 🏗️ TypeScript Style Guide

### Interface & Type Definitions
```typescript
// ✅ Good - Clear, descriptive interfaces
interface CreateUserRequest {
  telegramId: bigint
  firstName: string
  lastName?: string
  role: UserRole
}

// ❌ Bad - Unclear, abbreviated names
interface CreateUsrReq {
  tgId: bigint
  fName: string
  lName?: string
  r: string
}
```

### Function Signatures
```typescript
// ✅ Good - Clear parameters and return types
async function getUserById(
  userId: bigint,
  includeProfile = false
): Promise<User | null> {
  // Implementation
}

// ❌ Bad - Unclear parameters
async function getUser(id: any, inc?: boolean): Promise<any> {
  // Implementation
}
```

### Error Handling
```typescript
// ✅ Good - Specific error types and messages
class ValidationError extends Error {
  constructor(field: string, value: any) {
    super(`Invalid ${field}: ${value}`)
    this.name = 'ValidationError'
  }
}

// Usage
if (!isValidPhoneNumber(phoneNumber)) {
  throw new ValidationError('phoneNumber', phoneNumber)
}

// ❌ Bad - Generic errors
throw new Error('Something went wrong')
```

## 🔧 Service Layer Patterns

### Service Class Structure
```typescript
// ✅ Good - Well-structured service class
export class UserService {
  private prisma: PrismaClient
  
  constructor(prismaClient: PrismaClient = prisma) {
    this.prisma = prismaClient
  }

  // Public methods
  async createUser(data: CreateUserData): Promise<User> {
    this.validateUserData(data)
    return this.prisma.user.create({ data })
  }

  // Private helper methods
  private validateUserData(data: CreateUserData): void {
    if (!data.telegramId) {
      throw new ValidationError('telegramId', data.telegramId)
    }
  }
}
```

### Method Organization
1. **Constructor** - First
2. **Public methods** - Main functionality
3. **Private methods** - Helpers and utilities
4. **Static methods** - Last

### Return Types
```typescript
// ✅ Good - Explicit return types
async function searchUsers(
  filters: UserFilters,
  pagination: PaginationOptions
): Promise<PaginatedResult<User>> {
  // Implementation
}

// ✅ Good - Use Result pattern for operations that can fail
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }

async function createUser(data: CreateUserData): Promise<Result<User>> {
  try {
    const user = await this.prisma.user.create({ data })
    return { success: true, data: user }
  } catch (error) {
    return { success: false, error }
  }
}
```

## 🗃️ Database Patterns

### Prisma Query Patterns
```typescript
// ✅ Good - Use include for related data
const user = await prisma.user.findUnique({
  where: { id },
  include: {
    profile: true,
    reviews: {
      where: { status: 'ACTIVE' },
      take: 5
    }
  }
})

// ✅ Good - Use select for specific fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    firstName: true,
    lastName: true,
    role: true
  }
})
```

### Transaction Patterns
```typescript
// ✅ Good - Use transactions for multi-table operations
async function createUserWithProfile(userData: CreateUserData): Promise<User> {
  return this.prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: userData })
    
    await tx.userProfile.create({
      data: {
        userId: user.id,
        // ... other profile data
      }
    })
    
    return user
  })
}
```

## 🧪 Testing Patterns

### Test Structure
```typescript
// ✅ Good - Clear test organization
describe('UserService', () => {
  let userService: UserService
  let testUser: User

  beforeAll(async () => {
    userService = new UserService()
  })

  beforeEach(async () => {
    testUser = await createTestUser()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('createUser', () => {
    test('should create user with valid data', async () => {
      const userData = createValidUserData()
      
      const result = await userService.createUser(userData)
      
      expect(result.success).toBe(true)
      expect(result.data.telegramId).toBe(userData.telegramId)
    })

    test('should reject invalid phone number', async () => {
      const userData = createUserDataWithInvalidPhone()
      
      const result = await userService.createUser(userData)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(ValidationError)
    })
  })
})
```

### Test Data Factories
```typescript
// ✅ Good - Use factory functions for test data
function createValidUserData(overrides: Partial<CreateUserData> = {}): CreateUserData {
  return {
    telegramId: BigInt(Date.now()),
    firstName: 'Test',
    lastName: 'User',
    role: 'REGULAR_USER',
    ...overrides
  }
}
```

## 📝 Documentation Standards

### Function Documentation
```typescript
/**
 * Creates a new user in the system
 * 
 * @param userData - User data to create
 * @returns Promise resolving to created user or error
 * @throws ValidationError when user data is invalid
 * @throws DatabaseError when user already exists
 * 
 * @example
 * ```typescript
 * const result = await userService.createUser({
 *   telegramId: BigInt(123456),
 *   firstName: 'John',
 *   role: 'VERIFIED_USER'
 * })
 * ```
 */
async function createUser(userData: CreateUserData): Promise<Result<User>> {
  // Implementation
}
```

### Class Documentation
```typescript
/**
 * Service for managing user operations including creation, updates, and queries.
 * 
 * Handles user lifecycle management, role assignments, and profile operations.
 * Integrates with Prisma for database operations and includes proper error handling.
 * 
 * @example
 * ```typescript
 * const userService = new UserService()
 * const user = await userService.createUser(userData)
 * ```
 */
export class UserService {
  // Implementation
}
```

## 🚫 Anti-Patterns to Avoid

### ❌ Large God Classes
```typescript
// ❌ Bad - Single class doing everything
class UserManager {
  createUser() { }
  updateUser() { }
  deleteUser() { }
  sendEmail() { }
  uploadPhoto() { }
  processPayment() { }
  generateReport() { }
}
```

### ❌ Magic Numbers and Strings
```typescript
// ❌ Bad
if (user.role === 'admin' && attempts < 5) {
  // ...
}

// ✅ Good
const MAX_LOGIN_ATTEMPTS = 5
const ADMIN_ROLE = 'admin'

if (user.role === ADMIN_ROLE && attempts < MAX_LOGIN_ATTEMPTS) {
  // ...
}
```

### ❌ Callback Hell
```typescript
// ❌ Bad
getUserById(id, (user) => {
  getProfile(user.id, (profile) => {
    getReviews(profile.id, (reviews) => {
      // nested callbacks
    })
  })
})

// ✅ Good
const user = await getUserById(id)
const profile = await getProfile(user.id)
const reviews = await getReviews(profile.id)
```

## 🔄 Code Review Checklist

- [ ] Code follows naming conventions
- [ ] Functions have single responsibility
- [ ] Error handling is comprehensive
- [ ] Tests cover main scenarios
- [ ] Documentation is clear and complete
- [ ] No magic numbers or strings
- [ ] TypeScript types are properly defined
- [ ] Database operations use transactions when needed
- [ ] Performance considerations addressed

## 🎯 Performance Guidelines

1. **Database Queries**
   - Use select for specific fields
   - Implement pagination for large datasets
   - Use indexes for frequent queries

2. **Memory Management**
   - Avoid memory leaks in long-running processes
   - Use streaming for large file operations
   - Clean up resources in finally blocks

3. **Async Operations**
   - Use Promise.all for parallel operations
   - Implement proper timeout handling
   - Use async/await over callbacks

This standard ensures consistent, maintainable code across all Agent OS projects.