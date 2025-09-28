import { PrismaClient } from '@prisma/client'
import { prisma } from '../setup'

describe('Row Level Security Tests', () => {
  let adminUser: any
  let regularUser: any
  let verifiedUser: any

  beforeAll(async () => {
    // Create test users with different roles
    adminUser = await prisma.user.create({
      data: {
        telegramId: BigInt(111111111),
        telegramUsername: 'admin_test',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isVerified: true
      }
    })

    regularUser = await prisma.user.create({
      data: {
        telegramId: BigInt(222222222),
        telegramUsername: 'regular_test',
        firstName: 'Regular',
        lastName: 'User',
        role: 'REGULAR_USER',
        isVerified: false
      }
    })

    verifiedUser = await prisma.user.create({
      data: {
        telegramId: BigInt(333333333),
        telegramUsername: 'verified_test',
        firstName: 'Verified',
        lastName: 'User',
        role: 'VERIFIED_USER',
        isVerified: true
      }
    })
  })

  afterAll(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        telegramId: {
          in: [BigInt(111111111), BigInt(222222222), BigInt(333333333)]
        }
      }
    })
  })

  test('should verify RLS is enabled on sensitive tables', async () => {
    // Check if RLS is enabled on users table
    const rlsStatus = await prisma.$queryRaw`
      SELECT schemaname, tablename, rowsecurity
      FROM pg_tables
      WHERE tablename IN ('users', 'client_profiles', 'reviews', 'photos', 'admin_actions')
      AND schemaname = 'public'
    ` as any[]

    const tablesWithRLS = rlsStatus.filter(table => table.rowsecurity === true)
    expect(tablesWithRLS.length).toBeGreaterThan(0)
  })

  test('should verify auth functions exist', async () => {
    // Test auth.current_user_id() function exists
    const userIdFunction = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'auth' AND p.proname = 'current_user_id'
      ) as exists
    ` as any[]

    expect(userIdFunction[0].exists).toBe(true)

    // Test auth.is_admin() function exists
    const isAdminFunction = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'auth' AND p.proname = 'is_admin'
      ) as exists
    ` as any[]

    expect(isAdminFunction[0].exists).toBe(true)
  })

  test('should verify RLS policies exist', async () => {
    // Check if policies exist for users table
    const usersPolicies = await prisma.$queryRaw`
      SELECT policyname
      FROM pg_policies
      WHERE tablename = 'users' AND schemaname = 'public'
    ` as any[]

    expect(usersPolicies.length).toBeGreaterThan(0)

    const policyNames = usersPolicies.map(p => p.policyname)
    expect(policyNames).toContain('users_select_policy')
    expect(policyNames).toContain('users_update_policy')
  })

  test('should verify client_profiles policies exist', async () => {
    const clientProfilesPolicies = await prisma.$queryRaw`
      SELECT policyname
      FROM pg_policies
      WHERE tablename = 'client_profiles' AND schemaname = 'public'
    ` as any[]

    expect(clientProfilesPolicies.length).toBeGreaterThan(0)

    const policyNames = clientProfilesPolicies.map(p => p.policyname)
    expect(policyNames).toContain('client_profiles_select_policy')
    expect(policyNames).toContain('client_profiles_insert_policy')
  })

  test('should test auth helper functions with mock user context', async () => {
    // Test setting current user context
    await prisma.$executeRaw`SET app.current_user_id = ${adminUser.id.toString()}`

    // Test current_user_id function
    const currentUserId = await prisma.$queryRaw`SELECT auth.current_user_id() as user_id` as any[]
    expect(BigInt(currentUserId[0].user_id)).toBe(adminUser.id)

    // Test is_admin function for admin user
    const isAdminResult = await prisma.$queryRaw`SELECT auth.is_admin() as is_admin` as any[]
    expect(isAdminResult[0].is_admin).toBe(true)

    // Reset context
    await prisma.$executeRaw`RESET app.current_user_id`
  })

  test('should test auth functions with regular user context', async () => {
    // Set regular user context
    await prisma.$executeRaw`SET app.current_user_id = ${regularUser.id.toString()}`

    // Test is_admin function for regular user
    const isAdminResult = await prisma.$queryRaw`SELECT auth.is_admin() as is_admin` as any[]
    expect(isAdminResult[0].is_admin).toBe(false)

    // Test is_verified function for unverified user
    const isVerifiedResult = await prisma.$queryRaw`SELECT auth.is_verified() as is_verified` as any[]
    expect(isVerifiedResult[0].is_verified).toBe(false)

    // Reset context
    await prisma.$executeRaw`RESET app.current_user_id`
  })

  test('should verify RLS indexes exist for performance', async () => {
    // Check if RLS performance indexes exist
    const rlsIndexes = await prisma.$queryRaw`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename IN ('users', 'client_profiles', 'reviews', 'photos', 'admin_actions')
      AND indexname LIKE '%_rls'
    ` as any[]

    expect(rlsIndexes.length).toBeGreaterThan(0)

    const indexNames = rlsIndexes.map(idx => idx.indexname)
    expect(indexNames).toContain('idx_users_rls')
    expect(indexNames).toContain('idx_client_profiles_rls')
  })
})
