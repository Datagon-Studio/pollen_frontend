import { request } from './api-client';
import type { SettlementDetails } from './settlement.api';

export type SettlementRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'disbursed';

export interface SettlementRequest {
  request_id: string;
  account_id: string;
  account_name: string;
  fund_id: string;
  fund_name: string;
  requested_by_user_id: string;
  requester_name: string | null;
  requester_email: string | null;
  amount: number;
  status: SettlementRequestStatus;
  request_note: string | null;
  admin_note: string | null;
  destination_type: 'bank' | 'mobile_money';
  destination_account_name: string;
  destination_account_number: string;
  destination_bank_name: string | null;
  destination_bank_branch: string | null;
  destination_provider: string | null;
  reviewed_at: string | null;
  disbursed_at: string | null;
  disbursement_reference: string | null;
  created_at: string;
  updated_at: string;
}

async function unwrap<T>(
  endpoint: string,
  options: RequestInit = { method: 'GET' }
): Promise<T> {
  const response = await request<T>(endpoint, options);
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Settlement request operation failed');
  }
  return response.data;
}

export const settlementRequestApi = {
  list(): Promise<SettlementRequest[]> {
    return unwrap('/settlement-requests');
  },

  getContext(accountId: string): Promise<{ destination: SettlementDetails | null }> {
    return unwrap(`/settlement-requests/context/${accountId}`);
  },

  create(input: {
    account_id: string;
    fund_id: string;
    amount: number;
    request_note?: string | null;
  }): Promise<SettlementRequest> {
    return unwrap('/settlement-requests', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
