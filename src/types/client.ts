import { ClientProfile, ClientStatus, RiskLevel } from '@prisma/client'

export interface CreateClientRequest {
  phoneNumber: string
  firstName?: string
  lastName?: string
  telegramUsername?: string
  telegramId?: bigint
}

export interface UpdateClientRequest {
  firstName?: string
  lastName?: string
  telegramUsername?: string
  telegramId?: bigint
  profilePhotoUrl?: string
  status?: ClientStatus
  riskLevel?: RiskLevel
  aiSafetyScore?: number
}

export interface ClientSearchFilters {
  status?: ClientStatus
  riskLevel?: RiskLevel
  createdBy?: bigint
  phoneNumber?: string
  telegramId?: bigint
}

export interface ClientStatistics {
  total: number
  byStatus: Record<string, number>
  byRiskLevel: Record<string, number>
  recentlyCreated: number
}

export interface PaginatedClientResult {
  clients: ClientProfile[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type ClientResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error }

export interface PublicClient {
  id: bigint
  phoneNumber: string
  firstName?: string
  lastName?: string
  status: ClientStatus
  riskLevel: RiskLevel
  totalReviews: number
  averageRating?: number
  verifiedAt?: Date
  createdAt: Date
}
