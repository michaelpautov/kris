import { Photo, PhotoStatus, StorageType } from '@prisma/client'

export interface UploadPhotoRequest {
  file: Buffer
  originalFilename: string
  mimeType: string
  clientProfileId?: bigint
  isProfilePhoto?: boolean
}

export interface PhotoMetadata {
  width?: number
  height?: number
  fileSize: number
  mimeType: string
  thumbnailUrl?: string
}

export interface StorageStatistics {
  totalPhotos: number
  byStatus: Record<string, number>
  byStorageType: Record<string, number>
  totalStorageUsed: number
}

export type PhotoResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error }

export interface PublicPhoto {
  id: bigint
  originalFilename?: string
  mimeType?: string
  width?: number
  height?: number
  isProfilePhoto: boolean
  status: PhotoStatus
  createdAt: Date
}

// Constants
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
] as const

export const DEFAULT_PRESIGNED_URL_EXPIRY = 3600 // 1 hour
