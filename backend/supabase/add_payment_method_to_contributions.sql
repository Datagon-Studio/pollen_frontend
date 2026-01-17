-- =====================================================
-- Add payment_method column to contributions table
-- =====================================================
-- Run this migration if the contributions table already exists
-- =====================================================

-- Add payment_method column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contributions' 
    AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE contributions 
    ADD COLUMN payment_method TEXT NULL;
    
    COMMENT ON COLUMN contributions.payment_method IS 'Payment method: Cash, Bank Deposit, Cheque, Mobile Money, Bank Transfer, etc.';
  END IF;
END $$;
