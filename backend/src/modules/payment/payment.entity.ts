export type PaymentStatus =
  | 'pending'
  | 'successful'
  | 'failed'
  | 'abandoned'
  | 'needs_review';

export type PaymentProcessSource = 'verify' | 'webhook' | 'reconcile' | 'admin';

export interface Payment {
  payment_id: string;
  reference: string;
  account_id: string;
  fund_id: string;
  member_id: string | null;
  contribution_id: string | null;
  user_email: string;
  contributor_name: string;
  phone: string | null;
  contribution_amount: number;
  fee_amount: number;
  charged_amount: number;
  currency: string;
  status: PaymentStatus;
  paystack_status: string | null;
  paid_at: string | null;
  webhook_received_at: string | null;
  last_verified_at: string | null;
  verification_attempts: number;
  last_error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PaymentInsert {
  reference: string;
  account_id: string;
  fund_id: string;
  member_id?: string | null;
  user_email: string;
  contributor_name: string;
  phone?: string | null;
  contribution_amount: number;
  fee_amount: number;
  charged_amount: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentUpdate {
  member_id?: string | null;
  contribution_id?: string | null;
  status?: PaymentStatus;
  paystack_status?: string | null;
  paid_at?: string | null;
  webhook_received_at?: string | null;
  last_verified_at?: string | null;
  verification_attempts?: number;
  last_error?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PaymentWithDetails extends Payment {
  account_name: string | null;
  fund_name: string | null;
}

export interface PaymentSummaryCounts {
  pending: number;
  successful: number;
  failed: number;
  abandoned: number;
  needs_review: number;
  total: number;
}

export interface PaymentListFilters {
  status?: PaymentStatus;
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}
