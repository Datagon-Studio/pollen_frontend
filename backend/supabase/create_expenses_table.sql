-- =====================================================
-- Expenses Table Creation Script
-- =====================================================
-- This script creates the expenses table in Supabase
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Create the expenses table
CREATE TABLE IF NOT EXISTS expenses (
  -- Primary Key
  expense_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  
  -- Expense Details
  expense_name TEXT NOT NULL,
  expense_category TEXT NOT NULL,
  date DATE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  
  -- Visibility
  member_visible BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_account_id ON expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by_user_id ON expenses(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(expense_category);
CREATE INDEX IF NOT EXISTS idx_expenses_member_visible ON expenses(member_visible);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;

-- Create trigger to update updated_at on row update
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expenses_updated_at();

-- Add comments for documentation
COMMENT ON TABLE expenses IS 'Expenses associated with accounts';
COMMENT ON COLUMN expenses.expense_id IS 'Primary key';
COMMENT ON COLUMN expenses.account_id IS 'Foreign key to accounts table';
COMMENT ON COLUMN expenses.created_by_user_id IS 'Foreign key to auth.users - user who created the expense';
COMMENT ON COLUMN expenses.expense_name IS 'Name/description of the expense';
COMMENT ON COLUMN expenses.expense_category IS 'Category of the expense';
COMMENT ON COLUMN expenses.date IS 'Date when the expense occurred';
COMMENT ON COLUMN expenses.amount IS 'Amount of the expense (must be positive)';
COMMENT ON COLUMN expenses.notes IS 'Additional notes about the expense';
COMMENT ON COLUMN expenses.member_visible IS 'Whether the expense is visible to members';

-- =====================================================
-- Security: Row Level Security (RLS) Setup
-- =====================================================

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for expenses table
-- =====================================================

-- Policy: Service role (backend) can do everything
CREATE POLICY "Service role full access on expenses"
ON expenses
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can read expenses for their own account
CREATE POLICY "Users can read expenses for their account"
ON expenses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = expenses.account_id
    AND user_accounts.user_id = auth.uid()
  )
);

-- Policy: Users can create expenses for their own account
CREATE POLICY "Users can create expenses for their account"
ON expenses
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = expenses.account_id
    AND user_accounts.user_id = auth.uid()
  )
  AND created_by_user_id = auth.uid()
);

-- Policy: Users can update expenses for their own account
CREATE POLICY "Users can update expenses for their account"
ON expenses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = expenses.account_id
    AND user_accounts.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = expenses.account_id
    AND user_accounts.user_id = auth.uid()
  )
);

-- Policy: Users can delete expenses for their own account
CREATE POLICY "Users can delete expenses for their account"
ON expenses
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_accounts.account_id = expenses.account_id
    AND user_accounts.user_id = auth.uid()
  )
);

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the table was created correctly:
-- SELECT 
--   table_name,
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'expenses'
-- ORDER BY ordinal_position;


