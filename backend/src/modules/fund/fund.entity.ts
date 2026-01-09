/**
 * Fund Entity Types
 * 
 * Defines TypeScript types only.
 * No Supabase, no business logic, no HTTP logic.
 */

export interface Fund {
  fund_id: string;
  account_id: string;
  fund_name: string;
  description: string | null;
  default_amount: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateFundInput {
  account_id: string;
  fund_name: string;
  description?: string | null;
  default_amount?: number | null;
  is_active?: boolean;
}

export interface UpdateFundInput {
  fund_name?: string;
  description?: string | null;
  default_amount?: number | null;
  is_active?: boolean;
}


