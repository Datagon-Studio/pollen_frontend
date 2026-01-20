/**
 * Settlement Details Entity Types
 */

export type SettlementType = 'bank' | 'mobile_money';

export interface SettlementDetails {
  settlement_id: string;
  account_id: string;
  settlement_type: SettlementType;
  account_name: string;
  account_number: string;
  bank_name: string | null;
  bank_branch: string | null;
  provider: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSettlementDetailsInput {
  account_id: string;
  settlement_type: SettlementType;
  account_name: string;
  account_number: string;
  bank_name?: string | null;
  bank_branch?: string | null;
  provider?: string | null;
  is_active?: boolean;
}

export interface UpdateSettlementDetailsInput {
  settlement_type?: SettlementType;
  account_name?: string;
  account_number?: string;
  bank_name?: string | null;
  bank_branch?: string | null;
  provider?: string | null;
  is_active?: boolean;
}
