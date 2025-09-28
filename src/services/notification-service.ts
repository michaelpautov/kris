import { PrismaClient, Notification, NotificationType } from '@prisma/client'
import { prisma } from '../database/connection'
import {
  CreateNotificationRequest,
  NotificationFilters,
  NotificationStats,
  NotificationResult,
  PublicNotification,
  NotificationTemplate,
  BulkNotificationRequest,
  NOTIFICATION_TEMPLATES
} from '../types/notification'
import { ValidationError } from '../utils/validation'

export class NotificationService {
  private prisma: PrismaClient

  constructor() {
    this.prisma = prisma
  }

  /**
   * Create a new notification
   */
  async createNotification(request: CreateNotificationRequest): Promise<NotificationResult<Notification>> {
    try {
      // Validate request
      if (!request.title?.trim() || !request.message?.trim()) {
        return {
          success: false,
          error: new ValidationError('notification', 'content', 'Title and message are required')
        }
      }

      // Check if user exists
      const userExists = await this.prisma.user.findUnique({
        where: { id: request.userId },
        select: { id: true }
      })

      if (!userExists) {
        return {
          success: false,
          error: new ValidationError('userId', request.userId, 'User not found')
        }
      }

      const notification = await this.prisma.notification.create({
        data: {
          userId: request.userId,
          type: request.type,
          title: request.title.trim(),
          message: request.message.trim(),
          data: request.data ? JSON.stringify(request.data) : null
        }
      })

      return { success: true, data: notification }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to create notification')
      }
    }
  }

  /**
   * Create notification from template
   */
  async createFromTemplate(
    userId: bigint,
    type: NotificationType,
    templateData?: Record<string, any>
  ): Promise<NotificationResult<Notification>> {
    try {
      const template = NOTIFICATION_TEMPLATES[type]

      if (!template) {
        return {
          success: false,
          error: new ValidationError('type', type, 'Unknown notification type')
        }
      }

      return this.createNotification({
        userId,
        type,
        title: template.title,
        message: template.defaultMessage,
        data: templateData
      })

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to create notification from template')
      }
    }
  }

  /**
   * Get notifications for a user with filtering and pagination
   */
  async getNotifications(
    userId: bigint,
    filters: NotificationFilters = {},
    limit = 20,
    offset = 0
  ): Promise<NotificationResult<{ notifications: PublicNotification[], total: number }>> {
    try {
      const where: any = { userId }

      // Apply filters
      if (filters.type) where.type = filters.type
      if (filters.isRead !== undefined) where.isRead = filters.isRead

      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {}
        if (filters.dateFrom) where.createdAt.gte = filters.dateFrom
        if (filters.dateTo) where.createdAt.lte = filters.dateTo
      }

      const [notifications, total] = await Promise.all([
        this.prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        this.prisma.notification.count({ where })
      ])

      const publicNotifications = notifications.map(this.sanitizeNotification)

      return {
        success: true,
        data: { notifications: publicNotifications, total }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get notifications')
      }
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: bigint, userId: bigint): Promise<NotificationResult<Notification>> {
    try {
      const notification = await this.prisma.notification.findFirst({
        where: { id: notificationId, userId }
      })

      if (!notification) {
        return {
          success: false,
          error: new Error('Notification not found or access denied')
        }
      }

      const updatedNotification = await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })

      return { success: true, data: updatedNotification }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to mark notification as read')
      }
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: bigint): Promise<NotificationResult<number>> {
    try {
      const result = await this.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })

      return { success: true, data: result.count }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to mark all notifications as read')
      }
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: bigint, userId: bigint): Promise<NotificationResult<boolean>> {
    try {
      const notification = await this.prisma.notification.findFirst({
        where: { id: notificationId, userId }
      })

      if (!notification) {
        return {
          success: false,
          error: new Error('Notification not found or access denied')
        }
      }

      await this.prisma.notification.delete({
        where: { id: notificationId }
      })

      return { success: true, data: true }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to delete notification')
      }
    }
  }

  /**
   * Get notification statistics for a user
   */
  async getNotificationStats(userId: bigint): Promise<NotificationResult<NotificationStats>> {
    try {
      const [total, unread, typeStats, recentCount] = await Promise.all([
        this.prisma.notification.count({ where: { userId } }),
        this.prisma.notification.count({ where: { userId, isRead: false } }),
        this.prisma.notification.groupBy({
          by: ['type'],
          where: { userId },
          _count: { type: true }
        }),
        this.prisma.notification.count({
          where: {
            userId,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
          }
        })
      ])

      const byType: Record<string, number> = {}
      typeStats.forEach(stat => {
        byType[stat.type] = stat._count.type
      })

      return {
        success: true,
        data: {
          total,
          unread,
          byType,
          recentCount
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get notification statistics')
      }
    }
  }

  /**
   * Send bulk notifications to multiple users
   */
  async sendBulkNotifications(request: BulkNotificationRequest): Promise<NotificationResult<number>> {
    try {
      if (!request.userIds.length) {
        return {
          success: false,
          error: new ValidationError('userIds', 'empty', 'At least one user ID is required')
        }
      }

      if (request.userIds.length > 1000) {
        return {
          success: false,
          error: new ValidationError('userIds', 'too_many', 'Cannot send to more than 1000 users at once')
        }
      }

      // Validate users exist
      const existingUsers = await this.prisma.user.findMany({
        where: { id: { in: request.userIds } },
        select: { id: true }
      })

      const existingUserIds = existingUsers.map(u => u.id)
      const validUserIds = request.userIds.filter(id => existingUserIds.includes(id))

      if (validUserIds.length === 0) {
        return {
          success: false,
          error: new ValidationError('userIds', 'none_found', 'No valid users found')
        }
      }

      // Create notifications in batches for better performance
      const batchSize = 100
      let totalCreated = 0

      for (let i = 0; i < validUserIds.length; i += batchSize) {
        const batch = validUserIds.slice(i, i + batchSize)

        const notificationData = batch.map(userId => ({
          userId,
          type: request.type,
          title: request.title,
          message: request.message,
          data: request.data ? JSON.stringify(request.data) : null
        }))

        const result = await this.prisma.notification.createMany({
          data: notificationData
        })

        totalCreated += result.count
      }

      return { success: true, data: totalCreated }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to send bulk notifications')
      }
    }
  }

  /**
   * Clean up old notifications (older than specified days)
   */
  async cleanupOldNotifications(olderThanDays = 30): Promise<NotificationResult<number>> {
    try {
      const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000))

      const result = await this.prisma.notification.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
          isRead: true // Only delete read notifications
        }
      })

      return { success: true, data: result.count }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to cleanup old notifications')
      }
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: bigint): Promise<NotificationResult<number>> {
    try {
      const count = await this.prisma.notification.count({
        where: { userId, isRead: false }
      })

      return { success: true, data: count }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get unread count')
      }
    }
  }

  /**
   * Create custom notification with validation
   */
  async createCustomNotification(
    userId: bigint,
    template: NotificationTemplate
  ): Promise<NotificationResult<Notification>> {
    try {
      return this.createNotification({
        userId,
        type: 'ADMIN_MESSAGE', // Default type for custom notifications
        title: template.title,
        message: template.message,
        data: template.data
      })

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to create custom notification')
      }
    }
  }

  /**
   * Sanitize notification for public API
   */
  private sanitizeNotification(notification: Notification): PublicNotification {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data ? JSON.parse(notification.data) : undefined,
      isRead: notification.isRead,
      createdAt: notification.createdAt
    }
  }
}
