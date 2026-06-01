-- =====================================================
-- Add Theme Customization Fields to Account Public Pages
-- =====================================================
-- Run this in the Supabase SQL Editor
-- =====================================================

ALTER TABLE account_public_pages 
ADD COLUMN IF NOT EXISTS use_custom_theme BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_primary_color TEXT NULL,
ADD COLUMN IF NOT EXISTS custom_secondary_light_color TEXT NULL,
ADD COLUMN IF NOT EXISTS custom_background_light_color TEXT NULL,
ADD COLUMN IF NOT EXISTS custom_secondary_dark_color TEXT NULL,
ADD COLUMN IF NOT EXISTS custom_background_dark_color TEXT NULL;

-- Add comments for documentation
COMMENT ON COLUMN account_public_pages.use_custom_theme IS 'Whether to use custom branding colors instead of the site-wide default';
COMMENT ON COLUMN account_public_pages.custom_primary_color IS 'Custom primary color (hex) for public pages';
COMMENT ON COLUMN account_public_pages.custom_secondary_light_color IS 'Custom secondary color for light theme (hex) for public pages';
COMMENT ON COLUMN account_public_pages.custom_background_light_color IS 'Custom background color for light theme (hex) for public pages';
COMMENT ON COLUMN account_public_pages.custom_secondary_dark_color IS 'Custom secondary color for dark theme (hex) for public pages';
COMMENT ON COLUMN account_public_pages.custom_background_dark_color IS 'Custom background color for dark theme (hex) for public pages';
