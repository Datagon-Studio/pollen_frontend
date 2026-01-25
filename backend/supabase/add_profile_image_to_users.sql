-- =====================================================
-- Migration: Add profile_image_url to users table
-- =====================================================
-- This script adds the profile_image_url column to existing users table
-- Run this in the Supabase SQL Editor if the table already exists
-- =====================================================

-- Add profile_image_url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'profile_image_url'
  ) THEN
    ALTER TABLE users ADD COLUMN profile_image_url TEXT NULL;
    
    COMMENT ON COLUMN users.profile_image_url IS 'URL to user profile image/logo';
  END IF;
END $$;

-- =====================================================
-- Enable RLS if not already enabled
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Service role full access" ON users;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can update their own profile
-- Allow updating full_name and profile_image_url
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can do everything (backend access)
-- Note: Service role should bypass RLS, but this policy ensures compatibility
CREATE POLICY "Service role full access"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
