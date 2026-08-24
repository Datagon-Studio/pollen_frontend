/**
 * Audit Service
 * 
 * Centralized audit logging for tracking vital system actions and events.
 * Stores important operations, errors, and system events for compliance and debugging.
 */

import { supabase } from '../supabase/client.js';

export type ActionCategory = 'AUTH' | 'MEMBER' | 'CONTRIBUTION' | 'FUND' | 'EXPENSE' | 'ACCOUNT' | 'PAYMENT' | 'SYSTEM';

export type ActionStatus = 'success' | 'failed' | 'error';

export interface AuditLogInput {
  actionType: string;
  actionCategory: ActionCategory;
  userId?: string | null;
  accountId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  actionDetails?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  status?: ActionStatus;
  errorMessage?: string | null;
}

export interface AuditLog {
  audit_id: string;
  action_type: string;
  action_category: ActionCategory;
  user_id: string | null;
  account_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  action_details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  status: ActionStatus;
  error_message: string | null;
  created_at: string;
}

class AuditService {
  /**
   * Log an audit event
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          action_type: input.actionType,
          action_category: input.actionCategory,
          user_id: input.userId || null,
          account_id: input.accountId || null,
          entity_type: input.entityType || null,
          entity_id: input.entityId || null,
          action_details: input.actionDetails || null,
          ip_address: input.ipAddress || null,
          user_agent: input.userAgent || null,
          status: input.status || 'success',
          error_message: input.errorMessage || null,
        });

      if (error) {
        // Don't throw - audit logging should never break the main flow
        console.error('Failed to write audit log:', error);
      }
    } catch (error) {
      // Silent fail - audit logging should never break the main flow
      console.error('Exception writing audit log:', error);
    }
  }

  /**
   * Log OTP sent event
   */
  async logOTPSent(
    phone: string,
    accountId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true,
    error?: string
  ): Promise<void> {
    await this.log({
      actionType: 'OTP_SENT',
      actionCategory: 'AUTH',
      userId: userId || null,
      accountId,
      entityType: 'member',
      actionDetails: {
        phone: phone.replace(/(\d{3})\d+(\d{4})/, '$1****$2'), // Mask phone number
      },
      ipAddress,
      userAgent,
      status: success ? 'success' : 'failed',
      errorMessage: error || null,
    });
  }

  /**
   * Log OTP verified event
   */
  async logOTPVerified(
    phone: string,
    accountId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true,
    error?: string
  ): Promise<void> {
    await this.log({
      actionType: 'OTP_VERIFIED',
      actionCategory: 'AUTH',
      userId: userId || null,
      accountId,
      entityType: 'member',
      actionDetails: {
        phone: phone.replace(/(\d{3})\d+(\d{4})/, '$1****$2'), // Mask phone number
      },
      ipAddress,
      userAgent,
      status: success ? 'success' : 'failed',
      errorMessage: error || null,
    });
  }

  /**
   * Log contribution created event
   */
  async logContributionCreated(
    contributionId: string,
    accountId: string,
    userId: string,
    amount: number,
    fundId: string,
    memberId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      actionType: 'CONTRIBUTION_CREATED',
      actionCategory: 'CONTRIBUTION',
      userId,
      accountId,
      entityType: 'contribution',
      entityId: contributionId,
      actionDetails: {
        amount,
        fund_id: fundId,
        member_id: memberId || null,
      },
      ipAddress,
      userAgent,
      status: 'success',
    });
  }

  /**
   * Log contribution confirmed event
   */
  async logContributionConfirmed(
    contributionId: string,
    accountId: string,
    userId: string,
    amount: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      actionType: 'CONTRIBUTION_CONFIRMED',
      actionCategory: 'CONTRIBUTION',
      userId,
      accountId,
      entityType: 'contribution',
      entityId: contributionId,
      actionDetails: {
        amount,
      },
      ipAddress,
      userAgent,
      status: 'success',
    });
  }

  /**
   * Log contribution rejected event
   */
  async logContributionRejected(
    contributionId: string,
    accountId: string,
    userId: string,
    amount: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      actionType: 'CONTRIBUTION_REJECTED',
      actionCategory: 'CONTRIBUTION',
      userId,
      accountId,
      entityType: 'contribution',
      entityId: contributionId,
      actionDetails: {
        amount,
      },
      ipAddress,
      userAgent,
      status: 'success',
    });
  }

  /**
   * Log contribution deleted event
   */
  async logContributionDeleted(
    contributionId: string,
    accountId: string,
    userId: string,
    amount: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      actionType: 'CONTRIBUTION_DELETED',
      actionCategory: 'CONTRIBUTION',
      userId,
      accountId,
      entityType: 'contribution',
      entityId: contributionId,
      actionDetails: {
        amount,
      },
      ipAddress,
      userAgent,
      status: 'success',
    });
  }

  /**
   * Log member created event
   */
  async logMemberCreated(
    memberId: string,
    accountId: string,
    userId: string,
    memberName: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      actionType: 'MEMBER_CREATED',
      actionCategory: 'MEMBER',
      userId,
      accountId,
      entityType: 'member',
      entityId: memberId,
      actionDetails: {
        member_name: memberName,
      },
      ipAddress,
      userAgent,
      status: 'success',
    });
  }

  /**
   * Log member deleted event
   */
  async logMemberDeleted(
    memberId: string,
    accountId: string,
    userId: string,
    memberName: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      actionType: 'MEMBER_DELETED',
      actionCategory: 'MEMBER',
      userId,
      accountId,
      entityType: 'member',
      entityId: memberId,
      actionDetails: {
        member_name: memberName,
      },
      ipAddress,
      userAgent,
      status: 'success',
    });
  }

  /**
   * Log Paystack payment initialized
   */
  async logPaymentInitialized(input: {
    reference: string;
    accountId: string;
    fundId: string;
    amount: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      actionType: 'PAYMENT_INITIALIZED',
      actionCategory: 'PAYMENT',
      accountId: input.accountId,
      entityType: 'payment',
      entityId: input.reference,
      actionDetails: {
        fund_id: input.fundId,
        amount: input.amount,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      status: 'success',
    });
  }

  /**
   * Log Paystack payment verified with Paystack API
   */
  async logPaymentVerified(input: {
    reference: string;
    accountId?: string | null;
    amount: number;
    source: 'verify' | 'webhook';
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      actionType: 'PAYMENT_VERIFIED',
      actionCategory: 'PAYMENT',
      accountId: input.accountId || null,
      entityType: 'payment',
      entityId: input.reference,
      actionDetails: {
        amount: input.amount,
        source: input.source,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      status: 'success',
    });
  }

  /**
   * Log successful contribution recording from Paystack payment
   */
  async logPaymentRecorded(input: {
    reference: string;
    accountId: string;
    contributionId: string;
    amount: number;
    fundId?: string;
    memberId?: string | null;
    source: 'verify' | 'webhook';
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    await this.log({
      actionType: 'PAYMENT_RECORDED',
      actionCategory: 'PAYMENT',
      accountId: input.accountId,
      entityType: 'contribution',
      entityId: input.contributionId,
      actionDetails: {
        payment_reference: input.reference,
        amount: input.amount,
        fund_id: input.fundId,
        member_id: input.memberId ?? null,
        source: input.source,
        ...input.details,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      status: 'success',
    });
  }

  /**
   * Log failed contribution recording after Paystack payment succeeded
   */
  async logPaymentRecordingFailed(input: {
    reference: string;
    accountId?: string | null;
    source: 'verify' | 'webhook';
    error: string;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    await this.log({
      actionType: 'PAYMENT_RECORDING_FAILED',
      actionCategory: 'PAYMENT',
      accountId: input.accountId || null,
      entityType: 'payment',
      entityId: input.reference,
      actionDetails: {
        source: input.source,
        ...input.details,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      status: 'error',
      errorMessage: input.error,
    });
  }

  /**
   * Log Paystack verify/webhook failure
   */
  async logPaymentFailed(input: {
    reference: string;
    accountId?: string | null;
    source: 'verify' | 'webhook';
    error: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      actionType: 'PAYMENT_FAILED',
      actionCategory: 'PAYMENT',
      accountId: input.accountId || null,
      entityType: 'payment',
      entityId: input.reference,
      actionDetails: {
        source: input.source,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      status: 'failed',
      errorMessage: input.error,
    });
  }

  /**
   * Log system error event
   */
  async logSystemError(
    error: Error,
    context?: Record<string, any>,
    userId?: string,
    accountId?: string
  ): Promise<void> {
    await this.log({
      actionType: 'SYSTEM_ERROR',
      actionCategory: 'SYSTEM',
      userId: userId || null,
      accountId: accountId || null,
      actionDetails: {
        error_message: error.message,
        error_stack: error.stack,
        ...context,
      },
      status: 'error',
      errorMessage: error.message,
    });
  }

  /**
   * Extract IP address and user agent from Express request
   */
  extractRequestInfo(req: any): { ipAddress?: string; userAgent?: string } {
    return {
      ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    };
  }
}

export const auditService = new AuditService();
