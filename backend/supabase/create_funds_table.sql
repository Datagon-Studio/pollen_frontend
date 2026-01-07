-- =====================================================
-- Funds Table Creation Script
-- =====================================================
-- This script creates the funds table in Supabase
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Create the funds table
CREATE TABLE IF NOT EXISTS funds (
  -- Primary Key
  fund_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  
  -- Fund Details
  fund_name TEXT NOT NULL,
  description TEXT,
  default_amount NUMERIC(10, 2) NULL,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_funds_account_id ON funds(account_id);
CREATE INDEX IF NOT EXISTS idx_funds_is_active ON funds(is_active);
CREATE INDEX IF NOT EXISTS idx_funds_created_at ON funds(created_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_funds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS update_funds_updated_at ON funds;

-- Create trigger to update updated_at on row update
CREATE TRIGGER update_funds_updated_at
  BEFORE UPDATE ON funds
  FOR EACH ROW
  EXECUTE FUNCTION update_funds_updated_at();

-- Add comments for documentation
COMMENT ON TABLE funds IS 'Funds associated with accounts';
COMMENT ON COLUMN funds.fund_id IS 'Primary key';
COMMENT ON COLUMN funds.account_id IS 'Foreign key to accounts table';
COMMENT ON COLUMN funds.fund_name IS 'Name of the fund';
COMMENT ON COLUMN funds.description IS 'Description of the fund';
COMMENT ON COLUMN funds.default_amount IS 'Default contribution amount (nullable)';
COMMENT ON COLUMN funds.is_active IS 'Whether the fund is currently active';

-- =====================================================
-- Security: Row Level Security (RLS) Setup
-- =====================================================

ALTER TABLE funds ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for funds table
-- =====================================================

-- Policy: Service role (backend) can do everything
CREATE POLICY "Service role full access on funds"
ON funds
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can read funds for their own account
CREATE POLICY "Users can read funds for their account"
ON funds
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = funds.account_id
    AND user_accounts.user_id = auth.uid()
  )
);

-- Policy: Users can create funds for their own account
CREATE POLICY "Users can create funds for their account"
ON funds
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = funds.account_id
    AND user_accounts.user_id = auth.uid()
  )
);

-- Policy: Users can update funds for their own account
CREATE POLICY "Users can update funds for their account"
ON funds
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = funds.account_id
    AND user_accounts.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = funds.account_id
    AND user_accounts.user_id = auth.uid()
  )
);

-- Policy: Users can delete funds for their own account
CREATE POLICY "Users can delete funds for their account"
ON funds
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = funds.account_id
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
-- WHERE table_name = 'funds'
-- ORDER BY ordinal_position;

