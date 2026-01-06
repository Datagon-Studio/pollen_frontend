import { request } from './api-client.js';

export interface Account {
  account_id: string;
  account_name: string | null;
  account_logo: string | null;
  kyc_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface UpdateAccountInput {
  account_name?: string | null;
  account_logo?: string | null;
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
   * Update current user's account (only account_name and account_logo)
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
};
