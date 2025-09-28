import { Notification, NotificationType } from '@prisma/client'

export { NotificationType }

export interface CreateNotificationRequest {
  userId: bigint
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
}

export interface NotificationFilters {
  userId?: bigint
  type?: NotificationType
  isRead?: boolean
  dateFrom?: Date
  dateTo?: Date
}

export interface NotificationStats {
  total: number
  unread: number
  byType: Record<string, number>
  recentCount: number
}

export type NotificationResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error }

export interface PublicNotification {
  id: bigint
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
  isRead: boolean
  createdAt: Date
}

// Notification templates for different types
export const NOTIFICATION_TEMPLATES = {
  SYSTEM: {
    title: 'System Notification',
    defaultMessage: 'System update or maintenance notification'
  },
  REVIEW_ALERT: {
    title: 'New Review Alert',
    defaultMessage: 'A new review has been posted for one of your clients'
  },
  SAFETY_WARNING: {
    title: 'Safety Warning',
    defaultMessage: 'Important safety information about a client'
  },
  VERIFICATION_REQUEST: {
    title: 'Verification Request',
    defaultMessage: 'Please verify your account information'
  },
  ADMIN_MESSAGE: {
    title: 'Admin Message',
    defaultMessage: 'Message from system administrator'
  }
} as const

export interface NotificationTemplate {
  title: string
  message: string
  data?: Record<string, any>
}

export interface BulkNotificationRequest {
  userIds: bigint[]
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
}
