import { AiAnalysis, AnalysisType } from "@prisma/client";

export { AnalysisType };

export interface CreateAnalysisRequest {
  clientProfileId?: bigint;
  photoId?: bigint;
  analysisType: AnalysisType;
  resultData: Record<string, any>;
  confidenceScore?: number;
  modelVersion?: string;
  processingTimeMs?: number;
}

export interface AnalysisRequest extends CreateAnalysisRequest {}

export interface AnalysisFilters {
  clientProfileId?: bigint;
  photoId?: bigint;
  analysisType?: AnalysisType;
  minConfidence?: number;
  maxConfidence?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface AnalysisStatistics {
  total: number;
  byType: Record<string, number>;
  averageConfidence: number;
  averageProcessingTime: number;
  recentAnalyses: number;
}

export type AnalysisResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error };

export interface PublicAnalysis {
  id: bigint;
  analysisType: AnalysisType;
  confidenceScore?: number;
  createdAt: Date;
  summary: string;
}

// AI Analysis Result Schemas
export interface FaceDetectionResult {
  faces: Array<{
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    confidence: number;
    landmarks?: Array<{
      type: string;
      x: number;
      y: number;
    }>;
  }>;
  totalFaces: number;
}

export interface SafetyAssessmentResult {
  overallScore: number; // 0-10
  riskFactors: Array<{
    factor: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
  }>;
  recommendations: string[];
  confidence: number;
}

export interface TextSentimentResult {
  sentiment: "positive" | "negative" | "neutral";
  score: number; // -1 to 1
  confidence: number;
  keywords: string[];
  emotions?: Array<{
    emotion: string;
    intensity: number;
  }>;
}

// Constants
export const MIN_CONFIDENCE_SCORE = 0.0;
export const MAX_CONFIDENCE_SCORE = 1.0;
export const MIN_AI_SAFETY_SCORE = 0;
export const MAX_AI_SAFETY_SCORE = 10;
