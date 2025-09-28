import { Review, ReviewStatus, VerificationMethod } from '@prisma/client'

export interface CreateReviewRequest {
  clientProfileId: bigint
  rating: number
  reviewText?: string
  encounterDate?: Date
  locationCity?: string
  locationCountry?: string
  tags?: string[]
  isAnonymous?: boolean
  verificationMethod?: VerificationMethod
}

export interface UpdateReviewRequest {
  rating?: number
  reviewText?: string
  encounterDate?: Date
  locationCity?: string
  locationCountry?: string
  tags?: string[]
  isAnonymous?: boolean
  verificationMethod?: VerificationMethod
  isVerified?: boolean
}

export interface ReviewSearchFilters {
  clientProfileId?: bigint
  reviewerId?: bigint
  rating?: number
  status?: ReviewStatus
  isVerified?: boolean
  dateFrom?: Date
  dateTo?: Date
}

export interface ReviewStatistics {
  total: number
  byRating: Record<string, number>
  byStatus: Record<string, number>
  averageRating: number
  verifiedReviews: number
}

export interface PaginatedReviewResult {
  reviews: Review[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type ReviewResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error }

export interface PublicReview {
  id: bigint
  rating: number
  reviewText?: string
  encounterDate?: Date
  locationCity?: string
  locationCountry?: string
  tags: string[]
  isAnonymous: boolean
  isVerified: boolean
  helpfulVotes: number
  createdAt: Date
}

// Constants
export const AUTO_HIDE_FLAG_THRESHOLD = 3
export const MAX_REVIEW_TEXT_LENGTH = 2000
export const MAX_LOCATION_LENGTH = 100
export const MAX_TAGS_COUNT = 10
