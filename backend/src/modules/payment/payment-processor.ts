import axios from 'axios';
import { env } from '../../env.js';
import { auditService } from '../../shared/services/audit.service.js';
import { paymentRepository } from './payment.repository.js';
import { recordPaystackContribution } from './payment-recording.js';
import type {
  Payment,
  PaymentInsert,
  PaymentProcessSource,
  PaymentStatus,
} from './payment.entity.js';

const PAYSTACK_SECRET_KEY = env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const ABANDON_AFTER_MS = 30 * 60 * 1000;
const EXPIRE_AFTER_MS = 48 * 60 * 60 * 1000;

export interface PaymentRequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface ProcessPaymentResult {
  success: boolean;
  payment: Payment | null;
  contributionId: string | null;
  paystackStatus: string | null;
  alreadyProcessed?: boolean;
  recordingError?: string;
  needsReview?: boolean;
  error?: string;
}

interface PaystackTransaction {
  status: string;
  reference: string;
  amount: number;
  currency?: string;
  paid_at?: string;
  metadata?: Record<string, unknown>;
  customer?: {
    email?: string;
    phone?: string;
  };
  customer_email?: string;
  customer_phone?: string;
  email?: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function amountsMatch(expectedCharged: number, paystackPesewas: number): boolean {
  return Math.round(expectedCharged * 100) === paystackPesewas;
}

function ageMs(iso: string): number {
  const created = new Date(iso).getTime();
  if (Number.isNaN(created)) return 0;
  return Date.now() - created;
}

function terminalFromPaystack(
  paystackStatus: string,
  createdAt: string
): PaymentStatus | null {
  if (paystackStatus === 'failed') return 'failed';

  const age = ageMs(createdAt);
  if (paystackStatus === 'abandoned' && age >= ABANDON_AFTER_MS) {
    return 'abandoned';
  }
  if (
    age >= EXPIRE_AFTER_MS &&
    (paystackStatus === 'abandoned' ||
      paystackStatus === 'pending' ||
      paystackStatus === 'ongoing' ||
      paystackStatus === 'processing')
  ) {
    return 'abandoned';
  }
  return null;
}

export async function fetchPaystackTransaction(
  reference: string
): Promise<PaystackTransaction> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key is not configured');
  }

  const response = await axios.get(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  if (!response.data?.status || !response.data?.data) {
    throw new Error(response.data?.message || 'Payment verification failed');
  }

  return response.data.data as PaystackTransaction;
}

async function ensurePaymentRow(
  reference: string,
  transaction: PaystackTransaction
): Promise<Payment | null> {
  const existing = await paymentRepository.findByReference(reference);
  if (existing) return existing;

  const metadata = asRecord(transaction.metadata);
  const accountId = metadata.account_id ? String(metadata.account_id) : '';
  const fundId = metadata.fund_id ? String(metadata.fund_id) : '';
  if (!accountId || !fundId) return null;

  const chargedAmount = transaction.amount / 100;
  const contributionAmountRaw = metadata.contribution_amount;
  const contributionAmount =
    typeof contributionAmountRaw === 'number'
      ? contributionAmountRaw
      : typeof contributionAmountRaw === 'string'
        ? parseFloat(contributionAmountRaw)
        : chargedAmount;
  const feeAmountRaw = metadata.fee_amount;
  const feeAmount =
    typeof feeAmountRaw === 'number'
      ? feeAmountRaw
      : typeof feeAmountRaw === 'string'
        ? parseFloat(feeAmountRaw)
        : Math.max(0, chargedAmount - contributionAmount);

  const insert: PaymentInsert = {
    reference,
    account_id: accountId,
    fund_id: fundId,
    member_id: metadata.member_id ? String(metadata.member_id) : null,
    user_email: String(
      metadata.email ||
        transaction.customer?.email ||
        transaction.customer_email ||
        transaction.email ||
        'unknown@paystack'
    ),
    contributor_name: String(metadata.name || 'Anonymous Donor'),
    phone:
      (metadata.phone ? String(metadata.phone) : null) ||
      transaction.customer?.phone ||
      transaction.customer_phone ||
      null,
    contribution_amount: Number.isFinite(contributionAmount)
      ? contributionAmount
      : chargedAmount,
    fee_amount: Number.isFinite(feeAmount) ? feeAmount : 0,
    charged_amount: chargedAmount,
    currency: transaction.currency || 'GHS',
    metadata,
  };

  try {
    return await paymentRepository.create(insert);
  } catch (error) {
    const raced = await paymentRepository.findByReference(reference);
    if (raced) return raced;
    console.error(`[Payment] Failed to backfill payment row for ${reference}:`, error);
    return null;
  }
}

function recordingMetadata(
  payment: Payment | null,
  transaction: PaystackTransaction
): Record<string, unknown> {
  const fromPaystack = asRecord(transaction.metadata);
  if (!payment) return fromPaystack;

  return {
    ...fromPaystack,
    account_id: payment.account_id,
    fund_id: payment.fund_id,
    name: payment.contributor_name,
    email: payment.user_email,
    contribution_amount: payment.contribution_amount,
    fee_amount: payment.fee_amount,
    charged_amount: payment.charged_amount,
    ...(payment.phone && { phone: payment.phone }),
    ...(payment.member_id && { member_id: payment.member_id }),
  };
}

export async function processPaymentByReference(
  reference: string,
  source: PaymentProcessSource,
  requestContext?: PaymentRequestContext,
  options?: { markWebhookReceived?: boolean }
): Promise<ProcessPaymentResult> {
  let payment = await paymentRepository.findByReference(reference);

  if (payment?.status === 'successful' && payment.contribution_id) {
    if (options?.markWebhookReceived && !payment.webhook_received_at) {
      payment = await paymentRepository.update(payment.payment_id, {
        webhook_received_at: new Date().toISOString(),
      });
    }
    return {
      success: true,
      payment,
      contributionId: payment.contribution_id,
      paystackStatus: payment.paystack_status,
      alreadyProcessed: true,
    };
  }

  let transaction: PaystackTransaction;
  try {
    transaction = await fetchPaystackTransaction(reference);
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.message || 'Failed to verify payment'
      : error instanceof Error
        ? error.message
        : 'Failed to verify payment';

    if (payment) {
      payment = await paymentRepository.update(payment.payment_id, {
        last_verified_at: new Date().toISOString(),
        verification_attempts: payment.verification_attempts + 1,
        last_error: message,
        ...(options?.markWebhookReceived
          ? { webhook_received_at: payment.webhook_received_at || new Date().toISOString() }
          : {}),
      });
    }

    await auditService.logPaymentFailed({
      reference,
      accountId: payment?.account_id,
      source,
      error: message,
      ipAddress: requestContext?.ipAddress,
      userAgent: requestContext?.userAgent,
    });

    return {
      success: false,
      payment,
      contributionId: payment?.contribution_id ?? null,
      paystackStatus: payment?.paystack_status ?? null,
      error: message,
    };
  }

  if (!payment) {
    payment = await ensurePaymentRow(reference, transaction);
  }

  const now = new Date().toISOString();
  const paystackStatus = String(transaction.status || '').toLowerCase();
  const customer = transaction.customer || {};
  const metadata = recordingMetadata(payment, transaction);
  const customerEmail =
    customer.email ||
    transaction.customer_email ||
    transaction.email ||
    (metadata.email ? String(metadata.email) : null);
  const customerPhone =
    customer.phone ||
    transaction.customer_phone ||
    (metadata.phone ? String(metadata.phone) : null);

  if (payment) {
    payment = await paymentRepository.update(payment.payment_id, {
      paystack_status: paystackStatus,
      last_verified_at: now,
      verification_attempts: payment.verification_attempts + 1,
      ...(options?.markWebhookReceived
        ? { webhook_received_at: payment.webhook_received_at || now }
        : {}),
    });
  }

  if (paystackStatus !== 'success') {
    const terminal = payment
      ? terminalFromPaystack(paystackStatus, payment.created_at)
      : paystackStatus === 'failed'
        ? 'failed'
        : null;

    if (payment && terminal && payment.status !== 'successful') {
      payment = await paymentRepository.update(payment.payment_id, {
        status: terminal,
        last_error: `Paystack status: ${paystackStatus}`,
      });
    }

    const errorMessage = `Payment not successful (Paystack: ${paystackStatus})`;
    await auditService.logPaymentFailed({
      reference,
      accountId: payment?.account_id,
      source,
      error: errorMessage,
      ipAddress: requestContext?.ipAddress,
      userAgent: requestContext?.userAgent,
    });

    return {
      success: false,
      payment,
      contributionId: payment?.contribution_id ?? null,
      paystackStatus,
      error: errorMessage,
    };
  }

  const chargedAmount = transaction.amount / 100;
  const accountId = payment?.account_id || (metadata.account_id ? String(metadata.account_id) : null);
  const expectedCurrency = (payment?.currency || 'GHS').toUpperCase();
  const actualCurrency = (transaction.currency || 'GHS').toUpperCase();

  await auditService.logPaymentVerified({
    reference,
    accountId,
    amount: payment?.contribution_amount ?? chargedAmount,
    source,
    ipAddress: requestContext?.ipAddress,
    userAgent: requestContext?.userAgent,
  });

  if (actualCurrency !== expectedCurrency) {
    const message = `Currency mismatch: expected ${expectedCurrency}, Paystack charged ${actualCurrency}`;
    if (payment) {
      payment = await paymentRepository.update(payment.payment_id, {
        status: 'needs_review',
        last_error: message,
      });
    }
    await auditService.logPaymentRecordingFailed({
      reference,
      accountId,
      source,
      error: message,
      ipAddress: requestContext?.ipAddress,
      userAgent: requestContext?.userAgent,
    });
    return {
      success: false,
      payment,
      contributionId: null,
      paystackStatus,
      needsReview: true,
      error: message,
    };
  }

  if (payment && !amountsMatch(payment.charged_amount, transaction.amount)) {
    const message = `Amount mismatch: expected ${Math.round(payment.charged_amount * 100)} pesewas, Paystack charged ${transaction.amount}`;
    payment = await paymentRepository.update(payment.payment_id, {
      status: 'needs_review',
      last_error: message,
    });
    await auditService.logPaymentRecordingFailed({
      reference,
      accountId: payment.account_id,
      source,
      error: message,
      ipAddress: requestContext?.ipAddress,
      userAgent: requestContext?.userAgent,
      details: {
        expected_charged_amount: payment.charged_amount,
        paystack_amount: chargedAmount,
      },
    });
    return {
      success: false,
      payment,
      contributionId: null,
      paystackStatus,
      needsReview: true,
      error: message,
    };
  }

  const { contributionId, recordingError, alreadyExists } = await recordPaystackContribution({
    reference,
    metadata,
    chargedAmount,
    paidAt: transaction.paid_at || now,
    customerEmail,
    customerPhone,
    source,
    ipAddress: requestContext?.ipAddress,
    userAgent: requestContext?.userAgent,
  });

  if (recordingError || !contributionId) {
    const message = recordingError || 'Failed to record contribution';
    if (payment) {
      payment = await paymentRepository.update(payment.payment_id, {
        status: 'needs_review',
        paid_at: transaction.paid_at || now,
        last_error: message,
      });
    }
    return {
      success: false,
      payment,
      contributionId: null,
      paystackStatus,
      recordingError: message,
      needsReview: true,
      error: message,
    };
  }

  if (payment) {
    payment = await paymentRepository.update(payment.payment_id, {
      status: 'successful',
      contribution_id: contributionId,
      paid_at: transaction.paid_at || now,
      last_error: null,
    });
  }

  return {
    success: true,
    payment,
    contributionId,
    paystackStatus,
    alreadyProcessed: alreadyExists,
  };
}
