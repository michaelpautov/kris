import { RateLimit } from '@prisma/client'

export interface RateLimitRequest {
  userId?: bigint
  telegramId?: bigint
  actionType: string
  maxAttempts?: number
  windowMinutes?: number
}

export interface RateLimitConfig {
  maxAttempts: number
  windowMinutes: number
}

export interface RateLimitCheck {
  allowed: boolean
  remaining: number
  resetTime: Date
  totalAttempts: number
}

export type RateLimitResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error }

// Default rate limit configurations for different actions
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  'create_review': { maxAttempts: 5, windowMinutes: 60 },
  'upload_photo': { maxAttempts: 10, windowMinutes: 60 },
  'search_client': { maxAttempts: 50, windowMinutes: 60 },
  'create_client': { maxAttempts: 10, windowMinutes: 60 },
  'send_message': { maxAttempts: 100, windowMinutes: 60 },
  'api_request': { maxAttempts: 1000, windowMinutes: 60 },
  'login_attempt': { maxAttempts: 5, windowMinutes: 15 },
  'password_reset': { maxAttempts: 3, windowMinutes: 60 },
}

export interface RateLimitStats {
  totalChecks: number
  totalBlocked: number
  blockedPercentage: number
  topActions: Array<{
    actionType: string
    count: number
    blockedCount: number
  }>
  recentActivity: Array<{
    date: Date
    checks: number
    blocked: number
  }>
}
