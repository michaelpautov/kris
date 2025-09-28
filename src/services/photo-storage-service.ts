import { Client as MinioClient } from "minio";
import { PrismaClient, Photo, PhotoStatus } from "@prisma/client";
import { prisma } from "../database/connection";
import {
  UploadPhotoRequest,
  PhotoMetadata,
  StorageStatistics,
  PhotoResult,
  PublicPhoto,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  DEFAULT_PRESIGNED_URL_EXPIRY,
} from "../types/photo";
import {
  UploadPhotoSchema,
  ValidationError,
  isValidImageFile,
} from "../utils/validation";
import * as crypto from "crypto";
import * as path from "path";

/**
 * Service for managing photo storage operations with MinIO integration.
 *
 * Handles photo upload, storage, retrieval, and moderation.
 * Integrates with MinIO for object storage and includes proper error handling.
 */
export class PhotoStorageService {
  private minio: MinioClient;
  private bucketName: string;

  constructor(private prisma: PrismaClient = prisma) {
    this.bucketName = process.env.MINIO_BUCKET_NAME || "clientcheck-files";
    this.minio = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT || "localhost",
      port: parseInt(process.env.MINIO_PORT || "9000"),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
      secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    });
  }

  /**
   * Uploads photo with validation and storage
   *
   * @param request - Photo upload data
   * @param uploaderId - ID of user uploading the photo
   * @returns Promise resolving to created photo record
   */
  async uploadPhoto(
    request: UploadPhotoRequest,
    uploaderId: bigint,
  ): Promise<PhotoResult<Photo>> {
    try {
      // Validate input
      const validData = UploadPhotoSchema.parse({
        originalFilename: request.originalFilename,
        mimeType: request.mimeType,
        clientProfileId: request.clientProfileId,
        isProfilePhoto: request.isProfilePhoto,
      });

      // Validate file
      if (!isValidImageFile(request.mimeType, request.file.length)) {
        return {
          success: false,
          error: new ValidationError("file", "Invalid file type or size"),
        };
      }

      await this.ensureBucketExists();

      const fileKey = this.generateFileKey(request.originalFilename);

      // Upload to MinIO
      await this.minio.putObject(
        this.bucketName,
        fileKey,
        request.file,
        request.file.length,
        {
          "Content-Type": request.mimeType,
          "x-amz-meta-original-filename": request.originalFilename,
          "x-amz-meta-uploader-id": uploaderId.toString(),
        },
      );

      // Create database record
      const photo = await this.prisma.photo.create({
        data: {
          fileId: fileKey,
          storageType: "MINIO",
          originalFilename: request.originalFilename,
          fileSize: request.file.length,
          mimeType: request.mimeType,
          uploaderId,
          clientProfileId: request.clientProfileId,
          isProfilePhoto: request.isProfilePhoto || false,
          status: "PENDING_REVIEW",
        },
        include: {
          uploader: {
            select: {
              id: true,
              telegramUsername: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return { success: true, data: photo };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Upload failed"),
      };
    }
  }

  /**
   * Generates photo download URL
   *
   * @param photoId - Photo ID
   * @param expirySeconds - URL expiry time in seconds
   * @returns Promise resolving to download URL
   */
  async getPhotoUrl(
    photoId: bigint,
    expirySeconds = DEFAULT_PRESIGNED_URL_EXPIRY,
  ): Promise<PhotoResult<string>> {
    try {
      const photo = await this.prisma.photo.findUnique({
        where: { id: photoId },
      });

      if (!photo) {
        return {
          success: false,
          error: new Error("Photo not found"),
        };
      }

      let url: string;

      switch (photo.storageType) {
        case "TELEGRAM":
          url = photo.fileId;
          break;
        case "MINIO":
          url = await this.minio.presignedGetObject(
            this.bucketName,
            photo.fileId,
            expirySeconds,
          );
          break;
        case "EXTERNAL_URL":
          url = photo.fileId;
          break;
        default:
          return {
            success: false,
            error: new Error("Unknown storage type"),
          };
      }

      return { success: true, data: url };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error("Failed to get photo URL"),
      };
    }
  }

  /**
   * Updates photo moderation status
   *
   * @param photoId - Photo ID
   * @param status - New photo status
   * @param moderatorId - ID of user performing moderation
   * @returns Promise resolving to updated photo
   */
  async moderatePhoto(
    photoId: bigint,
    status: PhotoStatus,
    moderatorId: bigint,
  ): Promise<PhotoResult<Photo>> {
    try {
      const photo = await this.prisma.photo.update({
        where: { id: photoId },
        data: {
          status,
          updatedAt: new Date(),
        },
      });

      // Log moderation action
      await this.prisma.adminAction.create({
        data: {
          adminId: moderatorId,
          actionType: "PHOTO_MODERATE",
          targetType: "PHOTO",
          targetId: photoId,
          details: {
            action: "status_change",
            newStatus: status,
          },
        },
      });

      return { success: true, data: photo };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Moderation failed"),
      };
    }
  }

  /**
   * Stores Telegram photo reference
   *
   * @param fileId - Telegram file ID
   * @param uploaderId - ID of uploader
   * @param clientProfileId - Optional client profile ID
   * @param metadata - Optional photo metadata
   * @returns Promise resolving to created photo record
   */
  async storeTelegramPhoto(
    fileId: string,
    uploaderId: bigint,
    clientProfileId?: bigint,
    metadata?: PhotoMetadata,
  ): Promise<PhotoResult<Photo>> {
    try {
      const photo = await this.prisma.photo.create({
        data: {
          fileId,
          storageType: "TELEGRAM",
          originalFilename: `telegram_photo_${Date.now()}.jpg`,
          fileSize: metadata?.fileSize || 0,
          mimeType: metadata?.mimeType || "image/jpeg",
          width: metadata?.width,
          height: metadata?.height,
          uploaderId,
          clientProfileId,
          status: "PENDING_REVIEW",
        },
      });

      return { success: true, data: photo };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error("Failed to store Telegram photo"),
      };
    }
  }

  /**
   * Gets storage statistics
   *
   * @returns Promise resolving to storage statistics
   */
  async getStatistics(): Promise<PhotoResult<StorageStatistics>> {
    try {
      const [totalPhotos, statusCounts, storageCounts, storageUsed] =
        await Promise.all([
          this.prisma.photo.count(),
          this.prisma.photo.groupBy({
            by: ["status"],
            _count: true,
          }),
          this.prisma.photo.groupBy({
            by: ["storageType"],
            _count: true,
          }),
          this.prisma.photo.aggregate({
            _sum: { fileSize: true },
          }),
        ]);

      const byStatus: Record<string, number> = {};
      statusCounts.forEach((item) => {
        byStatus[item.status] = item._count;
      });

      const byStorageType: Record<string, number> = {};
      storageCounts.forEach((item) => {
        byStorageType[item.storageType] = item._count;
      });

      return {
        success: true,
        data: {
          totalPhotos,
          byStatus,
          byStorageType,
          totalStorageUsed: storageUsed._sum.fileSize || 0,
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
   * Converts photo to public-safe format
   *
   * @param photo - Full photo record
   * @returns Public photo data without sensitive information
   */
  sanitizePhoto(photo: Photo): PublicPhoto {
    return {
      id: photo.id,
      originalFilename: photo.originalFilename,
      mimeType: photo.mimeType,
      width: photo.width,
      height: photo.height,
      isProfilePhoto: photo.isProfilePhoto,
      status: photo.status,
      createdAt: photo.createdAt,
    };
  }

  private async ensureBucketExists(): Promise<void> {
    const bucketExists = await this.minio.bucketExists(this.bucketName);
    if (!bucketExists) {
      await this.minio.makeBucket(this.bucketName, "us-east-1");
    }
  }

  private generateFileKey(originalFilename: string): string {
    const ext = path.extname(originalFilename);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString("hex");
    return `private/photos/${timestamp}-${random}${ext}`;
  }
}
