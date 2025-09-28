-- Enable Row Level Security on ai_analysis table
ALTER TABLE "ai_analysis" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_analysis table
CREATE POLICY "ai_analysis_select_policy" ON "ai_analysis"
  FOR SELECT USING (
    -- Admins and managers can see all AI analyses
    auth.is_admin()
    OR
    -- Users can see AI analyses for their own client profiles
    EXISTS (
      SELECT 1 FROM client_profiles cp
      WHERE cp.id = ai_analysis.client_profile_id
      AND cp.created_by = auth.current_user_id()
    )
    OR
    -- Users can see AI analyses for photos they uploaded
    EXISTS (
      SELECT 1 FROM photos p
      WHERE p.id = ai_analysis.photo_id
      AND p.uploader_id = auth.current_user_id()
    )
  );

CREATE POLICY "ai_analysis_insert_policy" ON "ai_analysis"
  FOR INSERT WITH CHECK (
    -- Only system/admin can create AI analyses
    auth.is_admin()
  );

-- Add performance index for RLS
CREATE INDEX IF NOT EXISTS "idx_ai_analysis_rls" ON "ai_analysis" (client_profile_id, photo_id);

-- Update existing RLS index creation
CREATE INDEX IF NOT EXISTS "idx_ai_analysis_client_profile" ON "ai_analysis" (client_profile_id);
CREATE INDEX IF NOT EXISTS "idx_ai_analysis_photo" ON "ai_analysis" (photo_id);
CREATE INDEX IF NOT EXISTS "idx_ai_analysis_type" ON "ai_analysis" (analysis_type);
CREATE INDEX IF NOT EXISTS "idx_ai_analysis_confidence" ON "ai_analysis" (confidence_score DESC);
