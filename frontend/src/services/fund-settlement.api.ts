import { request } from './api-client.js';

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
  fund_name: string;
}

export interface CreateFundSettlementInput {
  fund_id: string;
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

export const fundSettlementApi = {
  async getAll(): Promise<FundSettlement[]> {
    const response = await request<FundSettlement[]>('/fund-settlements', {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch settlements');
    }

    return response.data;
  },

  async getByFund(fundId: string): Promise<FundSettlement[]> {
    const response = await request<FundSettlement[]>(`/fund-settlements/fund/${fundId}`, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch fund settlements');
    }

    return response.data;
  },

  async getById(settlementId: string): Promise<FundSettlement> {
    const response = await request<FundSettlement>(`/fund-settlements/${settlementId}`, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch settlement');
    }

    return response.data;
  },

  async getStats(): Promise<FundSettlementStats> {
    const response = await request<FundSettlementStats>('/fund-settlements/stats', {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch settlement stats');
    }

    return response.data;
  },

  async create(input: CreateFundSettlementInput): Promise<FundSettlement> {
    const response = await request<FundSettlement>('/fund-settlements', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to record settlement');
    }

    return response.data;
  },

  async update(settlementId: string, input: UpdateFundSettlementInput): Promise<FundSettlement> {
    const response = await request<FundSettlement>(`/fund-settlements/${settlementId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update settlement');
    }

    return response.data;
  },

  async markSuccessful(settlementId: string): Promise<FundSettlement> {
    const response = await request<FundSettlement>(`/fund-settlements/${settlementId}/mark-successful`, {
      method: 'POST',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to mark settlement as successful');
    }

    return response.data;
  },

  async cancel(settlementId: string): Promise<FundSettlement> {
    const response = await request<FundSettlement>(`/fund-settlements/${settlementId}/cancel`, {
      method: 'POST',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to cancel settlement');
    }

    return response.data;
  },

  async archive(settlementId: string): Promise<FundSettlement> {
    const response = await request<FundSettlement>(`/fund-settlements/${settlementId}/archive`, {
      method: 'POST',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to archive settlement');
    }

    return response.data;
  },

  async unarchive(settlementId: string): Promise<FundSettlement> {
    const response = await request<FundSettlement>(`/fund-settlements/${settlementId}/unarchive`, {
      method: 'POST',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to restore settlement');
    }

    return response.data;
  },
};
