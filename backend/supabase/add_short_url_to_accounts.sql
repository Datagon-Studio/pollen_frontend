-- =====================================================
-- Add short_url column to accounts table
-- =====================================================
-- Bitly-shortened public group page URL; created once and
-- reused in welcome SMS.
-- Run this in the Supabase SQL Editor
-- =====================================================

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS short_url TEXT NULL;

COMMENT ON COLUMN accounts.short_url IS
  'Bitly-shortened public group page URL; created once and reused in welcome SMS';

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
-- WHERE table_name = 'accounts' AND column_name = 'short_url';
