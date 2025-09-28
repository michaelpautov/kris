import { z } from "zod";

// Constants
export const MIN_NAME_LENGTH = 1;
export const MAX_NAME_LENGTH = 64;
export const MIN_AI_SCORE = 0;
export const MAX_AI_SCORE = 10;
export const MIN_RATING = 1;
export const MAX_RATING = 5;

// Phone number validation regex (E.164 format)
export const PHONE_NUMBER_REGEX = /^\+[1-9]\d{1,14}$/;

// Validation schemas
export const CreateClientSchema = z.object({
  phoneNumber: z
    .string()
    .regex(PHONE_NUMBER_REGEX, "Invalid phone number format"),
  firstName: z.string().min(MIN_NAME_LENGTH).max(MAX_NAME_LENGTH).optional(),
  lastName: z.string().max(MAX_NAME_LENGTH).optional(),
  telegramUsername: z.string().max(32).optional(),
  telegramId: z.bigint().positive().optional(),
});

export const UpdateClientSchema = z.object({
  firstName: z.string().min(MIN_NAME_LENGTH).max(MAX_NAME_LENGTH).optional(),
  lastName: z.string().max(MAX_NAME_LENGTH).optional(),
  telegramUsername: z.string().max(32).optional(),
  telegramId: z.bigint().positive().optional(),
  profilePhotoUrl: z.string().url().optional(),
  status: z
    .enum([
      "PENDING_VERIFICATION",
      "VERIFIED_SAFE",
      "FLAGGED_CONCERNING",
      "BLACKLISTED",
      "UNDER_REVIEW",
    ])
    .optional(),
  riskLevel: z
    .enum(["UNKNOWN", "LOW", "MEDIUM", "HIGH", "CRITICAL"])
    .optional(),
  aiSafetyScore: z.number().min(MIN_AI_SCORE).max(MAX_AI_SCORE).optional(),
});

export class ValidationError extends Error {
  constructor(field: string, value: any, details?: string) {
    super(
      `Validation failed for ${field}: ${value}${details ? ` (${details})` : ""}`,
    );
    this.name = "ValidationError";
  }
}

export class BusinessRuleError extends Error {
  constructor(rule: string, details?: string) {
    super(`Business rule violation: ${rule}${details ? ` (${details})` : ""}`);
    this.name = "BusinessRuleError";
  }
}

/**
 * Normalizes phone number to E.164 format
 * @param phoneNumber - Raw phone number input
 * @returns Normalized phone number with + prefix
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  // Remove spaces, dashes, parentheses
  let normalized = phoneNumber.replace(/[\s\-\(\)]/g, "");

  // Add + if not present
  if (!normalized.startsWith("+")) {
    normalized = "+" + normalized;
  }

  return normalized;
}

/**
 * Validates phone number format against E.164 standard
 * @param phoneNumber - Phone number to validate
 * @returns True if valid, false otherwise
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  const normalized = normalizePhoneNumber(phoneNumber);
  return PHONE_NUMBER_REGEX.test(normalized);
}

/**
 * Validates AI safety score range
 * @param score - AI safety score to validate
 * @returns True if valid, false otherwise
 */
export function isValidAiScore(score: number): boolean {
  return score >= MIN_AI_SCORE && score <= MAX_AI_SCORE;
}

/**
 * Validates review rating range
 * @param rating - Rating to validate
 * @returns True if valid, false otherwise
 */
export function isValidRating(rating: number): boolean {
  return (
    Number.isInteger(rating) && rating >= MIN_RATING && rating <= MAX_RATING
  );
}

// Review validation schemas
export const CreateReviewSchema = z.object({
  clientProfileId: z.bigint().positive(),
  rating: z.number().int().min(MIN_RATING).max(MAX_RATING),
  reviewText: z.string().max(2000).optional(),
  encounterDate: z.date().optional(),
  locationCity: z.string().max(100).optional(),
  locationCountry: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  isAnonymous: z.boolean().optional(),
  verificationMethod: z
    .enum([
      "PHOTO_VERIFICATION",
      "VIDEO_CALL",
      "IN_PERSON_MEETING",
      "DOCUMENT_VERIFICATION",
      "PHONE_VERIFICATION",
    ])
    .optional(),
});

export const UpdateReviewSchema = z.object({
  rating: z.number().int().min(MIN_RATING).max(MAX_RATING).optional(),
  reviewText: z.string().max(2000).optional(),
  encounterDate: z.date().optional(),
  locationCity: z.string().max(100).optional(),
  locationCountry: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  isAnonymous: z.boolean().optional(),
  verificationMethod: z
    .enum([
      "PHOTO_VERIFICATION",
      "VIDEO_CALL",
      "IN_PERSON_MEETING",
      "DOCUMENT_VERIFICATION",
      "PHONE_VERIFICATION",
    ])
    .optional(),
  isVerified: z.boolean().optional(),
});

// Photo validation schemas
export const UploadPhotoSchema = z.object({
  originalFilename: z.string().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
  clientProfileId: z.bigint().positive().optional(),
  isProfilePhoto: z.boolean().optional(),
});

/**
 * Validates image file type and size
 * @param mimeType - MIME type to validate
 * @param fileSize - File size in bytes
 * @returns True if valid, false otherwise
 */
export function isValidImageFile(mimeType: string, fileSize: number): boolean {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const maxSize = 50 * 1024 * 1024; // 50MB

  return allowedTypes.includes(mimeType.toLowerCase()) && fileSize <= maxSize;
}
