-- =====================================================
-- Configuration Table Creation Script
-- =====================================================
-- This script creates the configuration table in Supabase
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Create the configuration table
CREATE TABLE IF NOT EXISTS config (
  -- Primary Key
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  
  -- Email/SMTP Configuration
  smtp_profile_id TEXT NULL,
  default_email_sender_id TEXT NULL, -- Visible to superadmins only
  
  -- Payment Integration
  payment_integration_id TEXT NULL,
  
  -- Notification Settings
  birthday_messages_enabled BOOLEAN NOT NULL DEFAULT false,
  default_notification_channel TEXT NOT NULL DEFAULT 'both' CHECK (default_notification_channel IN ('sms', 'email', 'both')),
  
  -- Templates
  sms_template TEXT NULL,
  email_template TEXT NULL,
  
  -- Portal Settings
  member_portal_enabled BOOLEAN NOT NULL DEFAULT true, -- Always true, cannot be disabled
  
  -- Expense Visibility
  expense_visibility_level TEXT NOT NULL DEFAULT 'summary' CHECK (expense_visibility_level IN ('none', 'summary', 'detailed')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one config per account
  UNIQUE(account_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_config_account_id ON config(account_id);
CREATE INDEX IF NOT EXISTS idx_config_member_portal_enabled ON config(member_portal_enabled);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = pg_catalog, public;

-- Create trigger to update updated_at on row update
DROP TRIGGER IF EXISTS update_config_updated_at ON config;
CREATE TRIGGER update_config_updated_at
  BEFORE UPDATE ON config
  FOR EACH ROW
  EXECUTE FUNCTION update_config_updated_at();

-- Create function to automatically create config when account is created
CREATE OR REPLACE FUNCTION public.handle_new_account_config()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.config (
    account_id,
    birthday_messages_enabled,
    default_notification_channel,
    member_portal_enabled,
    expense_visibility_level
  )
  VALUES (
    NEW.account_id,
    false,
    'both',
    true, -- Always true
    'summary'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = pg_catalog, public;

-- Create trigger to automatically create config when account is created
DROP TRIGGER IF EXISTS on_account_created_config ON public.accounts;
CREATE TRIGGER on_account_created_config
  AFTER INSERT ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_account_config();

-- Add comments for documentation
COMMENT ON TABLE config IS 'Stores account-level configuration settings';
COMMENT ON COLUMN config.config_id IS 'Primary key, auto-generated UUID';
COMMENT ON COLUMN config.account_id IS 'Foreign key to accounts table';
COMMENT ON COLUMN config.smtp_profile_id IS 'SMTP profile identifier';
COMMENT ON COLUMN config.default_email_sender_id IS 'Default email sender ID (visible to superadmins only)';
COMMENT ON COLUMN config.payment_integration_id IS 'Payment integration identifier';
COMMENT ON COLUMN config.birthday_messages_enabled IS 'Enable birthday messages to members';
COMMENT ON COLUMN config.default_notification_channel IS 'Default notification channel: sms, email, or both';
COMMENT ON COLUMN config.sms_template IS 'SMS notification template';
COMMENT ON COLUMN config.email_template IS 'Email notification template';
COMMENT ON COLUMN config.member_portal_enabled IS 'Enable member portal (always true)';
COMMENT ON COLUMN config.expense_visibility_level IS 'Expense visibility level: none, summary, or detailed';

-- =====================================================
-- Security: Row Level Security (RLS) Setup
-- =====================================================

-- Enable RLS
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Policy: Service role (backend) can do everything
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Service role full access on config" ON config;

CREATE POLICY "Service role full access on config"
ON config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can read their own account config
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can read their own account config" ON config;

CREATE POLICY "Users can read their own account config"
ON config
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = config.account_id
    AND user_accounts.user_id = (SELECT auth.uid())
  )
);

-- Policy: Users can update their own account config
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can update their own account config" ON config;

CREATE POLICY "Users can update their own account config"
ON config
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = config.account_id
    AND user_accounts.user_id = (SELECT auth.uid())
    AND user_accounts.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = config.account_id
    AND user_accounts.user_id = (SELECT auth.uid())
    AND user_accounts.role = 'admin'
  )
  -- Ensure member_portal_enabled is always true (column name refers to NEW value in WITH CHECK)
  AND member_portal_enabled = true
);

-- Policy: Config creation is ONLY allowed via service_role (backend/trigger)
-- SECURITY DEFINER trigger bypasses RLS, so no authenticated policy needed
-- This prevents clients from creating arbitrary config entries
DROP POLICY IF EXISTS "Allow config creation" ON config;
