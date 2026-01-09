/**
 * Expense Entity Types
 * 
 * Defines TypeScript types only.
 * No Supabase, no business logic, no HTTP logic.
 */

export interface Expense {
  expense_id: string;
  account_id: string;
  expense_name: string;
  expense_category: string;
  date: string;
  amount: number;
  created_by_user_id: string;
  notes: string | null;
  member_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseInput {
  account_id: string;
  expense_name: string;
  expense_category: string;
  date: string;
  amount: number;
  created_by_user_id: string;
  notes?: string | null;
  member_visible?: boolean;
}

export interface UpdateExpenseInput {
  expense_name?: string;
  expense_category?: string;
  date?: string;
  amount?: number;
  notes?: string | null;
  member_visible?: boolean;
}


