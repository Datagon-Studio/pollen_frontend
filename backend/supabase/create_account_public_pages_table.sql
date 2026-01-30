-- =====================================================
-- Account Public Pages Table Creation Script
-- =====================================================
-- This script creates the account_public_pages table in Supabase
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Create the account_public_pages table
CREATE TABLE IF NOT EXISTS account_public_pages (
  -- Primary Key
  public_page_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  
  -- Public Page Details
  url_slug TEXT NULL UNIQUE, -- Unique slug for public URL
  display_name TEXT NULL,
  logo_url TEXT NULL,
  primary_color TEXT NULL,
  secondary_color TEXT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one public page per account
  UNIQUE(account_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_account_public_pages_account_id ON account_public_pages(account_id);
CREATE INDEX IF NOT EXISTS idx_account_public_pages_url_slug ON account_public_pages(url_slug);
CREATE INDEX IF NOT EXISTS idx_account_public_pages_is_published ON account_public_pages(is_published);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_account_public_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = pg_catalog, public;

-- Create trigger to update updated_at on row update
DROP TRIGGER IF EXISTS update_account_public_pages_updated_at ON account_public_pages;
CREATE TRIGGER update_account_public_pages_updated_at
  BEFORE UPDATE ON account_public_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_account_public_pages_updated_at();

-- Create function to automatically create public page when account is created
CREATE OR REPLACE FUNCTION public.handle_new_account_public_page()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.account_public_pages (
    account_id,
    url_slug,
    display_name,
    logo_url,
    primary_color,
    secondary_color,
    is_published
  )
  VALUES (
    NEW.account_id,
    NULL, -- Will be set later
    NEW.account_name, -- Use account name as default display name
    NULL, -- Logo will be set later
    NULL, -- Colors will be set later
    NULL,
    false -- Not published by default
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = pg_catalog, public;

-- Create trigger to automatically create public page when account is created
DROP TRIGGER IF EXISTS on_account_created_public_page ON public.accounts;
CREATE TRIGGER on_account_created_public_page
  AFTER INSERT ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_account_public_page();

-- Add comments for documentation
COMMENT ON TABLE account_public_pages IS 'Stores public-facing page configuration for accounts';
COMMENT ON COLUMN account_public_pages.public_page_id IS 'Primary key, auto-generated UUID';
COMMENT ON COLUMN account_public_pages.account_id IS 'Foreign key to accounts table';
COMMENT ON COLUMN account_public_pages.url_slug IS 'Unique URL slug for the public page';
COMMENT ON COLUMN account_public_pages.display_name IS 'Display name for the public page';
COMMENT ON COLUMN account_public_pages.logo_url IS 'URL to the public page logo';
COMMENT ON COLUMN account_public_pages.primary_color IS 'Primary color (hex) for public page customization';
COMMENT ON COLUMN account_public_pages.secondary_color IS 'Secondary color (hex) for public page customization';
COMMENT ON COLUMN account_public_pages.is_published IS 'Whether the public page is published and accessible';

-- =====================================================
-- Security: Row Level Security (RLS) Setup
-- =====================================================

-- Enable RLS
ALTER TABLE account_public_pages ENABLE ROW LEVEL SECURITY;

-- Policy: Service role (backend) can do everything
DROP POLICY IF EXISTS "Service role full access on account_public_pages" ON account_public_pages;
CREATE POLICY "Service role full access on account_public_pages"
ON account_public_pages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Public read access for published pages
DROP POLICY IF EXISTS "Public can read published pages" ON account_public_pages;
CREATE POLICY "Public can read published pages"
ON account_public_pages
FOR SELECT
TO public
USING (is_published = true);

-- Policy: Users can read their own account public page
DROP POLICY IF EXISTS "Users can read their own account public page" ON account_public_pages;
CREATE POLICY "Users can read their own account public page"
ON account_public_pages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = account_public_pages.account_id
    AND user_accounts.user_id = auth.uid()
  )
);

-- Policy: Users can update their own account public page
DROP POLICY IF EXISTS "Users can update their own account public page" ON account_public_pages;
CREATE POLICY "Users can update their own account public page"
ON account_public_pages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = account_public_pages.account_id
    AND user_accounts.user_id = auth.uid()
    AND user_accounts.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = account_public_pages.account_id
    AND user_accounts.user_id = auth.uid()
    AND user_accounts.role = 'admin'
  )
);

-- Policy: Public page creation is ONLY allowed via service_role (backend/trigger)
-- SECURITY DEFINER trigger bypasses RLS, so no authenticated policy needed
-- This prevents clients from creating arbitrary public pages
DROP POLICY IF EXISTS "Allow public page creation" ON account_public_pages;
