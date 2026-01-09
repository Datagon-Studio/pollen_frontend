-- =====================================================
-- Members Table Creation Script
-- =====================================================
-- This script creates the members table in Supabase
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Create the members table
CREATE TABLE IF NOT EXISTS members (
  -- Primary Key
  member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  
  -- Member Details
  full_name TEXT NOT NULL,
  dob DATE,
  phone TEXT NOT NULL,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  email TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  membership_number TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: membership_number must be unique per account
  CONSTRAINT unique_membership_number_per_account UNIQUE (account_id, membership_number)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_members_account_id ON members(account_id);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_membership_number ON members(membership_number);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON members(created_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS update_members_updated_at ON members;

-- Create trigger to update updated_at on row update
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_members_updated_at();

-- Add comments for documentation
COMMENT ON TABLE members IS 'Members associated with accounts';
COMMENT ON COLUMN members.member_id IS 'Primary key';
COMMENT ON COLUMN members.account_id IS 'Foreign key to accounts table';
COMMENT ON COLUMN members.full_name IS 'Full name of the member';
COMMENT ON COLUMN members.dob IS 'Date of birth';
COMMENT ON COLUMN members.phone IS 'Phone number';
COMMENT ON COLUMN members.phone_verified IS 'Whether the phone number is verified';
COMMENT ON COLUMN members.email IS 'Email address (nullable)';
COMMENT ON COLUMN members.email_verified IS 'Whether the email is verified';
COMMENT ON COLUMN members.membership_number IS 'Unique membership number per account (optional)';

-- =====================================================
-- Security: Row Level Security (RLS) Setup
-- =====================================================

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for members table
-- =====================================================

-- Policy: Service role (backend) can do everything
CREATE POLICY "Service role full access on members"
ON members
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can read members for their own account
CREATE POLICY "Users can read members for their account"
ON members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = members.account_id
    AND user_accounts.user_id = auth.uid()
  )
);

-- Policy: Users can create members for their own account
CREATE POLICY "Users can create members for their account"
ON members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = members.account_id
    AND user_accounts.user_id = auth.uid()
  )
);

-- Policy: Users can update members for their own account
CREATE POLICY "Users can update members for their account"
ON members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = members.account_id
    AND user_accounts.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = members.account_id
    AND user_accounts.user_id = auth.uid()
  )
);

-- Policy: Users can delete members for their own account
CREATE POLICY "Users can delete members for their account"
ON members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = members.account_id
    AND user_accounts.user_id = auth.uid()
  )
);

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
-- WHERE table_name = 'members'
-- ORDER BY ordinal_position;


