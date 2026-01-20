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

export interface AccountKYC {
  kyc_id: string;
  account_id: string;
  account_type: 'individual' | 'business';
  official_name: string;
  business_registration_url: string | null;
  passport_photo_url: string | null;
  national_id_url: string;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmitKYCInput {
  account_type: 'individual' | 'business';
  official_name: string;
  business_registration_url?: string | null;
  passport_photo_url?: string | null;
  national_id_url: string;
}

export const kycApi = {
  /**
   * Get current user's account KYC information
   */
  async getMyAccountKYC(): Promise<AccountKYC | null> {
    const response = await request<AccountKYC>('/accounts/me/kyc', {
      method: 'GET',
    });

    if (!response.success) {
      if (response.error?.includes('not found')) {
        return null;
      }
      throw new Error(response.error || 'Failed to fetch KYC');
    }

    return response.data || null;
  },

  /**
   * Submit KYC information
   */
  async submitKYC(input: SubmitKYCInput): Promise<AccountKYC> {
    const response = await request<AccountKYC>('/accounts/me/kyc', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to submit KYC');
    }

    return response.data;
  },

  /**
   * Update KYC information
   */
  async updateKYC(input: Partial<SubmitKYCInput>): Promise<AccountKYC> {
    const response = await request<AccountKYC>('/accounts/me/kyc', {
      method: 'PUT',
      body: JSON.stringify(input),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update KYC');
    }

    return response.data;
  },
};

export interface KYCWithAccount extends AccountKYC {
  account_name: string | null;
  account_kyc_status: 'unverified' | 'pending' | 'verified' | 'rejected' | null;
}

export const kycAdminApi = {
  /**
   * Get all KYC submissions (admin only)
   */
  async getAllKYC(): Promise<KYCWithAccount[]> {
    const response = await request<KYCWithAccount[]>('/accounts/kyc/all', {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch KYC list');
    }

    return response.data;
  },

  /**
   * Verify a KYC submission
   */
  async verifyKYC(accountId: string): Promise<AccountKYC> {
    const response = await request<AccountKYC>(`/accounts/${accountId}/kyc/verify`, {
      method: 'POST',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to verify KYC');
    }

    return response.data;
  },

  /**
   * Reject a KYC submission
   */
  async rejectKYC(accountId: string): Promise<void> {
    const response = await request<void>(`/accounts/${accountId}/kyc/reject`, {
      method: 'POST',
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to reject KYC');
    }
  },
};
