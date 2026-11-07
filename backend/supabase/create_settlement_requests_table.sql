-- =====================================================
-- Settlement requests
-- A group manager asks Pollean to settle collected funds for a fund.
-- Destination is snapshotted from the active payout details at create time.
-- Run this in the Supabase SQL Editor.
-- =====================================================

CREATE TABLE IF NOT EXISTS settlement_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES funds(fund_id) ON DELETE RESTRICT,
  requested_by_user_id UUID NOT NULL REFERENCES users(user_id),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disbursed')),
  request_note TEXT NULL,
  admin_note TEXT NULL,
  destination_type TEXT NOT NULL CHECK (destination_type IN ('bank', 'mobile_money')),
  destination_account_name TEXT NOT NULL,
  destination_account_number TEXT NOT NULL,
  destination_bank_name TEXT NULL,
  destination_bank_branch TEXT NULL,
  destination_provider TEXT NULL,
  reviewed_by_user_id UUID NULL REFERENCES users(user_id),
  reviewed_at TIMESTAMPTZ NULL,
  disbursed_at TIMESTAMPTZ NULL,
  disbursement_reference TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_settlement_requests_one_pending_per_fund
ON settlement_requests(fund_id)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_settlement_requests_account_id ON settlement_requests(account_id);
CREATE INDEX IF NOT EXISTS idx_settlement_requests_fund_id ON settlement_requests(fund_id);
CREATE INDEX IF NOT EXISTS idx_settlement_requests_status ON settlement_requests(status);
CREATE INDEX IF NOT EXISTS idx_settlement_requests_created_at ON settlement_requests(created_at DESC);

CREATE TABLE IF NOT EXISTS settlement_request_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES settlement_requests(request_id) ON DELETE CASCADE,
  previous_status TEXT NULL CHECK (
    previous_status IS NULL OR previous_status IN ('pending', 'approved', 'rejected', 'disbursed')
  ),
  new_status TEXT NOT NULL CHECK (new_status IN ('pending', 'approved', 'rejected', 'disbursed')),
  changed_by_user_id UUID NOT NULL REFERENCES users(user_id),
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlement_request_history_request_id
ON settlement_request_history(request_id, created_at);

CREATE OR REPLACE FUNCTION update_settlement_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS update_settlement_requests_updated_at ON settlement_requests;
CREATE TRIGGER update_settlement_requests_updated_at
  BEFORE UPDATE ON settlement_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_settlement_requests_updated_at();

ALTER TABLE settlement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_request_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on settlement requests" ON settlement_requests;
CREATE POLICY "Service role full access on settlement requests"
ON settlement_requests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on settlement request history" ON settlement_request_history;
CREATE POLICY "Service role full access on settlement request history"
ON settlement_request_history
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Managers can read their settlement requests" ON settlement_requests;
CREATE POLICY "Managers can read their settlement requests"
ON settlement_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = settlement_requests.account_id
    AND user_accounts.user_id = (SELECT auth.uid())
    AND user_accounts.role = 'admin'
  )
);
