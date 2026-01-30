-- =====================================================
-- Users Table Creation Script
-- =====================================================
-- This script creates the users table in Supabase
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Create the users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  -- Primary Key (references auth.users)
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- User Details
  email TEXT NOT NULL UNIQUE,
  
  -- Role (all users are admins by default)
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'user')),
  
  -- Profile Information (optional)
  full_name TEXT NULL,
  phone_number TEXT NULL,
  profile_image_url TEXT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create function to automatically create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    'admin', -- All users are admins by default
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = pg_catalog, public;

-- Create trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = pg_catalog, public;

-- Create trigger to update updated_at on row update
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

-- Add comments for documentation
COMMENT ON TABLE users IS 'User profiles extending Supabase auth.users';
COMMENT ON COLUMN users.user_id IS 'Primary key, references auth.users(id)';
COMMENT ON COLUMN users.email IS 'User email address (synced from auth.users)';
COMMENT ON COLUMN users.role IS 'User role: admin (default) or user';
COMMENT ON COLUMN users.full_name IS 'Optional full name of the user';
COMMENT ON COLUMN users.phone_number IS 'User phone number';
COMMENT ON COLUMN users.profile_image_url IS 'URL to user profile image/logo';

-- =====================================================
-- Security: Row Level Security (RLS) Setup
-- =====================================================

-- Enable RLS
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
  USING ((SELECT auth.uid()) = user_id);

-- Policy: Users can update their own profile
-- Allow updating full_name and profile_image_url
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Service role can do everything (backend access)
-- Note: Service role should bypass RLS, but this policy ensures compatibility
CREATE POLICY "Service role full access"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the table was created correctly:
-- SELECT 
--   table_name,
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- ORDER BY ordinal_position;



