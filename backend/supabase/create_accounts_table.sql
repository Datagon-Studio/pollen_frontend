-- =====================================================
-- Accounts Table Creation Script
-- =====================================================
-- This script creates the accounts table in Supabase
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Create the accounts table
CREATE TABLE IF NOT EXISTS accounts (
  -- Primary Key
  account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Account Details (account_name is nullable - can be set later)
  account_name TEXT NULL,
  account_logo TEXT NULL, -- URL to uploaded logo
  
  -- Status Fields
  kyc_status TEXT NOT NULL DEFAULT 'unverified' CHECK (kyc_status IN ('unverified', 'pending', 'verified', 'rejected')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alter account_name to be nullable if table already exists with NOT NULL constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' 
    AND column_name = 'account_name' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE accounts ALTER COLUMN account_name DROP NOT NULL;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_kyc_status ON accounts(kyc_status);
CREATE INDEX IF NOT EXISTS idx_accounts_created_at ON accounts(created_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row update
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_accounts_updated_at();

-- Add comments for documentation
COMMENT ON TABLE accounts IS 'Stores account/organization information';
COMMENT ON COLUMN accounts.account_id IS 'Primary key, auto-generated UUID';
COMMENT ON COLUMN accounts.account_name IS 'Name of the account/organization';
COMMENT ON COLUMN accounts.account_logo IS 'URL to the account logo image';
COMMENT ON COLUMN accounts.kyc_status IS 'KYC verification status: unverified, pending, verified, or rejected';
COMMENT ON COLUMN accounts.status IS 'Account status: active, inactive, or suspended';

-- =====================================================
-- User-Account Junction Table
-- =====================================================
-- Links users to accounts (many-to-many relationship)

CREATE TABLE IF NOT EXISTS user_accounts (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  
  -- Role in this account (admin, member, etc.)
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'member', 'viewer')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one user-account relationship
  UNIQUE(user_id, account_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON user_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_account_id ON user_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_role ON user_accounts(role);

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS update_user_accounts_updated_at ON user_accounts;
CREATE TRIGGER update_user_accounts_updated_at
  BEFORE UPDATE ON user_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_accounts_updated_at();

-- Add comments
COMMENT ON TABLE user_accounts IS 'Junction table linking users to accounts';
COMMENT ON COLUMN user_accounts.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN user_accounts.account_id IS 'Foreign key to accounts table';
COMMENT ON COLUMN user_accounts.role IS 'User role in this account: admin, member, or viewer';

-- =====================================================
-- Auto-Create Account on User Signup
-- =====================================================
-- Automatically create an account when a user signs up

CREATE OR REPLACE FUNCTION public.handle_new_user_account()
RETURNS TRIGGER AS $$
DECLARE
  new_account_id UUID;
BEGIN
  -- Create a new account with just the ID (no name, no logo)
  INSERT INTO public.accounts (account_id, account_name, account_logo, kyc_status, status)
  VALUES (
    gen_random_uuid(),
    NULL, -- Account name will be set later on settings page
    NULL, -- Logo will be uploaded later on settings page
    'unverified',
    'active'
  )
  RETURNING account_id INTO new_account_id;

  -- Link the user to the account as admin
  INSERT INTO public.user_accounts (user_id, account_id, role)
  VALUES (
    NEW.user_id,
    new_account_id,
    'admin'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create account when user profile is created
DROP TRIGGER IF EXISTS on_user_profile_created ON public.users;
CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_account();

-- =====================================================
-- Security: Row Level Security (RLS) Setup
-- =====================================================
-- Enable RLS on both tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for accounts table
-- =====================================================

-- Policy: Service role (backend) can do everything
-- Note: Service role should bypass RLS, but this ensures compatibility
DROP POLICY IF EXISTS "Service role full access on accounts" ON accounts;
CREATE POLICY "Service role full access on accounts"
ON accounts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can read their own account (via user_accounts join)
DROP POLICY IF EXISTS "Users can read their own account" ON accounts;
CREATE POLICY "Users can read their own account"
ON accounts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = accounts.account_id
    AND user_accounts.user_id = auth.uid()
  )
);

-- Policy: Users can update their own account (via user_accounts join)
DROP POLICY IF EXISTS "Users can update their own account" ON accounts;
CREATE POLICY "Users can update their own account"
ON accounts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = accounts.account_id
    AND user_accounts.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = accounts.account_id
    AND user_accounts.user_id = auth.uid()
  )
);

-- Policy: Allow account creation (for trigger function and backend)
-- SECURITY DEFINER functions run as function owner, but we need a policy
DROP POLICY IF EXISTS "Allow account creation" ON accounts;
CREATE POLICY "Allow account creation"
ON accounts
FOR INSERT
WITH CHECK (true);

-- =====================================================
-- RLS Policies for user_accounts table
-- =====================================================

-- Policy: Service role (backend) can do everything
DROP POLICY IF EXISTS "Service role full access on user_accounts" ON user_accounts;
CREATE POLICY "Service role full access on user_accounts"
ON user_accounts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can read their own account links
DROP POLICY IF EXISTS "Users can read their own account links" ON user_accounts;
CREATE POLICY "Users can read their own account links"
ON user_accounts
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can only create user_account links for themselves
-- The SECURITY DEFINER trigger and service_role backend can still insert via other policies
DROP POLICY IF EXISTS "Allow user_account creation" ON user_accounts;
CREATE POLICY "Allow user_account creation"
ON user_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only insert their own user_id
  user_id = auth.uid()
  -- Prevent self-promotion to admin (backend should handle this)
  AND role IN ('member', 'viewer')
);

-- Policy: Users can update only their own account links
-- Prevent privilege escalation by disallowing role changes
DROP POLICY IF EXISTS "Users can update their own account links" ON user_accounts;
CREATE POLICY "Users can update their own account links"
ON user_accounts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  -- Ensure user_id remains the same (no transferring ownership)
  user_id = auth.uid()
  -- Prevent self-promotion (role changes should be backend-only)
  AND role = (SELECT role FROM user_accounts WHERE id = user_accounts.id)
);

-- Policy: Users can delete only their own account links
-- Allows users to leave accounts they're members of
DROP POLICY IF EXISTS "Users can delete their own account links" ON user_accounts;
CREATE POLICY "Users can delete their own account links"
ON user_accounts
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the tables were created correctly:
-- SELECT 
--   table_name,
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name IN ('accounts', 'user_accounts')
-- ORDER BY table_name, ordinal_position;


