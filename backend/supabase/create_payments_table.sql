-- =====================================================
-- Payments table
-- First-class Paystack ledger. A row is created as pending on initialize
-- and updated by webhook, verify, scheduled reconciliation, or admin verify.
-- Contributions remain the confirmed money ledger; this table tracks the
-- payment attempt independently so paid-but-unrecorded txs are visible.
-- Run this in the Supabase SQL Editor.
-- =====================================================

CREATE TABLE IF NOT EXISTS payments (
  payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  reference TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES funds(fund_id) ON DELETE RESTRICT,
  member_id UUID NULL REFERENCES members(member_id) ON DELETE SET NULL,
  contribution_id UUID NULL REFERENCES contributions(contribution_id) ON DELETE SET NULL,

  user_email TEXT NOT NULL,
  contributor_name TEXT NOT NULL,
  phone TEXT NULL,

  contribution_amount NUMERIC(14, 2) NOT NULL CHECK (contribution_amount > 0),
  fee_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  charged_amount NUMERIC(14, 2) NOT NULL CHECK (charged_amount > 0),
  currency TEXT NOT NULL DEFAULT 'GHS',

  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'successful', 'failed', 'abandoned', 'needs_review')
  ),
  paystack_status TEXT NULL,
  paid_at TIMESTAMPTZ NULL,
  webhook_received_at TIMESTAMPTZ NULL,
  last_verified_at TIMESTAMPTZ NULL,
  verification_attempts INTEGER NOT NULL DEFAULT 0 CHECK (verification_attempts >= 0),
  last_error TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_reference_unique
  ON payments(reference);

CREATE INDEX IF NOT EXISTS idx_payments_status_created_at
  ON payments(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_account_id
  ON payments(account_id);

CREATE INDEX IF NOT EXISTS idx_payments_fund_id
  ON payments(fund_id);

CREATE INDEX IF NOT EXISTS idx_payments_contribution_id
  ON payments(contribution_id)
  WHERE contribution_id IS NOT NULL;

CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

COMMENT ON TABLE payments IS 'Paystack payment attempts. Pending on initialize; fulfilled independently of the contributions ledger.';
COMMENT ON COLUMN payments.reference IS 'Unique Paystack transaction reference';
COMMENT ON COLUMN payments.status IS 'Application status: pending, successful, failed, abandoned, or needs_review';
COMMENT ON COLUMN payments.paystack_status IS 'Last verified Paystack data.status';
COMMENT ON COLUMN payments.charged_amount IS 'Amount charged to the customer including fees';
COMMENT ON COLUMN payments.contribution_amount IS 'Amount credited to the fund after fees';

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on payments" ON payments;
CREATE POLICY "Service role full access on payments"
ON payments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read payments for their account" ON payments;
CREATE POLICY "Users can read payments for their account"
ON payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = payments.account_id
    AND user_accounts.user_id = (SELECT auth.uid())
  )
);
