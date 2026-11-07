-- =====================================================
-- Fund Settlements Table Creation Script
-- =====================================================
-- Manual recording of fund payouts/settlements.
-- Settlements cannot be deleted; they can only be archived.
-- Run this in the Supabase SQL Editor.
-- =====================================================

CREATE TABLE IF NOT EXISTS fund_settlements (
  settlement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES funds(fund_id) ON DELETE RESTRICT,
  recorded_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  settlement_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'successful', 'canceled')),
  reference TEXT,
  notes TEXT,

  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fund_settlements_account_id ON fund_settlements(account_id);
CREATE INDEX IF NOT EXISTS idx_fund_settlements_fund_id ON fund_settlements(fund_id);
CREATE INDEX IF NOT EXISTS idx_fund_settlements_account_fund ON fund_settlements(account_id, fund_id);
CREATE INDEX IF NOT EXISTS idx_fund_settlements_status ON fund_settlements(account_id, status);
CREATE INDEX IF NOT EXISTS idx_fund_settlements_archived ON fund_settlements(account_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_fund_settlements_date ON fund_settlements(settlement_date DESC);

CREATE OR REPLACE FUNCTION update_fund_settlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS update_fund_settlements_updated_at ON fund_settlements;

CREATE TRIGGER update_fund_settlements_updated_at
  BEFORE UPDATE ON fund_settlements
  FOR EACH ROW
  EXECUTE FUNCTION update_fund_settlements_updated_at();

COMMENT ON TABLE fund_settlements IS 'Manual fund payout/settlement records. Cannot be deleted; archive instead.';
COMMENT ON COLUMN fund_settlements.settlement_id IS 'Primary key';
COMMENT ON COLUMN fund_settlements.account_id IS 'Foreign key to accounts table';
COMMENT ON COLUMN fund_settlements.fund_id IS 'Fund this settlement is drawn from';
COMMENT ON COLUMN fund_settlements.amount IS 'Payout amount (must be positive)';
COMMENT ON COLUMN fund_settlements.status IS 'pending, successful, or canceled';
COMMENT ON COLUMN fund_settlements.reference IS 'Optional bank/MoMo/cheque reference';
COMMENT ON COLUMN fund_settlements.is_archived IS 'Archived records are hidden from the default list';

ALTER TABLE fund_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on fund_settlements" ON fund_settlements;
CREATE POLICY "Service role full access on fund_settlements"
ON fund_settlements
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read fund settlements for their account" ON fund_settlements;
CREATE POLICY "Users can read fund settlements for their account"
ON fund_settlements
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = fund_settlements.account_id
    AND user_accounts.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can create fund settlements for their account" ON fund_settlements;
CREATE POLICY "Users can create fund settlements for their account"
ON fund_settlements
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = fund_settlements.account_id
    AND user_accounts.user_id = (SELECT auth.uid())
  )
  AND recorded_by_user_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "Users can update fund settlements for their account" ON fund_settlements;
CREATE POLICY "Users can update fund settlements for their account"
ON fund_settlements
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = fund_settlements.account_id
    AND user_accounts.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = fund_settlements.account_id
    AND user_accounts.user_id = (SELECT auth.uid())
  )
);

-- No DELETE policy: settlements cannot be deleted, only archived.
