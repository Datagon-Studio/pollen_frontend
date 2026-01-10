import { request } from './api-client.js';

export interface Account {
  account_id: string;
  account_name: string | null;
  account_logo: string | null;
  foreground_color: string | null;
  background_color: string | null;
  kyc_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface UpdateAccountInput {
  account_name?: string | null;
  account_logo?: string | null;
  foreground_color?: string | null;
  background_color?: string | null;
}

export const accountApi = {
  /**
   * Get current user's account
   */
  async getMyAccount(): Promise<Account> {
    const response = await request<Account>('/accounts/me', {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch account');
    }

    return response.data;
  },

  /**
   * Update current user's account (only account_name, account_logo, foreground_color, and background_color)
   */
  async updateMyAccount(input: UpdateAccountInput): Promise<Account> {
    const response = await request<Account>('/accounts/me', {
      method: 'PUT',
      body: JSON.stringify(input),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update account');
    }

    return response.data;
  },

  /**
   * Get public account info by account ID (no auth required)
   */
  async getPublic(accountId: string): Promise<Account> {
    const response = await request<Account>(`/accounts/public/${accountId}`, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch account');
    }

    return response.data;
  },
};
