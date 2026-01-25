-- =====================================================
-- Add fund_goal column to funds table
-- =====================================================
-- This script adds the fund_goal field to the funds table
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Add fund_goal column (nullable)
ALTER TABLE funds 
ADD COLUMN IF NOT EXISTS fund_goal NUMERIC(10, 2) NULL;

-- Add comment for documentation
COMMENT ON COLUMN funds.fund_goal IS 'Target goal amount for the fund (nullable)';

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the column was added correctly:
-- SELECT 
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'funds' AND column_name = 'fund_goal';
