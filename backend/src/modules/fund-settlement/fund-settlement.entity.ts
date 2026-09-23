/**
 * Fund Settlement Entity Types
 *
 * Defines TypeScript types only.
 * No Supabase, no business logic, no HTTP logic.
 */

export type FundSettlementStatus = 'pending' | 'successful' | 'canceled';

export interface FundSettlement {
  settlement_id: string;
  account_id: string;
  fund_id: string;
  recorded_by_user_id: string;
  amount: number;
  settlement_date: string;
  status: FundSettlementStatus;
  reference: string | null;
  notes: string | null;
  is_archived: boolean;
  archived_at: string | null;
  archived_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FundSettlementWithDetails extends FundSettlement {
  fund_name: string;
}

export interface CreateFundSettlementInput {
  account_id: string;
  fund_id: string;
  recorded_by_user_id: string;
  amount: number;
  settlement_date: string;
  status?: FundSettlementStatus;
  reference?: string | null;
  notes?: string | null;
}

export interface UpdateFundSettlementInput {
  fund_id?: string;
  amount?: number;
  settlement_date?: string;
  reference?: string | null;
  notes?: string | null;
}

export interface FundSettlementStats {
  pendingCount: number;
  successfulCount: number;
  canceledCount: number;
  archivedCount: number;
  pendingAmount: number;
  successfulAmount: number;
}

export interface FundSettlementAvailability {
  fund_id: string;
  collected: number;
  onlineCollected: number;
  offlineCollected: number;
  feeAmount: number;
  reservedAmount: number;
  availableAmount: number;
}
