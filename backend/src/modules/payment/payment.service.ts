import axios from 'axios';
import crypto from 'crypto';
import { contributionService } from '../contribution/contribution.service.js';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_26f11dd10895605a6eb9c0cdb0f4648cb852f2f6';
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_cab5814d019ab5a55e6a1260e2bbe85a248e9c10';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface InitializePaymentInput {
  account_id: string;
  fund_id: string;
  amount: number;
  email: string;
  name: string;
}

interface PaymentInitializationResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

interface VerifyPaymentResult {
  status: string;
  reference: string;
  amount: number;
  contribution_id: string | null;
}

export const paymentService = {
  /**
   * Initialize Paystack payment
   */
  async initializePayment(input: InitializePaymentInput): Promise<{
    success: boolean;
    data?: PaymentInitializationResult;
    error?: string;
  }> {
    try {
      // Convert amount to kobo (Paystack uses smallest currency unit)
      const amountInKobo = Math.round(input.amount * 100);

      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          email: input.email,
          amount: amountInKobo,
          reference: `PH_${Date.now()}_${input.fund_id.substring(0, 8)}`,
          metadata: {
            account_id: input.account_id,
            fund_id: input.fund_id,
            name: input.name,
          },
          callback_url: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/payment/callback`,
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status) {
        return {
          success: true,
          data: {
            authorization_url: response.data.data.authorization_url,
            access_code: response.data.data.access_code,
            reference: response.data.data.reference,
          },
        };
      }

      return {
        success: false,
        error: response.data.message || 'Failed to initialize payment',
      };
    } catch (error) {
      console.error('Paystack initialization error:', error);
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.message || 'Failed to initialize payment',
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize payment',
      };
    }
  },

  /**
   * Verify Paystack payment
   */
  async verifyPayment(reference: string): Promise<{
    success: boolean;
    data?: VerifyPaymentResult;
    error?: string;
  }> {
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      if (response.data.status && response.data.data.status === 'success') {
        const transaction = response.data.data;
        const metadata = transaction.metadata || {};

        // Create or update contribution record
        let contributionId: string | null = null;

        try {
          const contribution = await contributionService.createContribution({
            account_id: metadata.account_id,
            fund_id: metadata.fund_id,
            member_id: null, // Public contributions are anonymous unless member is verified
            channel: 'online',
            payment_method: 'Paystack',
            amount: transaction.amount / 100, // Convert from kobo
            date_received: new Date().toISOString(),
            received_by_user_id: null,
            comment: `Payment via Paystack - ${metadata.name || 'Anonymous'}`,
            payment_reference: reference,
            status: 'confirmed', // Paystack verified = confirmed
          });

          contributionId = contribution?.contribution_id || null;
        } catch (error) {
          console.error('Error creating contribution:', error);
          // Continue even if contribution creation fails - payment is still verified
        }

        return {
          success: true,
          data: {
            status: transaction.status,
            reference: reference,
            amount: transaction.amount / 100,
            contribution_id: contributionId,
          },
        };
      }

      return {
        success: false,
        error: response.data.message || 'Payment verification failed',
      };
    } catch (error) {
      console.error('Paystack verification error:', error);
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.message || 'Failed to verify payment',
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify payment',
      };
    }
  },

  /**
   * Handle Paystack webhook
   */
  async handleWebhook(payload: any, signature: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Verify webhook signature
      const hash = crypto
        .createHmac('sha512', PAYSTACK_SECRET_KEY)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (hash !== signature) {
        return {
          success: false,
          error: 'Invalid signature',
        };
      }

      const event = payload.event;
      const data = payload.data;

      if (event === 'charge.success') {
        // Payment was successful
        const metadata = data.metadata || {};
        const reference = data.reference;

        // Create or update contribution
        try {
          await contributionService.createContribution({
            account_id: metadata.account_id,
            fund_id: metadata.fund_id,
            member_id: null,
            channel: 'online',
            payment_method: 'Paystack',
            amount: data.amount / 100,
            date_received: new Date(data.paid_at || Date.now()).toISOString(),
            received_by_user_id: null,
            comment: `Payment via Paystack - ${metadata.name || 'Anonymous'}`,
            payment_reference: reference,
            status: 'confirmed',
          });
        } catch (error) {
          console.error('Error creating contribution from webhook:', error);
          // Don't fail webhook - log error but return success
        }
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Webhook processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      };
    }
  },
};
