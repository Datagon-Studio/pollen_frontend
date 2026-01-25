-- =====================================================
-- Add phone_number column to users table
-- =====================================================
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Add phone_number column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_number TEXT NULL;

-- Update RLS policy to allow updating phone_number
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add comment
COMMENT ON COLUMN users.phone_number IS 'User phone number';
