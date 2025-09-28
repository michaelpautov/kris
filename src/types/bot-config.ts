import { BotConfiguration } from '@prisma/client'

export interface CreateConfigRequest {
  key: string
  value: any
  description?: string
  isSensitive?: boolean
  updatedBy?: bigint
}

export interface UpdateConfigRequest {
  value?: any
  description?: string
  isSensitive?: boolean
  updatedBy?: bigint
}

export interface ConfigFilters {
  isSensitive?: boolean
  keyPattern?: string
  updatedBy?: bigint
  dateFrom?: Date
  dateTo?: Date
}

export type ConfigResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error }

export interface PublicConfig {
  key: string
  value: any
  description?: string
  isSensitive: boolean
  updatedAt: Date
}

export interface ConfigStats {
  total: number
  sensitive: number
  recentUpdates: number
  lastUpdated?: Date
}

// Default configuration values for the bot
export const DEFAULT_CONFIGS = {
  'bot.welcome_message': {
    value: 'Welcome to ClientCheck! Use /help to get started.',
    description: 'Welcome message shown to new users',
    isSensitive: false
  },
  'bot.help_text': {
    value: 'Available commands:\n/search - Search for client\n/add - Add new client\n/review - Add review\n/profile - View your profile',
    description: 'Help text shown with /help command',
    isSensitive: false
  },
  'bot.max_search_results': {
    value: 10,
    description: 'Maximum number of search results to show',
    isSensitive: false
  },
  'bot.require_verification': {
    value: true,
    description: 'Whether to require phone verification for new users',
    isSensitive: false
  },
  'ai.safety_threshold': {
    value: 7.0,
    description: 'AI safety score threshold for flagging clients',
    isSensitive: false
  },
  'ai.confidence_threshold': {
    value: 0.8,
    description: 'Minimum confidence score for AI analysis',
    isSensitive: false
  },
  'storage.max_file_size': {
    value: 50 * 1024 * 1024, // 50MB
    description: 'Maximum file size for uploads in bytes',
    isSensitive: false
  },
  'storage.allowed_types': {
    value: ['image/jpeg', 'image/png', 'image/webp'],
    description: 'Allowed file types for uploads',
    isSensitive: false
  },
  'rate_limit.default_requests': {
    value: 100,
    description: 'Default rate limit requests per hour',
    isSensitive: false
  },
  'rate_limit.search_requests': {
    value: 50,
    description: 'Rate limit for search requests per hour',
    isSensitive: false
  },
  'moderation.auto_flag_threshold': {
    value: 5.0,
    description: 'Threshold for automatic content flagging',
    isSensitive: false
  },
  'moderation.require_admin_approval': {
    value: false,
    description: 'Whether new content requires admin approval',
    isSensitive: false
  },
  'telegram.webhook_url': {
    value: null,
    description: 'Telegram webhook URL for bot updates',
    isSensitive: true
  },
  'telegram.bot_token': {
    value: null,
    description: 'Telegram bot token',
    isSensitive: true
  },
  'gemini.api_key': {
    value: null,
    description: 'Google Gemini API key for AI analysis',
    isSensitive: true
  },
  'minio.endpoint': {
    value: 'localhost:9000',
    description: 'MinIO endpoint for file storage',
    isSensitive: false
  },
  'minio.access_key': {
    value: null,
    description: 'MinIO access key',
    isSensitive: true
  },
  'minio.secret_key': {
    value: null,
    description: 'MinIO secret key',
    isSensitive: true
  }
} as const

export type ConfigKey = keyof typeof DEFAULT_CONFIGS

export interface ConfigValidation {
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object'
  min?: number
  max?: number
  pattern?: RegExp
  allowedValues?: any[]
}

export const CONFIG_VALIDATIONS: Record<string, ConfigValidation> = {
  'bot.max_search_results': { type: 'number', min: 1, max: 100 },
  'bot.require_verification': { type: 'boolean' },
  'ai.safety_threshold': { type: 'number', min: 0, max: 10 },
  'ai.confidence_threshold': { type: 'number', min: 0, max: 1 },
  'storage.max_file_size': { type: 'number', min: 1024, max: 100 * 1024 * 1024 },
  'storage.allowed_types': { type: 'array' },
  'rate_limit.default_requests': { type: 'number', min: 1, max: 10000 },
  'rate_limit.search_requests': { type: 'number', min: 1, max: 1000 },
  'moderation.auto_flag_threshold': { type: 'number', min: 0, max: 10 },
  'moderation.require_admin_approval': { type: 'boolean' },
  'telegram.webhook_url': { type: 'string', pattern: /^https?:\/\/.+/ },
  'telegram.bot_token': { type: 'string', required: true },
  'gemini.api_key': { type: 'string', required: true },
  'minio.endpoint': { type: 'string', required: true },
  'minio.access_key': { type: 'string', required: true },
  'minio.secret_key': { type: 'string', required: true }
}
