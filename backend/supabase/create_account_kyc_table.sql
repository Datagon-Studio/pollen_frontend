-- =====================================================
-- Account KYC Table Creation Script
-- =====================================================
-- This script creates the account_kyc table in Supabase
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Create the account_kyc table
CREATE TABLE IF NOT EXISTS account_kyc (
  -- Primary Key
  kyc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  
  -- Account Type
  account_type TEXT NOT NULL CHECK (account_type IN ('individual', 'business')),
  
  -- Official Name
  official_name TEXT NOT NULL,
  
  -- Documents
  -- Business Registration PDF (only if account_type = 'business')
  business_registration_url TEXT NULL,
  
  -- Passport Photo (only if account_type = 'individual')
  passport_photo_url TEXT NULL,
  
  -- National ID PDF (front and back combined) - Required for both types
  national_id_url TEXT NOT NULL,
  
  -- Verification Fields
  verified_by UUID NULL REFERENCES users(user_id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one KYC record per account
  UNIQUE(account_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_account_kyc_account_id ON account_kyc(account_id);
CREATE INDEX IF NOT EXISTS idx_account_kyc_account_type ON account_kyc(account_type);
CREATE INDEX IF NOT EXISTS idx_account_kyc_verified_by ON account_kyc(verified_by);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_account_kyc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = pg_catalog, public;

-- Create trigger to update updated_at on row update
DROP TRIGGER IF EXISTS update_account_kyc_updated_at ON account_kyc;
CREATE TRIGGER update_account_kyc_updated_at
  BEFORE UPDATE ON account_kyc
  FOR EACH ROW
  EXECUTE FUNCTION update_account_kyc_updated_at();

-- Add check constraint to ensure business_registration_url is only set for business accounts
ALTER TABLE account_kyc DROP CONSTRAINT IF EXISTS check_business_registration;
ALTER TABLE account_kyc ADD CONSTRAINT check_business_registration
  CHECK (
    (account_type = 'business' AND business_registration_url IS NOT NULL) OR
    (account_type = 'individual' AND business_registration_url IS NULL)
  );

-- Add check constraint to ensure passport_photo_url is only set for individual accounts
ALTER TABLE account_kyc DROP CONSTRAINT IF EXISTS check_passport_photo;
ALTER TABLE account_kyc ADD CONSTRAINT check_passport_photo
  CHECK (
    (account_type = 'individual' AND passport_photo_url IS NOT NULL) OR
    (account_type = 'business' AND passport_photo_url IS NULL)
  );

-- Add comments for documentation
COMMENT ON TABLE account_kyc IS 'Stores KYC (Know Your Customer) verification documents and information for accounts';
COMMENT ON COLUMN account_kyc.kyc_id IS 'Primary key, auto-generated UUID';
COMMENT ON COLUMN account_kyc.account_id IS 'Foreign key to accounts table';
COMMENT ON COLUMN account_kyc.account_type IS 'Type of account: individual or business';
COMMENT ON COLUMN account_kyc.official_name IS 'Official registered name of the account holder';
COMMENT ON COLUMN account_kyc.business_registration_url IS 'URL to business registration PDF (required for business accounts only)';
COMMENT ON COLUMN account_kyc.passport_photo_url IS 'URL to passport photo (required for individual accounts only)';
COMMENT ON COLUMN account_kyc.national_id_url IS 'URL to National ID PDF (front and back combined, required for all accounts)';
COMMENT ON COLUMN account_kyc.verified_by IS 'User ID of the admin who verified the KYC';
COMMENT ON COLUMN account_kyc.verified_at IS 'Timestamp when KYC was verified';

-- =====================================================
-- Security: Row Level Security (RLS) Setup
-- =====================================================

-- Enable RLS on the table
ALTER TABLE account_kyc ENABLE ROW LEVEL SECURITY;

-- Policy: Service role (backend) can do everything
DROP POLICY IF EXISTS "Service role full access on account_kyc" ON account_kyc;
CREATE POLICY "Service role full access on account_kyc"
ON account_kyc
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can read KYC for their own account
DROP POLICY IF EXISTS "Users can read their own account KYC" ON account_kyc;
CREATE POLICY "Users can read their own account KYC"
ON account_kyc
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = account_kyc.account_id
    AND user_accounts.user_id = (SELECT auth.uid())
  )
);

-- Policy: Users can create KYC for their own account
DROP POLICY IF EXISTS "Users can create KYC for their account" ON account_kyc;
CREATE POLICY "Users can create KYC for their account"
ON account_kyc
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = account_kyc.account_id
    AND user_accounts.user_id = (SELECT auth.uid())
    AND user_accounts.role = 'admin'
  )
);

-- Policy: Users can update KYC for their own account
DROP POLICY IF EXISTS "Users can update KYC for their account" ON account_kyc;
CREATE POLICY "Users can update KYC for their account"
ON account_kyc
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = account_kyc.account_id
    AND user_accounts.user_id = (SELECT auth.uid())
    AND user_accounts.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = account_kyc.account_id
    AND user_accounts.user_id = (SELECT auth.uid())
    AND user_accounts.role = 'admin'
  )
);

-- Policy: Users can delete KYC for their own account
DROP POLICY IF EXISTS "Users can delete KYC for their account" ON account_kyc;
CREATE POLICY "Users can delete KYC for their account"
ON account_kyc
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = account_kyc.account_id
    AND user_accounts.user_id = (SELECT auth.uid())
    AND user_accounts.role = 'admin'
  )
);
