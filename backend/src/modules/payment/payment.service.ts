import axios from 'axios';
import crypto from 'crypto';
import { contributionService } from '../contribution/contribution.service.js';
import { memberRepository } from '../member/member.repository.js';
import { fundRepository } from '../fund/fund.repository.js';
import { calculatePaymentAmounts } from './paystack-fees.js';
import {
  recordPaystackContribution,
  resolveContributionAmount,
  normalizePhone,
} from './payment-recording.js';
import { auditService } from '../../shared/services/audit.service.js';

import { env } from '../../env.js';
import { getFrontendUrl } from '../../shared/utils/frontend-url.js';

const PAYSTACK_SECRET_KEY = env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC_KEY = env.PAYSTACK_PUBLIC_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

if (!PAYSTACK_SECRET_KEY || !PAYSTACK_PUBLIC_KEY) {
  console.warn('⚠️  Paystack keys not configured. Payment features will not work.');
}

interface PaymentRequestContext {
  ipAddress?: string;
  userAgent?: string;
}

interface InitializePaymentInput {
  account_id: string;
  fund_id: string;
  amount: number;
  email: string;
  name: string;
  phone?: string;
  member_id?: string;
  frontend_url?: string;
  requestContext?: PaymentRequestContext;
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
  account_id?: string | null;
  recording_error?: string;
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
    if (!PAYSTACK_SECRET_KEY) {
      return {
        success: false,
        error: 'Paystack secret key is not configured',
      };
    }
    try {
      // Validate against the same rules the contribution record must satisfy, so a payment
      // is never collected for a contribution that cannot be recorded afterwards.
      const fund = await fundRepository.findById(input.fund_id);
      if (!fund || fund.account_id !== input.account_id) {
        return { success: false, error: 'Fund not found' };
      }
      if (!fund.is_active) {
        return {
          success: false,
          error: `Fund "${fund.fund_name}" is not currently accepting contributions`,
        };
      }
      if (fund.default_amount && input.amount < fund.default_amount) {
        return {
          success: false,
          error: `Minimum contribution for ${fund.fund_name} is ${fund.default_amount}`,
        };
      }

      // Apply one combined 2.5% payment fee.
      // e.g. contribute GHS 1000 → fee ₵25 → charge ₵1025
      const { contributionAmount, feeAmount, chargedAmount } =
        calculatePaymentAmounts(input.amount);

      // Convert charged amount to pesewas (Paystack uses smallest currency unit)
      const amountInPesewas = Math.round(chargedAmount * 100);
      const frontendUrl = getFrontendUrl(input.frontend_url);

      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          email: input.email,
          amount: amountInPesewas,
          currency: 'GHS',
          reference: `PH_${Date.now()}_${input.fund_id.substring(0, 8)}`,
          metadata: {
            account_id: input.account_id,
            fund_id: input.fund_id,
            name: input.name,
            email: input.email, // Store email in metadata for member lookup
            contribution_amount: contributionAmount,
            fee_amount: feeAmount,
            charged_amount: chargedAmount,
            fees_passed_to_customer: true,
            ...(input.phone && { phone: input.phone }), // Only include phone if provided
            ...(input.member_id && { member_id: input.member_id }), // Only include member_id if provided (for verified users)
          },
          callback_url: `${frontendUrl}/payment/callback?accountId=${encodeURIComponent(input.account_id)}`,
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status) {
        const reference = response.data.data.reference;
        await auditService.logPaymentInitialized({
          reference,
          accountId: input.account_id,
          fundId: input.fund_id,
          amount: contributionAmount,
          ipAddress: input.requestContext?.ipAddress,
          userAgent: input.requestContext?.userAgent,
        });

        return {
          success: true,
          data: {
            authorization_url: response.data.data.authorization_url,
            access_code: response.data.data.access_code,
            reference,
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
  async verifyPayment(
    reference: string,
    requestContext?: PaymentRequestContext
  ): Promise<{
    success: boolean;
    data?: VerifyPaymentResult;
    error?: string;
  }> {
    if (!PAYSTACK_SECRET_KEY) {
      return {
        success: false,
        error: 'Paystack secret key is not configured',
      };
    }

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
        const customer = transaction.customer || {};
        const customerEmail =
          customer.email ||
          transaction.customer_email ||
          transaction.email ||
          metadata.email ||
          (typeof customer === 'object' && customer !== null ? (customer as any).email : null);
        const customerPhone =
          customer.phone ||
          transaction.customer_phone ||
          metadata.phone ||
          (typeof customer === 'object' && customer !== null ? (customer as any).phone : null);
        const chargedAmount = transaction.amount / 100;
        const accountId = metadata.account_id ? String(metadata.account_id) : null;

        await auditService.logPaymentVerified({
          reference,
          accountId,
          amount: resolveContributionAmount(metadata, chargedAmount),
          source: 'verify',
          ipAddress: requestContext?.ipAddress,
          userAgent: requestContext?.userAgent,
        });

        const { contributionId, recordingError } = await recordPaystackContribution({
          reference,
          metadata,
          chargedAmount,
          paidAt: transaction.paid_at || new Date().toISOString(),
          customerEmail,
          customerPhone,
          source: 'verify',
          ipAddress: requestContext?.ipAddress,
          userAgent: requestContext?.userAgent,
        });

        return {
          success: true,
          data: {
            status: transaction.status,
            reference,
            amount: resolveContributionAmount(metadata, chargedAmount),
            contribution_id: contributionId,
            account_id: accountId,
            ...(recordingError && { recording_error: recordingError }),
          },
        };
      }

      const errorMessage = response.data.message || 'Payment verification failed';
      await auditService.logPaymentFailed({
        reference,
        source: 'verify',
        error: errorMessage,
        ipAddress: requestContext?.ipAddress,
        userAgent: requestContext?.userAgent,
      });

      return {
        success: false,
        error: errorMessage,
      };
    } catch (error) {
      console.error('Paystack verification error:', error);
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || 'Failed to verify payment'
        : error instanceof Error
          ? error.message
          : 'Failed to verify payment';

      await auditService.logPaymentFailed({
        reference,
        source: 'verify',
        error: errorMessage,
        ipAddress: requestContext?.ipAddress,
        userAgent: requestContext?.userAgent,
      });

      return {
        success: false,
        error: errorMessage,
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
    if (!PAYSTACK_SECRET_KEY) {
      return {
        success: false,
        error: 'Paystack secret key is not configured',
      };
    }
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
        const metadata = data.metadata || {};
        const customer = data.customer || {};
        const reference = data.reference;
        const customerEmail =
          customer.email ||
          data.customer_email ||
          data.email ||
          metadata.email ||
          (typeof customer === 'object' && customer !== null ? (customer as any).email : null);
        const customerPhone =
          customer.phone ||
          data.customer_phone ||
          metadata.phone ||
          (typeof customer === 'object' && customer !== null ? (customer as any).phone : null);
        const chargedAmount = data.amount / 100;
        const accountId = metadata.account_id ? String(metadata.account_id) : null;

        await auditService.logPaymentVerified({
          reference,
          accountId,
          amount: resolveContributionAmount(metadata, chargedAmount),
          source: 'webhook',
        });

        const { contributionId, recordingError } = await recordPaystackContribution({
          reference,
          metadata,
          chargedAmount,
          paidAt: new Date(data.paid_at || Date.now()).toISOString(),
          customerEmail,
          customerPhone,
          source: 'webhook',
        });

        if (recordingError) {
          console.error(`[Webhook] ✗ Payment ${reference} succeeded but contribution was NOT recorded:`, recordingError);
        } else if (contributionId) {
          console.log(`[Webhook] ✓ Contribution recorded for reference ${reference}: ${contributionId}`);
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

  /**
   * Link anonymous contributions to a member (retroactive linking)
   */
  async linkAnonymousContributions(accountId: string, memberId: string): Promise<{
    success: boolean;
    linked?: number;
    error?: string;
  }> {
    try {
      // Get member to find their email/phone
      const member = await memberRepository.findById(memberId);
      if (!member || member.account_id !== accountId) {
        return {
          success: false,
          error: 'Member not found or does not belong to account',
        };
      }

      // Get all anonymous contributions for this account
      console.log(`[Link] Starting auto-link for member ${memberId} (${member.full_name}) in account ${accountId}`);
      const allContributions = await contributionService.getContributionsByAccount(accountId);
      console.log(`[Link] Found ${allContributions.length} total contributions`);
      const anonymousContributions = allContributions.filter(c => !c.member_id && c.channel === 'online' && c.payment_method === 'Paystack');
      console.log(`[Link] Found ${anonymousContributions.length} anonymous Paystack contributions`);

      let linked = 0;
      const normalizePhone = (phoneNum: string): string => {
        let normalized = phoneNum.replace(/[\s\-+()]/g, '');
        if (normalized.startsWith('233') && normalized.length === 12) {
          normalized = '0' + normalized.substring(3);
        }
        return normalized;
      };

      const memberEmail = member.email?.trim().toLowerCase();
      const memberPhone = member.phone ? normalizePhone(member.phone) : null;

      console.log(`[Link] Member email: ${memberEmail || 'none'}, phone: ${memberPhone || 'none'}`);

      // Try to match by email or phone from payment comment or payment reference
      for (const contribution of anonymousContributions) {
        const comment = (contribution.comment || '').toLowerCase();
        const paymentRef = contribution.payment_reference || '';
        
        let shouldLink = false;
        let linkReason = '';

        // Check if comment contains member's email
        if (memberEmail && comment.includes(memberEmail)) {
          shouldLink = true;
          linkReason = 'email in comment';
        }

        // Check if comment contains member's phone (normalized)
        if (!shouldLink && memberPhone) {
          const commentNormalized = normalizePhone(comment);
          if (commentNormalized.includes(memberPhone) || memberPhone.includes(commentNormalized)) {
            shouldLink = true;
            linkReason = 'phone in comment';
          }
        }

        // Also try to verify payment reference with Paystack to get customer email
        if (!shouldLink && paymentRef && memberEmail) {
          try {
            const verifyResult = await this.verifyPayment(paymentRef);
            if (verifyResult.success && verifyResult.data) {
              // Check if payment email matches member email
              // Note: We'd need to store email in payment metadata or fetch from Paystack
              // For now, rely on comment matching
            }
          } catch (error) {
            // Ignore verification errors during linking
          }
        }

        if (shouldLink) {
          try {
            await contributionService.updateContribution(contribution.contribution_id, {
              member_id: memberId,
            });
            linked++;
            console.log(`[Link] ✓ Linked contribution ${contribution.contribution_id} (${contribution.amount}) to member ${memberId} by ${linkReason}`);
          } catch (error) {
            console.error(`[Link] ✗ Failed to link contribution ${contribution.contribution_id}:`, error);
          }
        } else {
          console.log(`[Link] ✗ No match for contribution ${contribution.contribution_id}, comment: "${contribution.comment}"`);
        }
      }

      console.log(`[Link] Auto-link complete: ${linked} contributions linked`);

      return {
        success: true,
        linked,
      };
    } catch (error) {
      console.error('Error linking contributions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to link contributions',
      };
    }
  },
};
