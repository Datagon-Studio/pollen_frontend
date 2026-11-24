import axios from 'axios';
import crypto from 'crypto';
import { contributionService } from '../contribution/contribution.service.js';
import { memberRepository } from '../member/member.repository.js';
import { fundRepository } from '../fund/fund.repository.js';
import { calculatePaymentAmounts } from './paystack-fees.js';
import { feeService } from './fee.service.js';
import { auditService } from '../../shared/services/audit.service.js';
import { paymentRepository } from './payment.repository.js';
import {
  processPaymentByReference,
  type PaymentRequestContext,
} from './payment-processor.js';
import type { PaymentListFilters } from './payment.entity.js';

import { env } from '../../env.js';
import { getFrontendUrl } from '../../shared/utils/frontend-url.js';

const PAYSTACK_SECRET_KEY = env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC_KEY = env.PAYSTACK_PUBLIC_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

if (!PAYSTACK_SECRET_KEY || !PAYSTACK_PUBLIC_KEY) {
  console.warn('⚠️  Paystack keys not configured. Payment features will not work.');
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

      // Apply the configured account/global payment fee.
      // e.g. contribute GHS 1000 at 2% → fee GHS 20 → charge GHS 1020
      const fee = await feeService.resolveForAccount(input.account_id);
      const { contributionAmount, feeAmount, chargedAmount } =
        calculatePaymentAmounts(input.amount, fee.rate);

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
        try {
          await paymentRepository.create({
            reference,
            account_id: input.account_id,
            fund_id: input.fund_id,
            member_id: input.member_id || null,
            user_email: input.email,
            contributor_name: input.name,
            phone: input.phone || null,
            contribution_amount: contributionAmount,
            fee_amount: feeAmount,
            charged_amount: chargedAmount,
            currency: 'GHS',
            metadata: {
              account_id: input.account_id,
              fund_id: input.fund_id,
              name: input.name,
              email: input.email,
              contribution_amount: contributionAmount,
              fee_amount: feeAmount,
              charged_amount: chargedAmount,
              fees_passed_to_customer: true,
              ...(input.phone && { phone: input.phone }),
              ...(input.member_id && { member_id: input.member_id }),
            },
          });
        } catch (error) {
          console.error(
            `[Payment] Paystack initialized ${reference} but pending payment row was not saved:`,
            error
          );
        }

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
      const result = await processPaymentByReference(reference, 'verify', requestContext);
      const paystackSucceeded =
        result.alreadyProcessed ||
        result.paystackStatus === 'success' ||
        !!result.contributionId;

      if (!paystackSucceeded) {
        return {
          success: false,
          error: result.error || result.recordingError || 'Failed to verify payment',
        };
      }

      return {
        success: true,
        data: {
          status: result.paystackStatus || 'success',
          reference,
          amount: result.payment?.contribution_amount ?? 0,
          contribution_id: result.contributionId,
          account_id: result.payment?.account_id ?? null,
          ...((result.recordingError || (!result.contributionId && result.error)) && {
            recording_error: result.recordingError || result.error,
          }),
        },
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
  async handleWebhook(
    payload: any,
    signature: string,
    rawBody?: string
  ): Promise<{
    success: boolean;
    error?: string;
    retryable?: boolean;
  }> {
    if (!PAYSTACK_SECRET_KEY) {
      return {
        success: false,
        error: 'Paystack secret key is not configured',
        retryable: true,
      };
    }
    try {
      // Paystack signs the original request body. Re-serializing the parsed JSON
      // changes the bytes, so prefer the raw body when it is available.
      const signedBody = rawBody && rawBody.length > 0 ? rawBody : JSON.stringify(payload);
      const hash = crypto
        .createHmac('sha512', PAYSTACK_SECRET_KEY)
        .update(signedBody)
        .digest('hex');

      if (!safeEqual(hash, signature)) {
        const reference = payload?.data?.reference ? String(payload.data.reference) : '';
        if (payload?.event === 'charge.success' && reference) {
          console.warn(
            `[Webhook] Signature mismatch for ${reference}. Confirming with Paystack before recording.`
          );
          const verified = await this.verifyPayment(reference);
          if (verified.success) {
            return { success: true };
          }
        }
        return {
          success: false,
          error: 'Invalid signature',
        };
      }

      const event = payload.event;
      const data = payload.data;

      if (event === 'charge.success') {
        const reference = data?.reference;
        if (!reference) {
          return { success: false, error: 'Webhook missing transaction reference', retryable: true };
        }

        const result = await processPaymentByReference(reference, 'webhook', undefined, {
          markWebhookReceived: true,
        });

        if (result.recordingError || (!result.success && !result.needsReview && !result.alreadyProcessed)) {
          const error = result.recordingError || result.error || 'Webhook fulfilment failed';
          console.error(
            `[Webhook] ✗ Payment ${reference} succeeded but was not fulfilled:`,
            error
          );
          return {
            success: false,
            error,
            retryable: true,
          };
        }

        if (result.contributionId) {
          console.log(
            `[Webhook] ✓ Contribution recorded for reference ${reference}: ${result.contributionId}`
          );
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
        retryable: true,
      };
    }
  },

  async reconcilePendingPayments(): Promise<{
    checked: number;
    fulfilled: number;
    failed: number;
    needsReview: number;
  }> {
    const staleAfter = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const pending = await paymentRepository.findStaleForReconciliation({
      olderThanIso: staleAfter,
      limit: 50,
      maxAttempts: 30,
    });

    let fulfilled = 0;
    let failed = 0;
    let needsReview = 0;

    for (const payment of pending) {
      const result = await processPaymentByReference(payment.reference, 'reconcile');
      if (result.contributionId && result.success) {
        fulfilled += 1;
      } else if (result.needsReview) {
        needsReview += 1;
      } else if (!result.success) {
        failed += 1;
      }
    }

    return {
      checked: pending.length,
      fulfilled,
      failed,
      needsReview,
    };
  },

  async listAdminPayments(filters: PaymentListFilters = {}) {
    const [payments, summary] = await Promise.all([
      paymentRepository.list(filters),
      paymentRepository.countByStatus(),
    ]);
    return { payments, summary };
  },

  async getAdminPayment(paymentId: string) {
    return paymentRepository.findByIdWithDetails(paymentId);
  },

  async verifyAdminPayment(
    paymentId: string,
    requestContext?: PaymentRequestContext
  ) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      return { success: false as const, error: 'Payment not found' };
    }

    const result = await processPaymentByReference(
      payment.reference,
      'admin',
      requestContext
    );
    const updated = await paymentRepository.findByIdWithDetails(paymentId);

    if (!result.success && !result.alreadyProcessed) {
      return {
        success: false as const,
        error: result.error || result.recordingError || 'Verification did not complete',
        payment: updated,
      };
    }

    return {
      success: true as const,
      payment: updated,
      alreadyProcessed: result.alreadyProcessed,
    };
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
      const allContributions = await contributionService.getContributionsByAccount(accountId);
      const anonymousContributions = allContributions.filter(c => !c.member_id && c.channel === 'online' && c.payment_method === 'Paystack');

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
          } catch (error) {
            console.error(`[Link] ✗ Failed to link contribution ${contribution.contribution_id}:`, error);
          }
        }
      }

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
