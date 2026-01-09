-- =====================================================
-- Add is_public column to funds table
-- =====================================================
-- This script adds the is_public field to the funds table
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Add is_public column
ALTER TABLE funds 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_funds_is_public ON funds(is_public);

-- Add comment for documentation
COMMENT ON COLUMN funds.is_public IS 'Whether the fund appears on public pages (only public funds are shown on public pages)';

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
-- WHERE table_name = 'funds' AND column_name = 'is_public';
