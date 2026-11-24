import { supabase } from '../../shared/supabase/client.js';
import type {
  Payment,
  PaymentInsert,
  PaymentListFilters,
  PaymentStatus,
  PaymentSummaryCounts,
  PaymentUpdate,
  PaymentWithDetails,
} from './payment.entity.js';

function throwOnError(error: { message: string } | null, action: string): void {
  if (error) throw new Error(`${action}: ${error.message}`);
}

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapPayment(row: Record<string, unknown>): Payment {
  const metadata = row.metadata;
  return {
    payment_id: row.payment_id as string,
    reference: row.reference as string,
    account_id: row.account_id as string,
    fund_id: row.fund_id as string,
    member_id: (row.member_id as string | null) ?? null,
    contribution_id: (row.contribution_id as string | null) ?? null,
    user_email: row.user_email as string,
    contributor_name: row.contributor_name as string,
    phone: (row.phone as string | null) ?? null,
    contribution_amount: toNumber(row.contribution_amount),
    fee_amount: toNumber(row.fee_amount),
    charged_amount: toNumber(row.charged_amount),
    currency: (row.currency as string) || 'GHS',
    status: row.status as PaymentStatus,
    paystack_status: (row.paystack_status as string | null) ?? null,
    paid_at: (row.paid_at as string | null) ?? null,
    webhook_received_at: (row.webhook_received_at as string | null) ?? null,
    last_verified_at: (row.last_verified_at as string | null) ?? null,
    verification_attempts: toNumber(row.verification_attempts),
    last_error: (row.last_error as string | null) ?? null,
    metadata:
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? (metadata as Record<string, unknown>)
        : {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapPaymentWithDetails(row: Record<string, unknown>): PaymentWithDetails {
  const accounts = row.accounts as { account_name?: string } | null;
  const funds = row.funds as { fund_name?: string } | null;
  return {
    ...mapPayment(row),
    account_name: accounts?.account_name ?? null,
    fund_name: funds?.fund_name ?? null,
  };
}

const DETAIL_SELECT = `
  *,
  accounts(account_name),
  funds(fund_name)
`;

export const paymentRepository = {
  async create(input: PaymentInsert): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        reference: input.reference,
        account_id: input.account_id,
        fund_id: input.fund_id,
        member_id: input.member_id ?? null,
        user_email: input.user_email,
        contributor_name: input.contributor_name,
        phone: input.phone ?? null,
        contribution_amount: input.contribution_amount,
        fee_amount: input.fee_amount,
        charged_amount: input.charged_amount,
        currency: input.currency ?? 'GHS',
        status: 'pending',
        metadata: input.metadata ?? {},
      })
      .select('*')
      .single();

    throwOnError(error, 'Failed to create payment');
    return mapPayment(data as Record<string, unknown>);
  },

  async findById(paymentId: string): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_id', paymentId)
      .maybeSingle();

    throwOnError(error, 'Failed to load payment');
    return data ? mapPayment(data as Record<string, unknown>) : null;
  },

  async findByIdWithDetails(paymentId: string): Promise<PaymentWithDetails | null> {
    const { data, error } = await supabase
      .from('payments')
      .select(DETAIL_SELECT)
      .eq('payment_id', paymentId)
      .maybeSingle();

    throwOnError(error, 'Failed to load payment');
    return data ? mapPaymentWithDetails(data as Record<string, unknown>) : null;
  },

  async findByReference(reference: string): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();

    throwOnError(error, 'Failed to load payment by reference');
    return data ? mapPayment(data as Record<string, unknown>) : null;
  },

  async update(paymentId: string, input: PaymentUpdate): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .update(input)
      .eq('payment_id', paymentId)
      .select('*')
      .single();

    throwOnError(error, 'Failed to update payment');
    return mapPayment(data as Record<string, unknown>);
  },

  async list(filters: PaymentListFilters = {}, limit = 500): Promise<PaymentWithDetails[]> {
    let query = supabase
      .from('payments')
      .select(DETAIL_SELECT)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.accountId) query = query.eq('account_id', filters.accountId);
    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

    const { data, error } = await query;
    throwOnError(error, 'Failed to list payments');

    let rows = (data || []).map((row) => mapPaymentWithDetails(row as Record<string, unknown>));

    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          row.reference.toLowerCase().includes(q) ||
          row.contributor_name.toLowerCase().includes(q) ||
          row.user_email.toLowerCase().includes(q) ||
          (row.account_name?.toLowerCase().includes(q) ?? false) ||
          (row.fund_name?.toLowerCase().includes(q) ?? false)
      );
    }

    return rows;
  },

  async countByStatus(): Promise<PaymentSummaryCounts> {
    const statuses: PaymentStatus[] = [
      'pending',
      'successful',
      'failed',
      'abandoned',
      'needs_review',
    ];

    const results = await Promise.all(
      statuses.map(async (status) => {
        const { count, error } = await supabase
          .from('payments')
          .select('payment_id', { count: 'exact', head: true })
          .eq('status', status);
        throwOnError(error, `Failed to count ${status} payments`);
        return [status, count ?? 0] as const;
      })
    );

    const counts: PaymentSummaryCounts = {
      pending: 0,
      successful: 0,
      failed: 0,
      abandoned: 0,
      needs_review: 0,
      total: 0,
    };

    for (const [status, count] of results) {
      counts[status] = count;
      counts.total += count;
    }

    return counts;
  },

  async findStaleForReconciliation(options: {
    olderThanIso: string;
    limit: number;
    maxAttempts: number;
  }): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .in('status', ['pending', 'needs_review'])
      .lt('created_at', options.olderThanIso)
      .lt('verification_attempts', options.maxAttempts)
      .order('created_at', { ascending: true })
      .limit(options.limit);

    throwOnError(error, 'Failed to load payments for reconciliation');
    return (data || []).map((row) => mapPayment(row as Record<string, unknown>));
  },
};
