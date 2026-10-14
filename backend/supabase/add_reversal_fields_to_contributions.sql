-- =====================================================
-- Record why a confirmed contribution was reversed
-- =====================================================
-- Confirmed contributions are never deleted. Reverse them:
-- status becomes 'reversed', and these columns keep the reason
-- and who did it. Reversed rows stay on the ledger.
-- Run this if the contributions table already exists.
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contributions'
      AND column_name = 'reversal_reason'
  ) THEN
    ALTER TABLE contributions ADD COLUMN reversal_reason TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contributions'
      AND column_name = 'reversed_at'
  ) THEN
    ALTER TABLE contributions ADD COLUMN reversed_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contributions'
      AND column_name = 'reversed_by_user_id'
  ) THEN
    ALTER TABLE contributions
      ADD COLUMN reversed_by_user_id UUID NULL REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN contributions.reversal_reason IS 'Why a confirmed contribution was reversed. Required when status is reversed.';
COMMENT ON COLUMN contributions.reversed_at IS 'When a confirmed contribution was reversed.';
COMMENT ON COLUMN contributions.reversed_by_user_id IS 'User who reversed a confirmed contribution.';
