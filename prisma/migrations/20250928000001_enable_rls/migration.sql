-- Enable Row Level Security on sensitive tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "photos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin_actions" ENABLE ROW LEVEL SECURITY;

-- Create function to get current user ID from session
CREATE OR REPLACE FUNCTION auth.current_user_id()
RETURNS BIGINT AS $$
BEGIN
  -- In a real implementation, this would extract user ID from JWT or session
  -- For now, return a placeholder that will be set by the application
  RETURN COALESCE(current_setting('app.current_user_id', true)::BIGINT, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if current user has admin role
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.current_user_id()
    AND role IN ('admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if current user is verified
CREATE OR REPLACE FUNCTION auth.is_verified()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.current_user_id()
    AND role IN ('admin', 'manager', 'verified_user')
    AND is_verified = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for users table
CREATE POLICY "users_select_policy" ON "users"
  FOR SELECT USING (
    -- Users can see their own profile
    id = auth.current_user_id()
    OR
    -- Admins can see all users
    auth.is_admin()
  );

CREATE POLICY "users_update_policy" ON "users"
  FOR UPDATE USING (
    -- Users can update their own profile (limited fields)
    id = auth.current_user_id()
    OR
    -- Admins can update any user
    auth.is_admin()
  );

-- RLS Policies for client_profiles table
CREATE POLICY "client_profiles_select_policy" ON "client_profiles"
  FOR SELECT USING (
    -- Admins and managers can see all
    auth.is_admin()
    OR
    -- Verified users can see verified profiles
    (status = 'verified_safe' AND auth.is_verified())
    OR
    -- Creator can see their own
    created_by = auth.current_user_id()
  );

CREATE POLICY "client_profiles_insert_policy" ON "client_profiles"
  FOR INSERT WITH CHECK (
    -- Only verified users can create profiles
    auth.is_verified()
    AND
    -- Set creator to current user
    created_by = auth.current_user_id()
  );

CREATE POLICY "client_profiles_update_policy" ON "client_profiles"
  FOR UPDATE USING (
    -- Admins can update any profile
    auth.is_admin()
    OR
    -- Creator can update their own profile
    created_by = auth.current_user_id()
  );

-- RLS Policies for reviews table
CREATE POLICY "reviews_select_policy" ON "reviews"
  FOR SELECT USING (
    -- Admins and managers can see all
    auth.is_admin()
    OR
    -- Reviewer can see their own
    reviewer_id = auth.current_user_id()
    OR
    -- Others can see active, non-flagged reviews
    (status = 'active' AND flagged_count < 3)
  );

CREATE POLICY "reviews_insert_policy" ON "reviews"
  FOR INSERT WITH CHECK (
    -- Only verified users can create reviews
    auth.is_verified()
    AND
    -- Set reviewer to current user
    reviewer_id = auth.current_user_id()
  );

CREATE POLICY "reviews_update_policy" ON "reviews"
  FOR UPDATE USING (
    -- Admins can update any review
    auth.is_admin()
    OR
    -- Reviewer can update their own review
    reviewer_id = auth.current_user_id()
  );

-- RLS Policies for photos table
CREATE POLICY "photos_select_policy" ON "photos"
  FOR SELECT USING (
    -- Admins can see all photos
    auth.is_admin()
    OR
    -- Uploader can see their own photos
    uploader_id = auth.current_user_id()
    OR
    -- Approved photos are visible to verified users
    (status = 'approved' AND auth.is_verified())
  );

CREATE POLICY "photos_insert_policy" ON "photos"
  FOR INSERT WITH CHECK (
    -- Only verified users can upload photos
    auth.is_verified()
    AND
    -- Set uploader to current user
    uploader_id = auth.current_user_id()
  );

-- RLS Policies for admin_actions table
CREATE POLICY "admin_actions_select_policy" ON "admin_actions"
  FOR SELECT USING (
    -- Only admins can see admin actions
    auth.is_admin()
  );

CREATE POLICY "admin_actions_insert_policy" ON "admin_actions"
  FOR INSERT WITH CHECK (
    -- Only admins can create admin actions
    auth.is_admin()
    AND
    -- Set admin to current user
    admin_id = auth.current_user_id()
  );

-- Create indexes for RLS performance
CREATE INDEX IF NOT EXISTS "idx_users_rls" ON "users" (id, role, is_verified);
CREATE INDEX IF NOT EXISTS "idx_client_profiles_rls" ON "client_profiles" (created_by, status);
CREATE INDEX IF NOT EXISTS "idx_reviews_rls" ON "reviews" (reviewer_id, status, flagged_count);
CREATE INDEX IF NOT EXISTS "idx_photos_rls" ON "photos" (uploader_id, status);
CREATE INDEX IF NOT EXISTS "idx_admin_actions_rls" ON "admin_actions" (admin_id);
