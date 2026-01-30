-- Add roles support to users and user_accounts tables
-- This migration adds superadmin role support and updates role constraints

-- Update users table to support superadmin role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('superadmin', 'admin', 'user'));

-- Update default role in trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    'admin', -- Default to admin (not superadmin for security)
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = pg_catalog, public;

-- Update user_accounts table to support officer role
ALTER TABLE user_accounts DROP CONSTRAINT IF EXISTS user_accounts_role_check;
ALTER TABLE user_accounts ADD CONSTRAINT user_accounts_role_check CHECK (role IN ('admin', 'officer', 'viewer'));

-- Update comments
COMMENT ON COLUMN users.role IS 'Platform-level role: superadmin (platform admin), admin (account admin), or user (basic user)';
COMMENT ON COLUMN user_accounts.role IS 'Account-level role: admin (account owner/admin), officer (collector), or viewer (read-only)';
