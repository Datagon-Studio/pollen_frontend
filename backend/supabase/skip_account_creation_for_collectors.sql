-- =====================================================
-- Skip auto-account creation for invited collectors
-- =====================================================
-- When createUser is called with user_metadata.skip_account_creation = 'true',
-- do not create an empty personal admin account. Collectors are linked only
-- to the inviting group account.
-- Run this in the Supabase SQL Editor.
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_account()
RETURNS TRIGGER AS $$
DECLARE
  new_account_id UUID;
  skip_creation TEXT;
BEGIN
  -- Check auth.users metadata set by collector invite flow
  SELECT raw_user_meta_data->>'skip_account_creation'
  INTO skip_creation
  FROM auth.users
  WHERE id = NEW.user_id;

  IF skip_creation = 'true' THEN
    RETURN NEW;
  END IF;

  -- Create a new account with just the ID (no name, no logo)
  INSERT INTO public.accounts (account_id, account_name, account_logo, kyc_status, status)
  VALUES (
    gen_random_uuid(),
    NULL,
    NULL,
    'unverified',
    'active'
  )
  RETURNING account_id INTO new_account_id;

  -- Link the user to the account as admin
  INSERT INTO public.user_accounts (user_id, account_id, role)
  VALUES (
    NEW.user_id,
    new_account_id,
    'admin'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public;
