import { contributionService } from '../contribution/contribution.service.js';
import { contributionRepository } from '../contribution/contribution.repository.js';
import { memberRepository } from '../member/member.repository.js';
import { auditService } from '../../shared/services/audit.service.js';

export function normalizePhone(phoneNum: string): string {
  let normalized = phoneNum.replace(/[\s\-+()]/g, '');
  if (normalized.startsWith('233') && normalized.length === 12) {
    normalized = '0' + normalized.substring(3);
  }
  return normalized;
}

export function resolveContributionAmount(
  metadata: Record<string, unknown>,
  chargedAmount: number
): number {
  const raw = metadata.contribution_amount;
  const parsed =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? parseFloat(raw)
        : NaN;

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return chargedAmount;
}

function buildPaystackSmsRecipient(
  memberId: string | null,
  customerPhone: string | null | undefined,
  contributorName: string
): { phone: string; name: string } | undefined {
  if (memberId || !customerPhone?.trim()) {
    return undefined;
  }

  return {
    phone: normalizePhone(customerPhone),
    name: contributorName.trim() || 'there',
  };
}

async function resolvePaystackMemberId(
  metadata: Record<string, unknown>,
  accountId: string,
  customerEmail?: string | null,
  customerPhone?: string | null
): Promise<string | null> {
  if (metadata.member_id && metadata.member_id !== 'null' && metadata.member_id !== '') {
    const memberId = String(metadata.member_id);
    const member = await memberRepository.findById(memberId);
    if (member && member.account_id === accountId) {
      return memberId;
    }
    console.warn(`[Payment] Ignoring invalid member_id in metadata: ${memberId}`);
  }

  if (customerEmail) {
    const memberByEmail = await memberRepository.findByEmail(
      customerEmail.trim().toLowerCase(),
      accountId
    );
    if (memberByEmail) return memberByEmail.member_id;
  }

  if (customerPhone) {
    const memberByPhone = await memberRepository.findByPhone(
      normalizePhone(customerPhone),
      accountId
    );
    if (memberByPhone) return memberByPhone.member_id;
  }

  return null;
}

export async function recordPaystackContribution(input: {
  reference: string;
  metadata: Record<string, unknown>;
  chargedAmount: number;
  paidAt?: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  source: 'verify' | 'webhook';
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ contributionId: string | null; recordingError?: string; alreadyExists?: boolean }> {
  const {
    reference,
    metadata,
    chargedAmount,
    paidAt,
    customerEmail,
    customerPhone,
    source,
    ipAddress,
    userAgent,
  } = input;

  const accountId = metadata.account_id ? String(metadata.account_id) : '';
  const fundId = metadata.fund_id ? String(metadata.fund_id) : '';

  if (!accountId || !fundId) {
    const message = 'Payment metadata is missing account or fund information';
    await auditService.logPaymentRecordingFailed({
      reference,
      accountId: accountId || null,
      source,
      error: message,
      ipAddress,
      userAgent,
      details: { metadata },
    });
    return { contributionId: null, recordingError: message };
  }

  const existingContribution = await contributionRepository.findByPaymentReference(reference);
  if (existingContribution) {
    await auditService.logPaymentRecorded({
      reference,
      accountId,
      contributionId: existingContribution.contribution_id,
      amount: existingContribution.amount,
      source,
      ipAddress,
      userAgent,
      details: { already_exists: true },
    });
    return {
      contributionId: existingContribution.contribution_id,
      alreadyExists: true,
    };
  }

  const memberId = await resolvePaystackMemberId(
    metadata,
    accountId,
    customerEmail,
    customerPhone
  );
  const contributorName = metadata.name ? String(metadata.name) : memberId ? 'Member' : 'Anonymous';
  const contributionAmount = resolveContributionAmount(metadata, chargedAmount);

  if (!Number.isFinite(contributionAmount) || contributionAmount <= 0) {
    const message = 'Payment amount could not be resolved for recording';
    await auditService.logPaymentRecordingFailed({
      reference,
      accountId,
      source,
      error: message,
      ipAddress,
      userAgent,
      details: { chargedAmount, metadata },
    });
    return { contributionId: null, recordingError: message };
  }

  try {
    const contribution = await contributionService.createContribution(
      {
        account_id: accountId,
        fund_id: fundId,
        member_id: memberId,
        channel: 'online',
        payment_method: 'Paystack',
        amount: contributionAmount,
        date_received: paidAt || new Date().toISOString(),
        received_by_user_id: null,
        comment: `Payment via Paystack - ${contributorName}${customerEmail ? ` (${customerEmail})` : ''}`,
        payment_reference: reference,
        status: 'confirmed',
      },
      undefined,
      {
        allowBelowFundMinimum: true,
        allowInactiveFund: true,
        allowInvalidMember: true,
        smsRecipient: buildPaystackSmsRecipient(memberId, customerPhone, contributorName),
      }
    );

    await auditService.logPaymentRecorded({
      reference,
      accountId,
      contributionId: contribution.contribution_id,
      amount: contribution.amount,
      fundId,
      memberId,
      source,
      ipAddress,
      userAgent,
    });

    return { contributionId: contribution.contribution_id };
  } catch (error) {
    const recordingError = error instanceof Error ? error.message : 'Failed to record contribution';
    await auditService.logPaymentRecordingFailed({
      reference,
      accountId,
      source,
      error: recordingError,
      ipAddress,
      userAgent,
      details: {
        fund_id: fundId,
        member_id: memberId,
        amount: contributionAmount,
      },
    });
    return { contributionId: null, recordingError };
  }
}
