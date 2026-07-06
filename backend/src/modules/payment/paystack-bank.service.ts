/**
 * Paystack Bank Verification Service
 * 
 * Handles bank account verification using Paystack API
 */

import axios from 'axios';
import { env } from '../../env.js';

const PAYSTACK_SECRET_KEY = env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

if (!PAYSTACK_SECRET_KEY) {
  console.warn('⚠️  Paystack secret key not configured. Bank verification will not work.');
}

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

export const paystackBankService = {
  /**
   * Get list of banks supported by Paystack
   * @param country - Country code (default: 'GH' for Ghana, 'NG' for Nigeria)
   */
  async getBanks(
    country: 'GH' | 'NG' = 'GH',
    options?: { type?: string; currency?: string },
  ): Promise<Bank[]> {
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('Paystack secret key is not configured');
    }
    try {
      // Paystack API expects lowercase country name, not country code
      const countryName = country === 'GH' ? 'ghana' : 'nigeria';
      console.log('Calling Paystack API for banks, country:', countryName, options);

      const params: Record<string, string> = { country: countryName };
      if (options?.type) params.type = options.type;
      if (options?.currency) params.currency = options.currency;

      const response = await axios.get(`${PAYSTACK_BASE_URL}/bank`, {
        params,
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      });
      
      console.log('Paystack API response:', {
        status: response.data.status,
        dataLength: response.data.data?.length,
        message: response.data.message,
      });

      console.log('Paystack API response status:', response.data.status);
      console.log('Paystack API response data length:', response.data.data?.length);
      
      // Log first bank structure if available
      if (response.data.data && response.data.data.length > 0) {
        console.log('Sample bank structure:', JSON.stringify(response.data.data[0], null, 2));
      }

      if (response.data.status && response.data.data) {
        const allBanks = response.data.data;
        console.log('Total banks from Paystack:', allBanks.length);
        
        // Return all banks - Paystack already filters by country
        return allBanks;
      }
      
      // If status is false or data is missing, log the full response
      console.error('Invalid Paystack response:', JSON.stringify(response.data, null, 2));

      throw new Error('Failed to fetch banks - invalid response structure');
    } catch (error: any) {
      console.error('Paystack getBanks error:', error.response?.data || error.message);
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch banks');
    }
  },

  /**
   * Resolve bank account number
   * Verifies that an account number and bank code match
   * @param accountNumber - The customer's account number
   * @param bankCode - The bank code (from getBanks)
   */
  async resolveAccount(accountNumber: string, bankCode: string): Promise<ResolveAccountResponse> {
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('Paystack secret key is not configured');
    }
    try {
      // Remove any non-digit characters from account number
      const cleanAccountNumber = accountNumber.trim().replace(/\D/g, '');
      
      if (!cleanAccountNumber || cleanAccountNumber.length < 10) {
        throw new Error('Account number must be at least 10 digits');
      }

      const response = await axios.get(`${PAYSTACK_BASE_URL}/bank/resolve`, {
        params: {
          account_number: cleanAccountNumber,
          bank_code: bankCode,
        },
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      });

      if (response.data.status && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to resolve account');
    } catch (error: any) {
      console.error('Paystack resolveAccount error:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || 'Failed to verify account number';
      throw new Error(errorMessage);
    }
  },
};
