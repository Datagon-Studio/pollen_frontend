-- =====================================================
-- Add Bank Name and Bank Branch Fields to Settlement Details
-- =====================================================
-- This script adds bank_name and bank_branch columns to existing
-- account_settlement_details table
-- Run this in the Supabase SQL Editor if the table already exists
-- =====================================================

-- Add bank_name column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'account_settlement_details' 
    AND column_name = 'bank_name'
  ) THEN
    ALTER TABLE account_settlement_details 
    ADD COLUMN bank_name TEXT NULL;
  END IF;
END $$;

-- Add bank_branch column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'account_settlement_details' 
    AND column_name = 'bank_branch'
  ) THEN
    ALTER TABLE account_settlement_details 
    ADD COLUMN bank_branch TEXT NULL;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN account_settlement_details.bank_name IS 'Bank name (only for bank settlement_type)';
COMMENT ON COLUMN account_settlement_details.bank_branch IS 'Bank branch (only for bank settlement_type)';
