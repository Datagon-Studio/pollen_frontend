import { request } from './api-client';

export interface Bank {
  id: number;
  name: string;
  code: string;
  longcode?: string;
  gateway?: string;
  pay_with_bank?: boolean;
  active?: boolean;
  is_deleted?: boolean;
  country: string;
  currency: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResolveAccountResponse {
  account_number: string;
  account_name: string;
  bank_id: number;
}

export const paystackBankApi = {
  /**
   * Get list of banks supported by Paystack
   * @param country - Country code ('GH' for Ghana, 'NG' for Nigeria)
   */
  async getBanks(
    country: 'GH' | 'NG' = 'GH',
    options?: { type?: string; currency?: string },
  ): Promise<Bank[]> {
    try {
      const params = new URLSearchParams({ country });
      if (options?.type) params.set('type', options.type);
      if (options?.currency) params.set('currency', options.currency);

      const response = await request<Bank[]>(`/payments/banks?${params.toString()}`, {
        method: 'GET',
      });

      console.log('Paystack banks API response:', response);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch banks');
      }

      if (!response.data) {
        throw new Error('No banks data returned from API');
      }

      return response.data;
    } catch (error) {
      console.error('Error in paystackBankApi.getBanks:', error);
      throw error;
    }
  },

  /**
   * Verify bank account number
   * @param accountNumber - The account number to verify
   * @param bankCode - The bank code from getBanks()
   */
  async verifyAccount(accountNumber: string, bankCode: string): Promise<ResolveAccountResponse> {
    const response = await request<ResolveAccountResponse>(
      `/payments/verify-bank-account?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
      {
        method: 'GET',
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to verify bank account');
    }

    return response.data;
  },

  async getMobileMoneyProviders(country: 'GH' | 'NG' = 'GH'): Promise<Bank[]> {
    const currency = country === 'GH' ? 'GHS' : 'NGN';
    return this.getBanks(country, { type: 'mobile_money', currency });
  },
};
