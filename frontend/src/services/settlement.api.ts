import { request } from './api-client';

export interface SettlementDetails {
  settlement_id: string;
  account_id: string;
  settlement_type: 'bank' | 'mobile_money';
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
  settlement_type: 'bank' | 'mobile_money';
  account_name: string;
  account_number: string;
  bank_name?: string | null;
  bank_branch?: string | null;
  provider?: string | null;
  is_active?: boolean;
}

export interface UpdateSettlementDetailsInput {
  settlement_type?: 'bank' | 'mobile_money';
  account_name?: string;
  account_number?: string;
  provider?: string | null;
  is_active?: boolean;
}

export const settlementApi = {
  /**
   * Get current user's account settlement details
   */
  async getMySettlementDetails(): Promise<SettlementDetails[]> {
    const response = await request<SettlementDetails[]>('/settlements/me', {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch settlement details');
    }

    return response.data;
  },

  /**
   * Create or update settlement details
   */
  async upsertSettlementDetails(input: CreateSettlementDetailsInput): Promise<SettlementDetails> {
    const response = await request<SettlementDetails>('/settlements/me', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to save settlement details');
    }

    return response.data;
  },

  /**
   * Update settlement details
   */
  async updateSettlementDetails(id: string, input: UpdateSettlementDetailsInput): Promise<SettlementDetails> {
    const response = await request<SettlementDetails>(`/settlements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update settlement details');
    }

    return response.data;
  },

  /**
   * Delete settlement details
   */
  async deleteSettlementDetails(id: string): Promise<void> {
    const response = await request<void>(`/settlements/${id}`, {
      method: 'DELETE',
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete settlement details');
    }
  },
};
