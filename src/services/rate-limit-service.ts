import { PrismaClient, RateLimit } from '@prisma/client'
import { prisma } from '../database/connection'
import {
  RateLimitRequest,
  RateLimitConfig,
  RateLimitCheck,
  RateLimitResult,
  RateLimitStats,
  DEFAULT_RATE_LIMITS
} from '../types/rate-limit'
import { ValidationError } from '../utils/validation'

export class RateLimitService {
  private prisma: PrismaClient

  constructor() {
    this.prisma = prisma
  }

  /**
   * Check if an action is allowed under rate limiting rules
   */
  async checkRateLimit(request: RateLimitRequest): Promise<RateLimitResult<RateLimitCheck>> {
    try {
      const config = this.getRateLimitConfig(request.actionType, request)
      const identifier = this.getIdentifier(request)

      if (!identifier) {
        return {
          success: false,
          error: new ValidationError('identifier', 'missing', 'Either userId or telegramId must be provided')
        }
      }

      const windowStart = new Date(Date.now() - (config.windowMinutes * 60 * 1000))

      // Get current rate limit record for this time window
      const existingLimit = await this.prisma.rateLimit.findFirst({
        where: {
          ...(request.userId ? { userId: request.userId } : { telegramId: request.telegramId }),
          actionType: request.actionType,
          windowStart: { gte: windowStart }
        },
        orderBy: { windowStart: 'desc' }
      })

      let currentCount = 0
      let rateLimitRecord: RateLimit

      if (existingLimit && existingLimit.windowStart >= windowStart) {
        // Update existing record
        currentCount = existingLimit.count + 1
        rateLimitRecord = await this.prisma.rateLimit.update({
          where: { id: existingLimit.id },
          data: {
            count: currentCount,
            expiresAt: new Date(Date.now() + (config.windowMinutes * 60 * 1000))
          }
        })
      } else {
        // Create new record
        currentCount = 1
        rateLimitRecord = await this.prisma.rateLimit.create({
          data: {
            userId: request.userId,
            telegramId: request.telegramId,
            actionType: request.actionType,
            count: currentCount,
            windowStart: new Date(),
            expiresAt: new Date(Date.now() + (config.windowMinutes * 60 * 1000))
          }
        })
      }

      const allowed = currentCount <= config.maxAttempts
      const remaining = Math.max(0, config.maxAttempts - currentCount)

      return {
        success: true,
        data: {
          allowed,
          remaining,
          resetTime: rateLimitRecord.expiresAt,
          totalAttempts: currentCount
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to check rate limit')
      }
    }
  }

  /**
   * Reset rate limit for a specific user and action
   */
  async resetRateLimit(
    identifier: { userId?: bigint; telegramId?: bigint },
    actionType: string
  ): Promise<RateLimitResult<boolean>> {
    try {
      if (!identifier.userId && !identifier.telegramId) {
        return {
          success: false,
          error: new ValidationError('identifier', 'missing', 'Either userId or telegramId must be provided')
        }
      }

      await this.prisma.rateLimit.deleteMany({
        where: {
          ...(identifier.userId ? { userId: identifier.userId } : { telegramId: identifier.telegramId }),
          actionType
        }
      })

      return { success: true, data: true }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to reset rate limit')
      }
    }
  }

  /**
   * Get rate limit status for a user and action
   */
  async getRateLimitStatus(
    identifier: { userId?: bigint; telegramId?: bigint },
    actionType: string
  ): Promise<RateLimitResult<RateLimitCheck | null>> {
    try {
      if (!identifier.userId && !identifier.telegramId) {
        return {
          success: false,
          error: new ValidationError('identifier', 'missing', 'Either userId or telegramId must be provided')
        }
      }

      const config = this.getRateLimitConfig(actionType)
      const windowStart = new Date(Date.now() - (config.windowMinutes * 60 * 1000))

      const existingLimit = await this.prisma.rateLimit.findFirst({
        where: {
          ...(identifier.userId ? { userId: identifier.userId } : { telegramId: identifier.telegramId }),
          actionType,
          windowStart: { gte: windowStart }
        },
        orderBy: { windowStart: 'desc' }
      })

      if (!existingLimit) {
        return {
          success: true,
          data: {
            allowed: true,
            remaining: config.maxAttempts,
            resetTime: new Date(Date.now() + (config.windowMinutes * 60 * 1000)),
            totalAttempts: 0
          }
        }
      }

      const allowed = existingLimit.count <= config.maxAttempts
      const remaining = Math.max(0, config.maxAttempts - existingLimit.count)

      return {
        success: true,
        data: {
          allowed,
          remaining,
          resetTime: existingLimit.expiresAt,
          totalAttempts: existingLimit.count
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get rate limit status')
      }
    }
  }

  /**
   * Clean up expired rate limit records
   */
  async cleanupExpiredLimits(): Promise<RateLimitResult<number>> {
    try {
      const result = await this.prisma.rateLimit.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      })

      return { success: true, data: result.count }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to cleanup expired limits')
      }
    }
  }

  /**
   * Get rate limiting statistics
   */
  async getStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<RateLimitResult<RateLimitStats>> {
    try {
      const dateFilter = {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate })
      }

      const [totalChecks, actionStats] = await Promise.all([
        this.prisma.rateLimit.count({
          where: dateFilter.gte || dateFilter.lte ? { windowStart: dateFilter } : undefined
        }),
        this.prisma.rateLimit.groupBy({
          by: ['actionType'],
          where: dateFilter.gte || dateFilter.lte ? { windowStart: dateFilter } : undefined,
          _count: { actionType: true },
          _sum: { count: true }
        })
      ])

      const config = DEFAULT_RATE_LIMITS
      const topActions = actionStats.map(stat => {
        const maxAllowed = config[stat.actionType]?.maxAttempts || 100
        const totalRequests = stat._sum.count || 0
        const blockedCount = Math.max(0, totalRequests - (stat._count.actionType * maxAllowed))

        return {
          actionType: stat.actionType,
          count: totalRequests,
          blockedCount
        }
      }).sort((a, b) => b.count - a.count)

      const totalBlocked = topActions.reduce((sum, action) => sum + action.blockedCount, 0)
      const totalRequests = topActions.reduce((sum, action) => sum + action.count, 0)

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000))
      const recentLimits = await this.prisma.rateLimit.findMany({
        where: { windowStart: { gte: sevenDaysAgo } },
        select: { windowStart: true, count: true, actionType: true }
      })

      const dailyStats = new Map<string, { checks: number; blocked: number }>()

      recentLimits.forEach(limit => {
        const date = new Date(limit.windowStart).toDateString()
        const maxAllowed = config[limit.actionType]?.maxAttempts || 100
        const blocked = Math.max(0, limit.count - maxAllowed)

        if (!dailyStats.has(date)) {
          dailyStats.set(date, { checks: 0, blocked: 0 })
        }

        const stats = dailyStats.get(date)!
        stats.checks += limit.count
        stats.blocked += blocked
      })

      const recentActivity = Array.from(dailyStats.entries()).map(([dateStr, stats]) => ({
        date: new Date(dateStr),
        checks: stats.checks,
        blocked: stats.blocked
      })).sort((a, b) => a.date.getTime() - b.date.getTime())

      return {
        success: true,
        data: {
          totalChecks,
          totalBlocked,
          blockedPercentage: totalRequests > 0 ? (totalBlocked / totalRequests) * 100 : 0,
          topActions: topActions.slice(0, 10),
          recentActivity
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get statistics')
      }
    }
  }

  /**
   * Get rate limit configuration for an action type
   */
  private getRateLimitConfig(
    actionType: string,
    request?: Partial<RateLimitRequest>
  ): RateLimitConfig {
    // Use custom limits if provided in request
    if (request?.maxAttempts && request?.windowMinutes) {
      return {
        maxAttempts: request.maxAttempts,
        windowMinutes: request.windowMinutes
      }
    }

    // Use predefined limits or default
    return DEFAULT_RATE_LIMITS[actionType] || { maxAttempts: 100, windowMinutes: 60 }
  }

  /**
   * Get identifier string for rate limiting
   */
  private getIdentifier(request: RateLimitRequest): string | null {
    if (request.userId) {
      return `user:${request.userId}`
    }
    if (request.telegramId) {
      return `telegram:${request.telegramId}`
    }
    return null
  }

  /**
   * Check multiple actions at once (for complex operations)
   */
  async checkMultipleActions(
    requests: RateLimitRequest[]
  ): Promise<RateLimitResult<RateLimitCheck[]>> {
    try {
      const results: RateLimitCheck[] = []

      for (const request of requests) {
        const result = await this.checkRateLimit(request)

        if (!result.success) {
          return {
            success: false,
            error: result.error
          }
        }

        results.push(result.data)

        // If any action is not allowed, fail early
        if (!result.data.allowed) {
          break
        }
      }

      return { success: true, data: results }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to check multiple actions')
      }
    }
  }
}
