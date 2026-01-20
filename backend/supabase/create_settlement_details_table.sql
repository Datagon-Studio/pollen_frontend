-- =====================================================
-- Account Settlement Details Table Creation Script
-- =====================================================
-- This script creates the account_settlement_details table in Supabase
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Create the account_settlement_details table
CREATE TABLE IF NOT EXISTS account_settlement_details (
  -- Primary Key
  settlement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  
  -- Settlement Type
  settlement_type TEXT NOT NULL CHECK (settlement_type IN ('bank', 'mobile_money')),
  
  -- Account Details
  -- For bank: account_name = name on bank account, account_number = bank account number
  -- For mobile_money: account_name = name on MoMo, account_number = MoMo number
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  
  -- Bank-specific fields (only for bank settlement_type)
  bank_name TEXT NULL,
  bank_branch TEXT NULL,
  
  -- Provider (required for mobile_money, optional for bank)
  -- Examples: MTN Mobile Money, Vodafone Cash, AirtelTigo Money, etc.
  provider TEXT NULL,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  
  -- Note: We use a partial unique index below instead of a constraint
  -- This allows multiple inactive settlements but only one active per account
);

-- Create partial unique index to allow only one active settlement per account
-- This allows multiple inactive settlements but only one active
CREATE UNIQUE INDEX IF NOT EXISTS idx_settlement_details_one_active_per_account
ON account_settlement_details(account_id)
WHERE is_active = true;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_settlement_details_account_id ON account_settlement_details(account_id);
CREATE INDEX IF NOT EXISTS idx_settlement_details_settlement_type ON account_settlement_details(settlement_type);
CREATE INDEX IF NOT EXISTS idx_settlement_details_is_active ON account_settlement_details(is_active);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_settlement_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row update
DROP TRIGGER IF EXISTS update_settlement_details_updated_at ON account_settlement_details;
CREATE TRIGGER update_settlement_details_updated_at
  BEFORE UPDATE ON account_settlement_details
  FOR EACH ROW
  EXECUTE FUNCTION update_settlement_details_updated_at();

-- Add comments for documentation
COMMENT ON TABLE account_settlement_details IS 'Stores settlement account details where online contributions are sent';
COMMENT ON COLUMN account_settlement_details.settlement_id IS 'Primary key, auto-generated UUID';
COMMENT ON COLUMN account_settlement_details.account_id IS 'Foreign key to accounts table';
COMMENT ON COLUMN account_settlement_details.settlement_type IS 'Type of settlement: bank or mobile_money';
COMMENT ON COLUMN account_settlement_details.account_name IS 'Name on account (bank account holder name or MoMo account name)';
COMMENT ON COLUMN account_settlement_details.account_number IS 'Account number (bank account number or MoMo number)';
COMMENT ON COLUMN account_settlement_details.bank_name IS 'Bank name (only for bank settlement_type)';
COMMENT ON COLUMN account_settlement_details.bank_branch IS 'Bank branch (only for bank settlement_type)';
COMMENT ON COLUMN account_settlement_details.provider IS 'Provider/service name (required for mobile_money: MTN, Vodafone, AirtelTigo, etc.)';
COMMENT ON COLUMN account_settlement_details.is_active IS 'Whether this is the active settlement account for receiving funds';

-- =====================================================
-- Security: Row Level Security (RLS) Setup
-- =====================================================

ALTER TABLE account_settlement_details ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for account_settlement_details table
-- =====================================================

-- Policy: Service role (backend) can do everything
CREATE POLICY "Service role full access on settlement details"
ON account_settlement_details
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can read settlement details for their own account
CREATE POLICY "Users can read settlement details for their account"
ON account_settlement_details
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = account_settlement_details.account_id
    AND user_accounts.user_id = auth.uid()
  )
);

-- Policy: Users can create settlement details for their own account
CREATE POLICY "Users can create settlement details for their account"
ON account_settlement_details
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = account_settlement_details.account_id
    AND user_accounts.user_id = auth.uid()
  )
);

-- Policy: Users can update settlement details for their own account
CREATE POLICY "Users can update settlement details for their account"
ON account_settlement_details
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = account_settlement_details.account_id
    AND user_accounts.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = account_settlement_details.account_id
    AND user_accounts.user_id = auth.uid()
  )
);

-- Policy: Users can delete settlement details for their own account
CREATE POLICY "Users can delete settlement details for their account"
ON account_settlement_details
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = account_settlement_details.account_id
    AND user_accounts.user_id = auth.uid()
  )
);
