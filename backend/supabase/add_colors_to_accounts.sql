-- =====================================================
-- Add Color Fields to Accounts Table
-- =====================================================
-- This script adds foreground_color and background_color fields to the accounts table
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Add foreground_color column
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS foreground_color TEXT NULL;

-- Add background_color column
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS background_color TEXT NULL;

-- Add comments for documentation
COMMENT ON COLUMN accounts.foreground_color IS 'Foreground color (hex) for public page customization';
COMMENT ON COLUMN accounts.background_color IS 'Background color (hex) for public page customization';
