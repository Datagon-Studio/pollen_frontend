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
-- Note: RLS is disabled for now as per requirements
-- When ready to enable, uncomment the following:

-- ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

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


