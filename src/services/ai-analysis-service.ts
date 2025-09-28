import { PrismaClient, AiAnalysis, AnalysisType, Prisma } from "@prisma/client";
import { prisma } from "../database/connection";
import {
  CreateAnalysisRequest,
  AnalysisFilters,
  AnalysisStatistics,
  AnalysisResult,
  PublicAnalysis,
  FaceDetectionResult,
  SafetyAssessmentResult,
  TextSentimentResult,
  MIN_CONFIDENCE_SCORE,
  MAX_CONFIDENCE_SCORE,
} from "../types/ai-analysis";
import {
  CreateAnalysisSchema,
  ValidationError,
  isValidConfidenceScore,
} from "../utils/validation";

/**
 * Service for managing AI analysis operations including creation, storage, and retrieval.
 *
 * Handles AI analysis lifecycle management, result storage, and confidence scoring.
 * Integrates with various AI models and provides standardized result formats.
 */
export class AiAnalysisService {
  constructor(private prisma: PrismaClient = prisma) {}

  /**
   * Creates a new AI analysis record with validation
   *
   * @param request - Analysis creation data
   * @returns Promise resolving to created analysis or error
   *
   * @example
   * ```typescript
   * const result = await aiService.createAnalysis({
   *   clientProfileId: clientId,
   *   analysisType: 'SAFETY_ASSESSMENT',
   *   resultData: { overallScore: 8.5, riskFactors: [] },
   *   confidenceScore: 0.95
   * })
   * ```
   */
  async createAnalysis(
    request: CreateAnalysisRequest,
  ): Promise<AnalysisResult<AiAnalysis>> {
    try {
      // Validate input data
      const validData = CreateAnalysisSchema.parse(request);

      // Additional business validation
      if (
        validData.confidenceScore !== undefined &&
        !isValidConfidenceScore(validData.confidenceScore)
      ) {
        return {
          success: false,
          error: new ValidationError(
            "confidenceScore",
            validData.confidenceScore,
          ),
        };
      }

      // Ensure at least one target is specified
      if (!validData.clientProfileId && !validData.photoId) {
        return {
          success: false,
          error: new ValidationError(
            "target",
            "Either clientProfileId or photoId must be specified",
          ),
        };
      }

      // Validate result data structure based on analysis type
      const validationResult = this.validateResultData(
        validData.analysisType,
        validData.resultData,
      );
      if (!validationResult.isValid) {
        return {
          success: false,
          error: new ValidationError("resultData", validationResult.error),
        };
      }

      const analysis = await this.prisma.aiAnalysis.create({
        data: {
          clientProfileId: validData.clientProfileId,
          photoId: validData.photoId,
          analysisType: validData.analysisType,
          confidenceScore: validData.confidenceScore,
          resultData: validData.resultData,
          modelVersion: validData.modelVersion,
          processingTimeMs: validData.processingTimeMs,
        },
        include: {
          clientProfile: validData.clientProfileId
            ? {
                select: {
                  id: true,
                  phoneNumber: true,
                  firstName: true,
                  lastName: true,
                },
              }
            : undefined,
          photo: validData.photoId
            ? {
                select: {
                  id: true,
                  originalFilename: true,
                  mimeType: true,
                },
              }
            : undefined,
        },
      });

      // Update client profile AI score if this is a safety assessment
      if (
        validData.analysisType === "SAFETY_ASSESSMENT" &&
        validData.clientProfileId
      ) {
        await this.updateClientAiScore(validData.clientProfileId);
      }

      return { success: true, data: analysis };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error("Failed to create analysis"),
      };
    }
  }

  /**
   * Retrieves analysis by ID
   *
   * @param id - Analysis ID
   * @returns Promise resolving to analysis or null
   */
  async findById(id: bigint): Promise<AnalysisResult<AiAnalysis | null>> {
    try {
      const analysis = await this.prisma.aiAnalysis.findUnique({
        where: { id },
        include: {
          clientProfile: {
            select: {
              id: true,
              phoneNumber: true,
              firstName: true,
              lastName: true,
            },
          },
          photo: {
            select: {
              id: true,
              originalFilename: true,
              mimeType: true,
            },
          },
        },
      });

      return { success: true, data: analysis };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error("Failed to find analysis"),
      };
    }
  }

  /**
   * Searches analyses with filters
   *
   * @param filters - Search criteria
   * @param limit - Maximum number of results
   * @param offset - Number of results to skip
   * @returns Promise resolving to filtered analyses
   */
  async searchAnalyses(
    filters: AnalysisFilters,
    limit = 20,
    offset = 0,
  ): Promise<AnalysisResult<{ analyses: AiAnalysis[]; total: number }>> {
    try {
      const where: any = {};

      // Apply filters
      if (filters.clientProfileId)
        where.clientProfileId = filters.clientProfileId;
      if (filters.photoId) where.photoId = filters.photoId;
      if (filters.analysisType) where.analysisType = filters.analysisType;

      if (
        filters.minConfidence !== undefined ||
        filters.maxConfidence !== undefined
      ) {
        where.confidenceScore = {};
        if (filters.minConfidence !== undefined)
          where.confidenceScore.gte = filters.minConfidence;
        if (filters.maxConfidence !== undefined)
          where.confidenceScore.lte = filters.maxConfidence;
      }

      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
        if (filters.dateTo) where.createdAt.lte = filters.dateTo;
      }

      const [analyses, total] = await Promise.all([
        this.prisma.aiAnalysis.findMany({
          where,
          include: {
            clientProfile: {
              select: {
                id: true,
                phoneNumber: true,
                firstName: true,
                lastName: true,
              },
            },
            photo: {
              select: {
                id: true,
                originalFilename: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        this.prisma.aiAnalysis.count({ where }),
      ]);

      return { success: true, data: { analyses, total } };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error("Failed to search analyses"),
      };
    }
  }

  /**
   * Gets comprehensive analysis statistics
   *
   * @returns Promise resolving to analysis statistics
   */
  async getStatistics(): Promise<AnalysisResult<AnalysisStatistics>> {
    try {
      const [total, typeCounts, avgConfidence, avgProcessingTime, recentCount] =
        await Promise.all([
          this.prisma.aiAnalysis.count(),
          this.prisma.aiAnalysis.groupBy({
            by: ["analysisType"],
            _count: true,
          }),
          this.prisma.aiAnalysis.aggregate({
            _avg: { confidenceScore: true },
          }),
          this.prisma.aiAnalysis.aggregate({
            _avg: { processingTimeMs: true },
          }),
          this.prisma.aiAnalysis.count({
            where: {
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
            },
          }),
        ]);

      const byType: Record<string, number> = {};
      typeCounts.forEach((item) => {
        byType[item.analysisType] = item._count;
      });

      return {
        success: true,
        data: {
          total,
          byType,
          averageConfidence: Number(avgConfidence._avg.confidenceScore) || 0,
          averageProcessingTime: avgProcessingTime._avg.processingTimeMs || 0,
          recentAnalyses: recentCount,
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
   * Gets latest safety assessment for client
   *
   * @param clientProfileId - Client profile ID
   * @returns Promise resolving to latest safety assessment
   */
  async getLatestSafetyAssessment(
    clientProfileId: bigint,
  ): Promise<AnalysisResult<AiAnalysis | null>> {
    try {
      const assessment = await this.prisma.aiAnalysis.findFirst({
        where: {
          clientProfileId,
          analysisType: "SAFETY_ASSESSMENT",
        },
        orderBy: { createdAt: "desc" },
      });

      return { success: true, data: assessment };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error("Failed to get safety assessment"),
      };
    }
  }

  /**
   * Converts analysis to public-safe format
   *
   * @param analysis - Full analysis record
   * @returns Public analysis data without sensitive information
   */
  sanitizeAnalysis(analysis: AiAnalysis): PublicAnalysis {
    return {
      id: analysis.id,
      analysisType: analysis.analysisType,
      confidenceScore: analysis.confidenceScore
        ? Number(analysis.confidenceScore)
        : undefined,
      createdAt: analysis.createdAt,
      summary: this.generateSummary(analysis),
    };
  }

  /**
   * Validates result data structure based on analysis type
   *
   * @param analysisType - Type of analysis
   * @param resultData - Result data to validate
   * @private
   */
  private validateResultData(
    analysisType: AnalysisType,
    resultData: any,
  ): { isValid: boolean; error?: string } {
    switch (analysisType) {
      case "FACE_DETECTION":
        return this.validateFaceDetectionResult(resultData);
      case "SAFETY_ASSESSMENT":
        return this.validateSafetyAssessmentResult(resultData);
      case "TEXT_SENTIMENT":
        return this.validateTextSentimentResult(resultData);
      default:
        return { isValid: true }; // Allow other types for now
    }
  }

  private validateFaceDetectionResult(data: any): {
    isValid: boolean;
    error?: string;
  } {
    if (!data.faces || !Array.isArray(data.faces)) {
      return { isValid: false, error: "faces array is required" };
    }
    if (typeof data.totalFaces !== "number") {
      return { isValid: false, error: "totalFaces number is required" };
    }
    return { isValid: true };
  }

  private validateSafetyAssessmentResult(data: any): {
    isValid: boolean;
    error?: string;
  } {
    if (
      typeof data.overallScore !== "number" ||
      data.overallScore < 0 ||
      data.overallScore > 10
    ) {
      return {
        isValid: false,
        error: "overallScore must be a number between 0 and 10",
      };
    }
    if (!data.riskFactors || !Array.isArray(data.riskFactors)) {
      return { isValid: false, error: "riskFactors array is required" };
    }
    return { isValid: true };
  }

  private validateTextSentimentResult(data: any): {
    isValid: boolean;
    error?: string;
  } {
    const validSentiments = ["positive", "negative", "neutral"];
    if (!validSentiments.includes(data.sentiment)) {
      return {
        isValid: false,
        error: "sentiment must be positive, negative, or neutral",
      };
    }
    if (typeof data.score !== "number" || data.score < -1 || data.score > 1) {
      return {
        isValid: false,
        error: "score must be a number between -1 and 1",
      };
    }
    return { isValid: true };
  }

  /**
   * Updates client AI safety score based on latest assessments
   *
   * @param clientProfileId - Client profile ID
   * @private
   */
  private async updateClientAiScore(clientProfileId: bigint): Promise<void> {
    const latestAssessments = await this.prisma.aiAnalysis.findMany({
      where: {
        clientProfileId,
        analysisType: "SAFETY_ASSESSMENT",
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (latestAssessments.length > 0) {
      // Calculate weighted average of recent assessments
      const scores = latestAssessments.map(
        (a) => (a.resultData as any).overallScore,
      );
      const averageScore =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;

      await this.prisma.clientProfile.update({
        where: { id: clientProfileId },
        data: { aiSafetyScore: averageScore },
      });
    }
  }

  /**
   * Generates human-readable summary of analysis
   *
   * @param analysis - Analysis record
   * @private
   */
  private generateSummary(analysis: AiAnalysis): string {
    const resultData = analysis.resultData as any;

    switch (analysis.analysisType) {
      case "FACE_DETECTION":
        return `Detected ${resultData.totalFaces || 0} face(s)`;
      case "SAFETY_ASSESSMENT":
        return `Safety score: ${resultData.overallScore || "N/A"}/10`;
      case "TEXT_SENTIMENT":
        return `Sentiment: ${resultData.sentiment || "unknown"} (${(resultData.score || 0).toFixed(2)})`;
      default:
        return `${analysis.analysisType} analysis completed`;
    }
  }

  /**
   * Updates AI analysis confidence score
   */
  async updateConfidence(
    analysisId: bigint,
    newConfidence: number,
  ): Promise<AnalysisResult<AiAnalysis>> {
    try {
      if (!isValidConfidenceScore(newConfidence)) {
        return {
          success: false,
          error: new ValidationError(
            "confidenceScore",
            newConfidence,
            "Must be between 0 and 1",
          ),
        };
      }

      const updatedAnalysis = await this.prisma.aiAnalysis.update({
        where: { id: analysisId },
        data: { confidenceScore: newConfidence },
      });

      return { success: true, data: updatedAnalysis };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return {
            success: false,
            error: new Error(`Analysis with ID ${analysisId} not found`),
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error"),
      };
    }
  }

  // Test compatibility methods
  async getAnalysisById(
    analysisId: bigint,
  ): Promise<AnalysisResult<AiAnalysis>> {
    const result = await this.findById(analysisId);
    if (result.success && result.data === null) {
      return {
        success: false,
        error: new Error(`Analysis with ID ${analysisId} not found`),
      };
    }
    return result as AnalysisResult<AiAnalysis>;
  }

  async getAnalysesByClient(
    clientProfileId: bigint,
  ): Promise<AnalysisResult<AiAnalysis[]>> {
    return this.searchAnalyses({ clientProfileId }).then((result) => {
      if (result.success) {
        return { success: true, data: result.data.analyses };
      }
      return result as AnalysisResult<AiAnalysis[]>;
    });
  }

  async getAnalysesByPhoto(
    photoId: bigint,
  ): Promise<AnalysisResult<AiAnalysis[]>> {
    return this.searchAnalyses({ photoId }).then((result) => {
      if (result.success) {
        return { success: true, data: result.data.analyses };
      }
      return result as AnalysisResult<AiAnalysis[]>;
    });
  }

  async getAnalysesByType(
    analysisType: AnalysisType,
  ): Promise<AnalysisResult<AiAnalysis[]>> {
    return this.searchAnalyses({ analysisType }).then((result) => {
      if (result.success) {
        return { success: true, data: result.data.analyses };
      }
      return result as AnalysisResult<AiAnalysis[]>;
    });
  }

  async updateAnalysisConfidence(
    analysisId: bigint,
    newConfidence: number,
  ): Promise<AnalysisResult<AiAnalysis>> {
    return this.updateConfidence(analysisId, newConfidence);
  }
}
