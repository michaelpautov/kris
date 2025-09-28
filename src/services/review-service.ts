import { PrismaClient, Review } from "@prisma/client";
import { prisma } from "../database/connection";
import {
  CreateReviewRequest,
  UpdateReviewRequest,
  ReviewSearchFilters,
  ReviewStatistics,
  PaginatedReviewResult,
  ReviewResult,
  PublicReview,
  AUTO_HIDE_FLAG_THRESHOLD,
} from "../types/review";
import {
  CreateReviewSchema,
  UpdateReviewSchema,
  ValidationError,
  BusinessRuleError,
} from "../utils/validation";

/**
 * Service for managing review operations including creation, updates, and moderation.
 *
 * Handles review lifecycle management, rating calculations, and review validation.
 * Integrates with Prisma for database operations and includes proper error handling.
 */
export class ReviewService {
  constructor(private prisma: PrismaClient = prisma) {}

  /**
   * Creates a new review with validation and duplicate checking
   *
   * @param request - Review creation data
   * @param reviewerId - ID of user creating the review
   * @returns Promise resolving to created review or error
   *
   * @example
   * ```typescript
   * const result = await reviewService.createReview({
   *   clientProfileId: clientId,
   *   rating: 5,
   *   reviewText: 'Great client!'
   * }, userId)
   * ```
   */
  async createReview(
    request: CreateReviewRequest,
    reviewerId: bigint,
  ): Promise<ReviewResult<Review>> {
    try {
      // Validate input data
      const validData = CreateReviewSchema.parse(request);

      // Check for existing review by same user
      const existingReview = await this.prisma.review.findFirst({
        where: {
          clientProfileId: validData.clientProfileId,
          reviewerId,
          status: { not: "DELETED" },
        },
      });

      if (existingReview) {
        return {
          success: false,
          error: new BusinessRuleError(
            "DUPLICATE_REVIEW",
            "You have already reviewed this client",
          ),
        };
      }

      // Create the review
      const review = await this.prisma.review.create({
        data: {
          clientProfileId: validData.clientProfileId,
          reviewerId,
          rating: validData.rating,
          reviewText: validData.reviewText,
          encounterDate: validData.encounterDate,
          locationCity: validData.locationCity,
          locationCountry: validData.locationCountry,
          tags: validData.tags || [],
          isAnonymous: validData.isAnonymous || false,
          verificationMethod: validData.verificationMethod,
          status: "ACTIVE",
        },
        include: {
          reviewer: {
            select: {
              id: true,
              telegramUsername: true,
              firstName: true,
              lastName: true,
              isVerified: true,
            },
          },
          clientProfile: {
            select: {
              id: true,
              phoneNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Update client statistics
      await this.updateClientStatistics(validData.clientProfileId);

      return { success: true, data: review };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error("Failed to create review"),
      };
    }
  }

  /**
   * Retrieves review by ID with related data
   *
   * @param id - Review ID
   * @returns Promise resolving to review or null
   */
  async findById(id: bigint): Promise<ReviewResult<Review | null>> {
    try {
      const review = await this.prisma.review.findUnique({
        where: { id },
        include: {
          reviewer: {
            select: {
              id: true,
              telegramUsername: true,
              firstName: true,
              lastName: true,
              isVerified: true,
            },
          },
          clientProfile: {
            select: {
              id: true,
              phoneNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return { success: true, data: review };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error("Failed to find review"),
      };
    }
  }

  /**
   * Updates review with authorization checking
   *
   * @param id - Review ID
   * @param request - Update data
   * @param updatedBy - ID of user making the update
   * @returns Promise resolving to updated review
   */
  async updateReview(
    id: bigint,
    request: UpdateReviewRequest,
    updatedBy: bigint,
  ): Promise<ReviewResult<Review>> {
    try {
      // Validate input data
      const validData = UpdateReviewSchema.parse(request);

      // Get review and check permissions
      const existingReview = await this.prisma.review.findUnique({
        where: { id },
      });

      if (!existingReview) {
        return {
          success: false,
          error: new Error("Review not found"),
        };
      }

      // Check authorization
      const canUpdate = await this.canUserModifyReview(
        updatedBy,
        existingReview,
      );
      if (!canUpdate) {
        return {
          success: false,
          error: new Error("Not authorized to update this review"),
        };
      }

      const updatedReview = await this.prisma.review.update({
        where: { id },
        data: {
          ...validData,
          updatedAt: new Date(),
        },
        include: {
          reviewer: {
            select: {
              id: true,
              telegramUsername: true,
              firstName: true,
              lastName: true,
              isVerified: true,
            },
          },
          clientProfile: {
            select: {
              id: true,
              phoneNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Update client stats if rating changed
      if (validData.rating !== undefined) {
        await this.updateClientStatistics(existingReview.clientProfileId);
      }

      return { success: true, data: updatedReview };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error("Failed to update review"),
      };
    }
  }

  /**
   * Flags review as inappropriate with auto-hiding logic
   *
   * @param id - Review ID
   * @param flaggedBy - ID of user flagging the review
   * @param reason - Optional reason for flagging
   * @returns Promise resolving to updated review
   */
  async flagReview(
    id: bigint,
    flaggedBy: bigint,
    reason?: string,
  ): Promise<ReviewResult<Review>> {
    try {
      const review = await this.prisma.review.update({
        where: { id },
        data: {
          flaggedCount: { increment: 1 },
          status: "FLAGGED",
          updatedAt: new Date(),
        },
      });

      // Log the flag action
      await this.prisma.adminAction.create({
        data: {
          adminId: flaggedBy,
          actionType: "REVIEW_MODERATE",
          targetType: "REVIEW",
          targetId: id,
          details: {
            action: "flag",
            reason: reason || "Inappropriate content",
            flagCount: review.flaggedCount + 1,
          },
        },
      });

      // Auto-hide if flagged too many times
      if (review.flaggedCount >= AUTO_HIDE_FLAG_THRESHOLD) {
        await this.prisma.review.update({
          where: { id },
          data: { status: "HIDDEN" },
        });
      }

      return { success: true, data: review };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error("Failed to flag review"),
      };
    }
  }

  /**
   * Searches reviews with filters and pagination
   *
   * @param filters - Search criteria
   * @param page - Page number (1-based)
   * @param pageSize - Number of results per page
   * @returns Promise resolving to paginated results
   */
  async searchReviews(
    filters: ReviewSearchFilters,
    page = 1,
    pageSize = 20,
  ): Promise<ReviewResult<PaginatedReviewResult>> {
    try {
      const where: any = {};

      // Apply filters
      if (filters.clientProfileId)
        where.clientProfileId = filters.clientProfileId;
      if (filters.reviewerId) where.reviewerId = filters.reviewerId;
      if (filters.rating) where.rating = filters.rating;
      if (filters.status) where.status = filters.status;
      if (filters.isVerified !== undefined)
        where.isVerified = filters.isVerified;

      if (filters.dateFrom || filters.dateTo) {
        where.encounterDate = {};
        if (filters.dateFrom) where.encounterDate.gte = filters.dateFrom;
        if (filters.dateTo) where.encounterDate.lte = filters.dateTo;
      }

      const offset = (page - 1) * pageSize;

      const [reviews, total] = await Promise.all([
        this.prisma.review.findMany({
          where,
          include: {
            reviewer: {
              select: {
                id: true,
                telegramUsername: true,
                firstName: true,
                lastName: true,
                isVerified: true,
              },
            },
            clientProfile: {
              select: {
                id: true,
                phoneNumber: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: pageSize,
          skip: offset,
        }),
        this.prisma.review.count({ where }),
      ]);

      const totalPages = Math.ceil(total / pageSize);

      return {
        success: true,
        data: {
          reviews,
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
          error instanceof Error
            ? error
            : new Error("Failed to search reviews"),
      };
    }
  }

  /**
   * Soft deletes review
   *
   * @param id - Review ID
   * @param deletedBy - ID of user performing deletion
   * @returns Promise resolving to success/error
   */
  async deleteReview(
    id: bigint,
    deletedBy: bigint,
  ): Promise<ReviewResult<void>> {
    try {
      const review = await this.prisma.review.findUnique({
        where: { id },
      });

      if (!review) {
        return {
          success: false,
          error: new Error("Review not found"),
        };
      }

      await this.prisma.review.update({
        where: { id },
        data: {
          status: "DELETED",
          updatedAt: new Date(),
        },
      });

      // Update client statistics
      await this.updateClientStatistics(review.clientProfileId);

      // Log deletion
      await this.prisma.adminAction.create({
        data: {
          adminId: deletedBy,
          actionType: "REVIEW_MODERATE",
          targetType: "REVIEW",
          targetId: id,
          details: {
            action: "delete",
          },
        },
      });

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error("Failed to delete review"),
      };
    }
  }

  /**
   * Gets comprehensive review statistics
   *
   * @returns Promise resolving to review statistics
   */
  async getStatistics(): Promise<ReviewResult<ReviewStatistics>> {
    try {
      const [total, ratingCounts, statusCounts, avgRating, verifiedCount] =
        await Promise.all([
          this.prisma.review.count(),
          this.prisma.review.groupBy({
            by: ["rating"],
            _count: true,
          }),
          this.prisma.review.groupBy({
            by: ["status"],
            _count: true,
          }),
          this.prisma.review.aggregate({
            _avg: { rating: true },
          }),
          this.prisma.review.count({
            where: { isVerified: true },
          }),
        ]);

      const byRating: Record<string, number> = {};
      ratingCounts.forEach((item) => {
        byRating[item.rating.toString()] = item._count;
      });

      const byStatus: Record<string, number> = {};
      statusCounts.forEach((item) => {
        byStatus[item.status] = item._count;
      });

      return {
        success: true,
        data: {
          total,
          byRating,
          byStatus,
          averageRating: avgRating._avg.rating || 0,
          verifiedReviews: verifiedCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error("Failed to get statistics"),
      };
    }
  }

  /**
   * Converts review to public-safe format
   *
   * @param review - Full review record
   * @returns Public review data without sensitive information
   */
  sanitizeReview(review: Review): PublicReview {
    return {
      id: review.id,
      rating: review.rating,
      reviewText: review.reviewText,
      encounterDate: review.encounterDate,
      locationCity: review.locationCity,
      locationCountry: review.locationCountry,
      tags: review.tags,
      isAnonymous: review.isAnonymous,
      isVerified: review.isVerified,
      helpfulVotes: review.helpfulVotes,
      createdAt: review.createdAt,
    };
  }

  /**
   * Updates client profile statistics based on reviews
   *
   * @param clientProfileId - Client profile ID
   * @private
   */
  private async updateClientStatistics(clientProfileId: bigint): Promise<void> {
    const stats = await this.prisma.review.aggregate({
      where: {
        clientProfileId,
        status: "ACTIVE",
      },
      _count: true,
      _avg: { rating: true },
    });

    await this.prisma.clientProfile.update({
      where: { id: clientProfileId },
      data: {
        totalReviews: stats._count,
        averageRating: stats._avg.rating || null,
      },
    });
  }

  /**
   * Checks if user can modify a review
   *
   * @param userId - User ID
   * @param review - Review to check
   * @private
   */
  private async canUserModifyReview(
    userId: bigint,
    review: Review,
  ): Promise<boolean> {
    // User can modify their own review
    if (review.reviewerId === userId) {
      return true;
    }

    // Check if user is admin/manager
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user ? ["ADMIN", "MANAGER"].includes(user.role) : false;
  }
}
