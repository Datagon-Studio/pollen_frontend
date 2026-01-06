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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile on signup
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
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row update
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

-- =====================================================
-- Security: Row Level Security (RLS) Setup
-- =====================================================
-- Note: RLS is disabled for now as per requirements
-- When ready to enable, uncomment the following:

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- -- Policy: Users can read their own profile
-- CREATE POLICY "Users can view own profile"
--   ON users
--   FOR SELECT
--   USING (auth.uid() = user_id);

-- -- Policy: Users can update their own profile
-- CREATE POLICY "Users can update own profile"
--   ON users
--   FOR UPDATE
--   USING (auth.uid() = user_id);

-- -- Policy: Service role can do everything (backend access)
-- CREATE POLICY "Service role full access"
--   ON users
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

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

