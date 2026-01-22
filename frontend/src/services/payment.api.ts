import { request } from './api-client';

export interface InitializePaymentInput {
  account_id: string;
  fund_id: string;
  amount: number;
  email: string;
  name?: string;
  phone?: string;
}

export interface PaymentInitializationResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface VerifyPaymentResult {
  status: string;
  reference: string;
  amount: number;
  contribution_id: string | null;
}

export const paymentApi = {
  /**
   * Initialize Paystack payment
   */
  async initializePayment(input: InitializePaymentInput): Promise<PaymentInitializationResult> {
    const response = await request<PaymentInitializationResult>('/payments/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to initialize payment');
    }

    return response.data;
  },

  /**
   * Verify Paystack payment
   */
  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    const response = await request<VerifyPaymentResult>(`/payments/verify/${reference}`, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to verify payment');
    }

    return response.data;
  },
};
