import { PrismaClient, BotConfiguration } from '@prisma/client'
import { prisma } from '../database/connection'
import {
  CreateConfigRequest,
  UpdateConfigRequest,
  ConfigFilters,
  ConfigResult,
  PublicConfig,
  ConfigStats,
  DEFAULT_CONFIGS,
  ConfigKey,
  CONFIG_VALIDATIONS,
  ConfigValidation
} from '../types/bot-config'
import { ValidationError } from '../utils/validation'

export class BotConfigService {
  private prisma: PrismaClient
  private configCache = new Map<string, any>()
  private cacheExpiry = new Map<string, number>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.prisma = prisma
  }

  /**
   * Get configuration value by key with caching
   */
  async getConfig<T = any>(key: string, useCache = true): Promise<ConfigResult<T | null>> {
    try {
      // Check cache first
      if (useCache && this.isValidCacheEntry(key)) {
        return { success: true, data: this.configCache.get(key) }
      }

      const config = await this.prisma.botConfiguration.findUnique({
        where: { key }
      })

      if (!config) {
        // Return default value if available
        const defaultConfig = DEFAULT_CONFIGS[key as ConfigKey]
        if (defaultConfig) {
          this.setCacheEntry(key, defaultConfig.value)
          return { success: true, data: defaultConfig.value }
        }
        return { success: true, data: null }
      }

      const value = JSON.parse(config.value)
      this.setCacheEntry(key, value)

      return { success: true, data: value }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get configuration')
      }
    }
  }

  /**
   * Set configuration value
   */
  async setConfig(request: CreateConfigRequest): Promise<ConfigResult<BotConfiguration>> {
    try {
      // Validate configuration
      const validation = this.validateConfig(request.key, request.value)
      if (!validation.valid) {
        return {
          success: false,
          error: new ValidationError('config', request.key, validation.error!)
        }
      }

      const config = await this.prisma.botConfiguration.upsert({
        where: { key: request.key },
        create: {
          key: request.key,
          value: JSON.stringify(request.value),
          description: request.description,
          isSensitive: request.isSensitive || false,
          updatedBy: request.updatedBy
        },
        update: {
          value: JSON.stringify(request.value),
          description: request.description,
          isSensitive: request.isSensitive,
          updatedBy: request.updatedBy,
          updatedAt: new Date()
        }
      })

      // Update cache
      this.setCacheEntry(request.key, request.value)

      return { success: true, data: config }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to set configuration')
      }
    }
  }

  /**
   * Update existing configuration
   */
  async updateConfig(
    key: string,
    request: UpdateConfigRequest
  ): Promise<ConfigResult<BotConfiguration>> {
    try {
      const existingConfig = await this.prisma.botConfiguration.findUnique({
        where: { key }
      })

      if (!existingConfig) {
        return {
          success: false,
          error: new Error(`Configuration '${key}' not found`)
        }
      }

      const updateData: any = { updatedAt: new Date() }

      if (request.value !== undefined) {
        // Validate new value
        const validation = this.validateConfig(key, request.value)
        if (!validation.valid) {
          return {
            success: false,
            error: new ValidationError('config', key, validation.error!)
          }
        }
        updateData.value = JSON.stringify(request.value)
      }

      if (request.description !== undefined) {
        updateData.description = request.description
      }

      if (request.isSensitive !== undefined) {
        updateData.isSensitive = request.isSensitive
      }

      if (request.updatedBy !== undefined) {
        updateData.updatedBy = request.updatedBy
      }

      const config = await this.prisma.botConfiguration.update({
        where: { key },
        data: updateData
      })

      // Update cache if value changed
      if (request.value !== undefined) {
        this.setCacheEntry(key, request.value)
      }

      return { success: true, data: config }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to update configuration')
      }
    }
  }

  /**
   * Delete configuration
   */
  async deleteConfig(key: string): Promise<ConfigResult<boolean>> {
    try {
      await this.prisma.botConfiguration.delete({
        where: { key }
      })

      // Remove from cache
      this.configCache.delete(key)
      this.cacheExpiry.delete(key)

      return { success: true, data: true }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to delete configuration')
      }
    }
  }

  /**
   * Get all configurations with filtering
   */
  async getAllConfigs(
    filters: ConfigFilters = {},
    includeSensitive = false
  ): Promise<ConfigResult<PublicConfig[]>> {
    try {
      const where: any = {}

      if (filters.isSensitive !== undefined) {
        where.isSensitive = filters.isSensitive
      } else if (!includeSensitive) {
        where.isSensitive = false
      }

      if (filters.keyPattern) {
        where.key = { contains: filters.keyPattern }
      }

      if (filters.updatedBy) {
        where.updatedBy = filters.updatedBy
      }

      if (filters.dateFrom || filters.dateTo) {
        where.updatedAt = {}
        if (filters.dateFrom) where.updatedAt.gte = filters.dateFrom
        if (filters.dateTo) where.updatedAt.lte = filters.dateTo
      }

      const configs = await this.prisma.botConfiguration.findMany({
        where,
        orderBy: { key: 'asc' }
      })

      const publicConfigs = configs.map(config => ({
        key: config.key,
        value: JSON.parse(config.value),
        description: config.description || undefined,
        isSensitive: config.isSensitive,
        updatedAt: config.updatedAt
      }))

      return { success: true, data: publicConfigs }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get configurations')
      }
    }
  }

  /**
   * Initialize default configurations
   */
  async initializeDefaults(updatedBy?: bigint): Promise<ConfigResult<number>> {
    try {
      let initialized = 0

      for (const [key, defaultConfig] of Object.entries(DEFAULT_CONFIGS)) {
        const existing = await this.prisma.botConfiguration.findUnique({
          where: { key }
        })

        if (!existing) {
          await this.prisma.botConfiguration.create({
            data: {
              key,
              value: JSON.stringify(defaultConfig.value),
              description: defaultConfig.description,
              isSensitive: defaultConfig.isSensitive,
              updatedBy
            }
          })
          initialized++
        }
      }

      return { success: true, data: initialized }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to initialize default configurations')
      }
    }
  }

  /**
   * Get configuration statistics
   */
  async getConfigStats(): Promise<ConfigResult<ConfigStats>> {
    try {
      const [total, sensitive, recentUpdates, lastUpdated] = await Promise.all([
        this.prisma.botConfiguration.count(),
        this.prisma.botConfiguration.count({ where: { isSensitive: true } }),
        this.prisma.botConfiguration.count({
          where: {
            updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        }),
        this.prisma.botConfiguration.findFirst({
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        })
      ])

      return {
        success: true,
        data: {
          total,
          sensitive,
          recentUpdates,
          lastUpdated: lastUpdated?.updatedAt
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get configuration statistics')
      }
    }
  }

  /**
   * Bulk update configurations
   */
  async bulkUpdate(
    configs: Array<{ key: string; value: any }>,
    updatedBy?: bigint
  ): Promise<ConfigResult<number>> {
    try {
      let updated = 0

      for (const config of configs) {
        const result = await this.setConfig({
          key: config.key,
          value: config.value,
          updatedBy
        })

        if (result.success) {
          updated++
        }
      }

      return { success: true, data: updated }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to bulk update configurations')
      }
    }
  }

  /**
   * Clear configuration cache
   */
  clearCache(key?: string): void {
    if (key) {
      this.configCache.delete(key)
      this.cacheExpiry.delete(key)
    } else {
      this.configCache.clear()
      this.cacheExpiry.clear()
    }
  }

  /**
   * Validate configuration value
   */
  private validateConfig(key: string, value: any): { valid: boolean; error?: string } {
    const validation = CONFIG_VALIDATIONS[key]

    if (!validation) {
      return { valid: true } // No validation rules defined
    }

    if (validation.required && (value === null || value === undefined)) {
      return { valid: false, error: 'Value is required' }
    }

    if (value !== null && value !== undefined) {
      if (validation.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value
        if (actualType !== validation.type) {
          return { valid: false, error: `Expected ${validation.type}, got ${actualType}` }
        }
      }

      if (validation.type === 'number') {
        if (validation.min !== undefined && value < validation.min) {
          return { valid: false, error: `Value must be at least ${validation.min}` }
        }
        if (validation.max !== undefined && value > validation.max) {
          return { valid: false, error: `Value must be at most ${validation.max}` }
        }
      }

      if (validation.type === 'string' && validation.pattern) {
        if (!validation.pattern.test(value)) {
          return { valid: false, error: 'Value does not match required pattern' }
        }
      }

      if (validation.allowedValues) {
        if (!validation.allowedValues.includes(value)) {
          return { valid: false, error: `Value must be one of: ${validation.allowedValues.join(', ')}` }
        }
      }
    }

    return { valid: true }
  }

  /**
   * Check if cache entry is valid
   */
  private isValidCacheEntry(key: string): boolean {
    const expiry = this.cacheExpiry.get(key)
    return expiry !== undefined && Date.now() < expiry && this.configCache.has(key)
  }

  /**
   * Set cache entry with expiry
   */
  private setCacheEntry(key: string, value: any): void {
    this.configCache.set(key, value)
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL)
  }

  /**
   * Get configuration with type safety for known keys
   */
  async getTypedConfig<T>(key: ConfigKey): Promise<ConfigResult<T>> {
    return this.getConfig<T>(key)
  }

  /**
   * Backup all configurations
   */
  async backupConfigs(): Promise<ConfigResult<Record<string, any>>> {
    try {
      const configs = await this.prisma.botConfiguration.findMany()

      const backup: Record<string, any> = {}
      configs.forEach(config => {
        backup[config.key] = {
          value: JSON.parse(config.value),
          description: config.description,
          isSensitive: config.isSensitive,
          updatedAt: config.updatedAt
        }
      })

      return { success: true, data: backup }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to backup configurations')
      }
    }
  }
}
