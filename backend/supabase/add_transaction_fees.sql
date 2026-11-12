-- =====================================================
-- Transaction fees: global default + per-account override
-- =====================================================
-- Global rate lives in platform_settings.
-- Account overrides live on config.transaction_fee_rate (NULL = use global).
-- Rates are stored as decimals (0.02 = 2%).
-- =====================================================

CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NULL
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on platform_settings" ON platform_settings;
CREATE POLICY "Service role full access on platform_settings"
ON platform_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

INSERT INTO platform_settings (setting_key, setting_value)
VALUES ('transaction_fee_rate', '0.02'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

ALTER TABLE config
  ADD COLUMN IF NOT EXISTS transaction_fee_rate NUMERIC(7, 4) NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'config_transaction_fee_rate_check'
  ) THEN
    ALTER TABLE config
      ADD CONSTRAINT config_transaction_fee_rate_check
      CHECK (
        transaction_fee_rate IS NULL
        OR (transaction_fee_rate >= 0 AND transaction_fee_rate <= 1)
      );
  END IF;
END $$;

COMMENT ON COLUMN config.transaction_fee_rate IS
  'Optional account override for online contribution fee rate (0.02 = 2%). NULL inherits platform default.';

COMMENT ON TABLE platform_settings IS
  'Platform-wide key/value settings managed by system admins';
