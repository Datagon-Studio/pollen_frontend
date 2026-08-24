-- =====================================================
-- Audit Logs Table
-- =====================================================
-- Tracks important system actions for debugging and compliance.
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  action_category TEXT NOT NULL CHECK (
    action_category IN ('AUTH', 'MEMBER', 'CONTRIBUTION', 'FUND', 'EXPENSE', 'ACCOUNT', 'PAYMENT', 'SYSTEM')
  ),
  user_id UUID NULL REFERENCES users(user_id) ON DELETE SET NULL,
  account_id UUID NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  entity_type TEXT NULL,
  entity_id TEXT NULL,
  action_details JSONB NULL,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'error')),
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_account_id ON audit_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_category ON audit_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_account_created ON audit_logs(account_id, created_at DESC);

COMMENT ON TABLE audit_logs IS 'Audit trail for auth, payments, contributions, and system events';

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on audit_logs" ON audit_logs;
CREATE POLICY "Service role full access on audit_logs"
ON audit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Optional: unique payment references prevent duplicate Paystack recordings
CREATE UNIQUE INDEX IF NOT EXISTS idx_contributions_payment_reference_unique
ON contributions(payment_reference)
WHERE payment_reference IS NOT NULL;
