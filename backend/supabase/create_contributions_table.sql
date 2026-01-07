-- =====================================================
-- Contributions Table Creation Script
-- =====================================================
-- This script creates the contributions table in Supabase
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Create the contributions table
CREATE TABLE IF NOT EXISTS contributions (
  -- Primary Key
  contribution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES funds(fund_id) ON DELETE CASCADE,
  member_id UUID NULL REFERENCES members(member_id) ON DELETE SET NULL,
  
  -- Contribution Details
  channel TEXT NOT NULL CHECK (channel IN ('offline', 'online')),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  date_received TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by_user_id UUID NULL, -- User who received the contribution (for offline)
  
  -- Optional Fields
  comment TEXT NULL,
  payment_reference TEXT NULL, -- For online payments (transaction ID, etc.)
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'reversed')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contributions_account_id ON contributions(account_id);
CREATE INDEX IF NOT EXISTS idx_contributions_fund_id ON contributions(fund_id);
CREATE INDEX IF NOT EXISTS idx_contributions_member_id ON contributions(member_id);
CREATE INDEX IF NOT EXISTS idx_contributions_status ON contributions(status);
CREATE INDEX IF NOT EXISTS idx_contributions_date_received ON contributions(date_received DESC);
CREATE INDEX IF NOT EXISTS idx_contributions_channel ON contributions(channel);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_contributions_fund_status ON contributions(fund_id, status);
CREATE INDEX IF NOT EXISTS idx_contributions_account_status ON contributions(account_id, status);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row update
CREATE TRIGGER update_contributions_updated_at
  BEFORE UPDATE ON contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE contributions IS 'Stores all contribution records for funds';
COMMENT ON COLUMN contributions.contribution_id IS 'Primary key, auto-generated UUID';
COMMENT ON COLUMN contributions.account_id IS 'Foreign key to accounts table';
COMMENT ON COLUMN contributions.fund_id IS 'Foreign key to funds table';
COMMENT ON COLUMN contributions.member_id IS 'Foreign key to members table (nullable for anonymous contributions)';
COMMENT ON COLUMN contributions.channel IS 'Contribution channel: offline or online';
COMMENT ON COLUMN contributions.amount IS 'Contribution amount, must be greater than 0';
COMMENT ON COLUMN contributions.date_received IS 'Date and time when contribution was received';
COMMENT ON COLUMN contributions.received_by_user_id IS 'User ID who received the contribution (required for offline)';
COMMENT ON COLUMN contributions.comment IS 'Optional comment/note about the contribution';
COMMENT ON COLUMN contributions.payment_reference IS 'Payment reference/transaction ID for online payments';
COMMENT ON COLUMN contributions.status IS 'Contribution status: pending, confirmed, failed, or reversed';

-- =====================================================
-- Security: Row Level Security (RLS) Setup
-- =====================================================
-- Note: RLS is disabled for now as per requirements
-- When ready to enable, uncomment the following:

-- ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- -- Policy: Service role can do everything (backend access)
-- CREATE POLICY "Service role full access"
--   ON contributions
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
-- WHERE table_name = 'contributions'
-- ORDER BY ordinal_position;


