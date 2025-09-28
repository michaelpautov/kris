import { PrismaClient, ClientProfile } from "@prisma/client";
import { prisma } from "../database/connection";
import {
  CreateClientRequest,
  UpdateClientRequest,
  ClientSearchFilters,
  ClientStatistics,
  PaginatedClientResult,
  ClientResult,
  PublicClient,
} from "../types/client";
import {
  CreateClientSchema,
  UpdateClientSchema,
  ValidationError,
  BusinessRuleError,
  normalizePhoneNumber,
  isValidPhoneNumber,
} from "../utils/validation";

/**
 * Service for managing client operations including creation, updates, and queries.
 *
 * Handles client lifecycle management, phone number validation, and profile operations.
 * Integrates with Prisma for database operations and includes proper error handling.
 */
export class ClientService {
  constructor(private prisma: PrismaClient = prisma) {}

  /**
   * Creates a new client profile with validation and normalization
   *
   * @param request - Client creation data
   * @param createdBy - ID of user creating the client
   * @returns Promise resolving to created client or error
   *
   * @example
   * ```typescript
   * const result = await clientService.createClient({
   *   phoneNumber: '+1234567890',
   *   firstName: 'John',
   *   lastName: 'Doe'
   * }, userId)
   * ```
   */
  async createClient(
    request: CreateClientRequest,
    createdBy: bigint,
  ): Promise<ClientResult<ClientProfile>> {
    try {
      // Validate input data
      const validData = CreateClientSchema.parse(request);

      // Additional business validation
      if (!isValidPhoneNumber(validData.phoneNumber)) {
        return {
          success: false,
          error: new ValidationError("phoneNumber", validData.phoneNumber),
        };
      }

      const normalizedPhone = normalizePhoneNumber(validData.phoneNumber);

      // Check for existing client
      const existingClient = await this.findByPhone(normalizedPhone);
      if (existingClient.success && existingClient.data) {
        return {
          success: false,
          error: new BusinessRuleError(
            "DUPLICATE_PHONE_NUMBER",
            "Client with this phone number already exists",
          ),
        };
      }

      // Create client profile
      const client = await this.prisma.clientProfile.create({
        data: {
          phoneNumber: validData.phoneNumber,
          normalizedPhone,
          firstName: validData.firstName,
          lastName: validData.lastName,
          telegramUsername: validData.telegramUsername,
          telegramId: validData.telegramId,
          createdBy,
          status: "PENDING_VERIFICATION",
          riskLevel: "UNKNOWN",
          totalReviews: 0,
        },
        include: {
          creator: {
            select: {
              id: true,
              telegramUsername: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });

      return { success: true, data: client };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error("Unknown error creating client"),
      };
    }
  }

  /**
   * Retrieves client profile by ID with optional related data
   *
   * @param id - Client profile ID
   * @param includeRelations - Whether to include reviews and photos
   * @returns Promise resolving to client or null
   */
  async findById(
    id: bigint,
    includeRelations = false,
  ): Promise<ClientResult<ClientProfile | null>> {
    try {
      const client = await this.prisma.clientProfile.findUnique({
        where: { id },
        include: includeRelations
          ? {
              creator: {
                select: {
                  id: true,
                  telegramUsername: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                },
              },
              reviews: {
                where: { status: "ACTIVE" },
                orderBy: { createdAt: "desc" },
                take: 10,
                include: {
                  reviewer: {
                    select: {
                      telegramUsername: true,
                      firstName: true,
                      isVerified: true,
                    },
                  },
                },
              },
              photos: {
                where: { status: "APPROVED" },
                orderBy: { createdAt: "desc" },
              },
            }
          : undefined,
      });

      return { success: true, data: client };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error("Error finding client"),
      };
    }
  }

  /**
   * Finds client profile by phone number
   *
   * @param phoneNumber - Phone number to search for
   * @returns Promise resolving to client or null
   */
  async findByPhone(
    phoneNumber: string,
  ): Promise<ClientResult<ClientProfile | null>> {
    try {
      if (!isValidPhoneNumber(phoneNumber)) {
        return {
          success: false,
          error: new ValidationError("phoneNumber", phoneNumber),
        };
      }

      const normalizedPhone = normalizePhoneNumber(phoneNumber);

      const client = await this.prisma.clientProfile.findUnique({
        where: { normalizedPhone },
        include: {
          creator: {
            select: {
              id: true,
              telegramUsername: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          reviews: {
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });

      return { success: true, data: client };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error("Error finding client by phone"),
      };
    }
  }

  /**
   * Finds client profile by Telegram ID
   *
   * @param telegramId - Telegram ID to search for
   * @returns Promise resolving to client or null
   */
  async findByTelegramId(
    telegramId: bigint,
  ): Promise<ClientResult<ClientProfile | null>> {
    try {
      const client = await this.prisma.clientProfile.findFirst({
        where: { telegramId },
        include: {
          creator: {
            select: {
              id: true,
              telegramUsername: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });

      return { success: true, data: client };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error("Error finding client by Telegram ID"),
      };
    }
  }

  /**
   * Updates client profile with validation
   *
   * @param id - Client profile ID
   * @param request - Update data
   * @param updatedBy - ID of user making the update
   * @returns Promise resolving to updated client
   */
  async updateClient(
    id: bigint,
    request: UpdateClientRequest,
    updatedBy: bigint,
  ): Promise<ClientResult<ClientProfile>> {
    try {
      // Validate input data
      const validData = UpdateClientSchema.parse(request);

      const updateData: any = {
        ...validData,
        updatedAt: new Date(),
      };

      // Set verification timestamp when status changes to VERIFIED_SAFE
      if (validData.status === "VERIFIED_SAFE") {
        updateData.verifiedAt = new Date();
      }

      const client = await this.prisma.clientProfile.update({
        where: { id },
        data: updateData,
        include: {
          creator: {
            select: {
              id: true,
              telegramUsername: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });

      return { success: true, data: client };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error("Error updating client"),
      };
    }
  }

  /**
   * Searches client profiles with filters and pagination
   *
   * @param filters - Search criteria
   * @param page - Page number (1-based)
   * @param pageSize - Number of results per page
   * @returns Promise resolving to paginated results
   */
  async searchClients(
    filters: ClientSearchFilters,
    page = 1,
    pageSize = 20,
  ): Promise<ClientResult<PaginatedClientResult>> {
    try {
      const where: any = {};

      // Apply filters
      if (filters.status) where.status = filters.status;
      if (filters.riskLevel) where.riskLevel = filters.riskLevel;
      if (filters.createdBy) where.createdBy = filters.createdBy;
      if (filters.telegramId) where.telegramId = filters.telegramId;

      if (filters.phoneNumber) {
        const normalizedPhone = normalizePhoneNumber(filters.phoneNumber);
        where.normalizedPhone = { contains: normalizedPhone };
      }

      const offset = (page - 1) * pageSize;

      const [clients, total] = await Promise.all([
        this.prisma.clientProfile.findMany({
          where,
          include: {
            creator: {
              select: {
                id: true,
                telegramUsername: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: pageSize,
          skip: offset,
        }),
        this.prisma.clientProfile.count({ where }),
      ]);

      const totalPages = Math.ceil(total / pageSize);

      return {
        success: true,
        data: {
          clients,
          total,
          page,
          pageSize,
          totalPages,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error("Error searching clients"),
      };
    }
  }

  /**
   * Soft deletes client profile by updating status
   *
   * @param id - Client profile ID
   * @param deletedBy - ID of user performing deletion
   * @returns Promise resolving to success/error
   */
  async deleteClient(
    id: bigint,
    deletedBy: bigint,
  ): Promise<ClientResult<void>> {
    try {
      await this.prisma.clientProfile.update({
        where: { id },
        data: {
          status: "BLACKLISTED",
          updatedAt: new Date(),
        },
      });

      // Log the deletion
      await this.prisma.adminAction.create({
        data: {
          adminId: deletedBy,
          actionType: "CLIENT_STATUS_CHANGE",
          targetType: "CLIENT_PROFILE",
          targetId: id,
          details: {
            action: "soft_delete",
            newStatus: "BLACKLISTED",
            reason: "Profile deleted",
          },
        },
      });

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error("Error deleting client"),
      };
    }
  }

  /**
   * Retrieves comprehensive client statistics
   *
   * @returns Promise resolving to statistics
   */
  async getStatistics(): Promise<ClientResult<ClientStatistics>> {
    try {
      const [total, statusCounts, riskLevelCounts, recentCount] =
        await Promise.all([
          this.prisma.clientProfile.count(),
          this.prisma.clientProfile.groupBy({
            by: ["status"],
            _count: true,
          }),
          this.prisma.clientProfile.groupBy({
            by: ["riskLevel"],
            _count: true,
          }),
          this.prisma.clientProfile.count({
            where: {
              createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
              },
            },
          }),
        ]);

      const byStatus: Record<string, number> = {};
      statusCounts.forEach((item) => {
        byStatus[item.status] = item._count;
      });

      const byRiskLevel: Record<string, number> = {};
      riskLevelCounts.forEach((item) => {
        byRiskLevel[item.riskLevel] = item._count;
      });

      return {
        success: true,
        data: {
          total,
          byStatus,
          byRiskLevel,
          recentlyCreated: recentCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error("Error getting statistics"),
      };
    }
  }

  /**
   * Converts client profile to public-safe format
   *
   * @param client - Full client profile
   * @returns Public client data without sensitive information
   */
  sanitizeClient(client: ClientProfile): PublicClient {
    return {
      id: client.id,
      phoneNumber: client.phoneNumber,
      firstName: client.firstName,
      lastName: client.lastName,
      status: client.status,
      riskLevel: client.riskLevel,
      totalReviews: client.totalReviews,
      averageRating: client.averageRating,
      verifiedAt: client.verifiedAt,
      createdAt: client.createdAt,
    };
  }
}
