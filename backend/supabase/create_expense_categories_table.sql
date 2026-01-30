-- =====================================================
-- Expense Categories Table Creation Script
-- =====================================================
-- This script creates the expense_categories table in Supabase
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Create the expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  -- Primary Key
  category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Category Details
  category_name TEXT NOT NULL UNIQUE,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expense_categories_name ON expense_categories(category_name);
CREATE INDEX IF NOT EXISTS idx_expense_categories_is_active ON expense_categories(is_active);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_expense_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = pg_catalog, public;

-- Create trigger to update updated_at on row update
DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON expense_categories;
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_expense_categories_updated_at();

-- =====================================================
-- Insert Expense Categories
-- =====================================================

INSERT INTO expense_categories (category_name) VALUES
('Administrative'),
('Bank Charges'),
('Building & Maintenance'),
('Catering & Food'),
('Communication'),
('Education & Training'),
('Equipment'),
('Events'),
('Financial Services'),
('Health & Medical'),
('Insurance'),
('Legal & Professional'),
('Marketing & Advertising'),
('Membership Fees'),
('Miscellaneous'),
('Operations'),
('Rent & Utilities'),
('Savings & Investments'),
('Supplies'),
('Technology & IT'),
('Transportation'),
('Travel'),
('Utilities'),
('Other Expenses')
ON CONFLICT (category_name) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE expense_categories IS 'Predefined expense categories for organizing expenses';
COMMENT ON COLUMN expense_categories.category_id IS 'Primary key, auto-generated UUID';
COMMENT ON COLUMN expense_categories.category_name IS 'Name of the expense category';
COMMENT ON COLUMN expense_categories.is_active IS 'Whether this category is currently active and available for use';

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on the table
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read active expense categories
DROP POLICY IF EXISTS "Users can read active expense categories" ON expense_categories;
CREATE POLICY "Users can read active expense categories"
ON expense_categories
FOR SELECT
TO authenticated
USING (is_active = true);

-- Policy: Service role has full access (for backend management)
DROP POLICY IF EXISTS "Service role full access on expense categories" ON expense_categories;
CREATE POLICY "Service role full access on expense categories"
ON expense_categories
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
