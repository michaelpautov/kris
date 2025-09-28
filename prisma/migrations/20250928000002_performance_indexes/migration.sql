-- Performance Optimization Migration
-- Add indexes for frequently queried columns and improve query performance

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_telegram_id" ON "users" ("telegram_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_role" ON "users" ("role");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_phone_number" ON "users" ("phone_number");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_is_active" ON "users" ("is_active");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_last_active_at" ON "users" ("last_active_at");

-- Client profiles indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_client_profiles_phone_normalized" ON "client_profiles" ("normalized_phone");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_client_profiles_status" ON "client_profiles" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_client_profiles_risk_level" ON "client_profiles" ("risk_level");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_client_profiles_created_by" ON "client_profiles" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_client_profiles_ai_safety_score" ON "client_profiles" ("ai_safety_score");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_client_profiles_created_at" ON "client_profiles" ("created_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_client_profiles_updated_at" ON "client_profiles" ("updated_at");

-- Composite index for common search patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_client_profiles_status_risk" ON "client_profiles" ("status", "risk_level");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_client_profiles_name_search" ON "client_profiles" ("first_name", "last_name");

-- Reviews table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_reviews_client_profile_id" ON "reviews" ("client_profile_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_reviews_reviewer_id" ON "reviews" ("reviewer_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_reviews_rating" ON "reviews" ("rating");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_reviews_is_verified" ON "reviews" ("is_verified");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_reviews_flagged_for_review" ON "reviews" ("flagged_for_review");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_reviews_created_at" ON "reviews" ("created_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_reviews_encounter_date" ON "reviews" ("encounter_date");

-- Composite index for review queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_reviews_client_verified" ON "reviews" ("client_profile_id", "is_verified");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_reviews_client_date" ON "reviews" ("client_profile_id", "created_at");

-- Photos table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_photos_client_profile_id" ON "photos" ("client_profile_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_photos_uploader_id" ON "photos" ("uploader_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_photos_status" ON "photos" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_photos_storage_type" ON "photos" ("storage_type");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_photos_ai_analysis_completed" ON "photos" ("ai_analysis_completed");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_photos_is_profile_photo" ON "photos" ("is_profile_photo");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_photos_created_at" ON "photos" ("created_at");

-- AI Analysis table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ai_analysis_client_profile_id" ON "ai_analysis" ("client_profile_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ai_analysis_photo_id" ON "ai_analysis" ("photo_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ai_analysis_type" ON "ai_analysis" ("analysis_type");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ai_analysis_confidence_score" ON "ai_analysis" ("confidence_score");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ai_analysis_created_at" ON "ai_analysis" ("created_at");

-- Composite indexes for AI analysis queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ai_analysis_client_type" ON "ai_analysis" ("client_profile_id", "analysis_type");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ai_analysis_photo_type" ON "ai_analysis" ("photo_id", "analysis_type");

-- User sessions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_sessions_user_id" ON "user_sessions" ("user_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_sessions_session_token" ON "user_sessions" ("session_token");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_sessions_is_active" ON "user_sessions" ("is_active");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_sessions_expires_at" ON "user_sessions" ("expires_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_sessions_last_used_at" ON "user_sessions" ("last_used_at");

-- Admin actions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_admin_actions_admin_id" ON "admin_actions" ("admin_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_admin_actions_action_type" ON "admin_actions" ("action_type");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_admin_actions_target_type" ON "admin_actions" ("target_type");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_admin_actions_target_id" ON "admin_actions" ("target_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_admin_actions_created_at" ON "admin_actions" ("created_at");

-- Composite index for admin action queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_admin_actions_target" ON "admin_actions" ("target_type", "target_id");

-- Bot configurations indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bot_configurations_key" ON "bot_configurations" ("key");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bot_configurations_is_sensitive" ON "bot_configurations" ("is_sensitive");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bot_configurations_updated_by" ON "bot_configurations" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bot_configurations_updated_at" ON "bot_configurations" ("updated_at");

-- Notifications indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notifications_user_id" ON "notifications" ("user_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notifications_type" ON "notifications" ("type");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notifications_is_read" ON "notifications" ("is_read");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notifications_created_at" ON "notifications" ("created_at");

-- Composite index for notification queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notifications_user_unread" ON "notifications" ("user_id", "is_read");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notifications_user_type" ON "notifications" ("user_id", "type");

-- Rate limits indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rate_limits_user_id" ON "rate_limits" ("user_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rate_limits_telegram_id" ON "rate_limits" ("telegram_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rate_limits_action_type" ON "rate_limits" ("action_type");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rate_limits_window_start" ON "rate_limits" ("window_start");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rate_limits_expires_at" ON "rate_limits" ("expires_at");

-- Composite indexes for rate limiting queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rate_limits_user_action" ON "rate_limits" ("user_id", "action_type");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rate_limits_telegram_action" ON "rate_limits" ("telegram_id", "action_type");

-- Full-text search indexes (using GIN for better performance on text searches)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_client_profiles_search" ON "client_profiles"
USING GIN (to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(phone_number, '')));

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_reviews_search" ON "reviews"
USING GIN (to_tsvector('english', COALESCE(review_text, '')));

-- Partial indexes for common filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_active_by_role" ON "users" ("role") WHERE "is_active" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_client_profiles_flagged" ON "client_profiles" ("risk_level") WHERE "status" IN ('FLAGGED_CONCERNING', 'BLACKLISTED');
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_reviews_unverified" ON "reviews" ("client_profile_id") WHERE "is_verified" = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_photos_pending" ON "photos" ("client_profile_id") WHERE "status" = 'PENDING_REVIEW';
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notifications_unread" ON "notifications" ("user_id", "created_at") WHERE "is_read" = false;

-- Cleanup expired data indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_sessions_cleanup" ON "user_sessions" ("expires_at") WHERE "expires_at" < NOW();
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rate_limits_cleanup" ON "rate_limits" ("expires_at") WHERE "expires_at" < NOW();

-- Statistics and analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_client_profiles_stats" ON "client_profiles" ("created_at", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_reviews_stats" ON "reviews" ("created_at", "rating");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ai_analysis_stats" ON "ai_analysis" ("created_at", "analysis_type", "confidence_score");

-- Performance monitoring comment
COMMENT ON INDEX "idx_client_profiles_search" IS 'Full-text search index for client profiles';
COMMENT ON INDEX "idx_reviews_search" IS 'Full-text search index for review text';
COMMENT ON INDEX "idx_users_active_by_role" IS 'Partial index for active users by role';
COMMENT ON INDEX "idx_client_profiles_flagged" IS 'Partial index for flagged/blacklisted clients';
