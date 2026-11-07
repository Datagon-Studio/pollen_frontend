import { supabase } from '../../shared/supabase/client.js';
import {
  SettlementRequestHistoryRow,
  SettlementRequestRow,
  SettlementRequestStatus,
} from './settlement-request.entity.js';

export interface SettlementRequestInsert {
  account_id: string;
  fund_id: string;
  requested_by_user_id: string;
  amount: number;
  request_note: string | null;
  destination_type: 'bank' | 'mobile_money';
  destination_account_name: string;
  destination_account_number: string;
  destination_bank_name: string | null;
  destination_bank_branch: string | null;
  destination_provider: string | null;
}

export interface SettlementRequestStatusUpdate {
  status: Exclude<SettlementRequestStatus, 'pending'>;
  admin_note: string | null;
  reviewed_by_user_id?: string;
  reviewed_at?: string;
  disbursed_at?: string;
  disbursement_reference?: string | null;
}

function throwOnError(error: { message: string } | null, action: string): void {
  if (error) throw new Error(`${action}: ${error.message}`);
}

export const settlementRequestRepository = {
  async list(filters: {
    accountIds?: string[];
    accountId?: string;
    fundId?: string;
    status?: SettlementRequestStatus;
  }): Promise<SettlementRequestRow[]> {
    let query = supabase
      .from('settlement_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.accountIds) {
      if (filters.accountIds.length === 0) return [];
      query = query.in('account_id', filters.accountIds);
    }
    if (filters.accountId) query = query.eq('account_id', filters.accountId);
    if (filters.fundId) query = query.eq('fund_id', filters.fundId);
    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    throwOnError(error, 'Failed to list settlement requests');
    return (data || []) as SettlementRequestRow[];
  },

  async findById(requestId: string): Promise<SettlementRequestRow | null> {
    const { data, error } = await supabase
      .from('settlement_requests')
      .select('*')
      .eq('request_id', requestId)
      .maybeSingle();

    throwOnError(error, 'Failed to load settlement request');
    return (data as SettlementRequestRow | null) ?? null;
  },

  async findPendingByFund(fundId: string): Promise<SettlementRequestRow | null> {
    const { data, error } = await supabase
      .from('settlement_requests')
      .select('*')
      .eq('fund_id', fundId)
      .eq('status', 'pending')
      .maybeSingle();

    throwOnError(error, 'Failed to check pending settlement requests');
    return (data as SettlementRequestRow | null) ?? null;
  },

  async create(input: SettlementRequestInsert): Promise<SettlementRequestRow> {
    const { data, error } = await supabase
      .from('settlement_requests')
      .insert({
        ...input,
        status: 'pending',
      })
      .select('*')
      .single();

    throwOnError(error, 'Failed to create settlement request');
    return data as SettlementRequestRow;
  },

  async updateStatus(
    requestId: string,
    input: SettlementRequestStatusUpdate
  ): Promise<SettlementRequestRow> {
    const { data, error } = await supabase
      .from('settlement_requests')
      .update(input)
      .eq('request_id', requestId)
      .select('*')
      .single();

    throwOnError(error, 'Failed to update settlement request');
    return data as SettlementRequestRow;
  },

  async listHistory(requestId: string): Promise<SettlementRequestHistoryRow[]> {
    const { data, error } = await supabase
      .from('settlement_request_history')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    throwOnError(error, 'Failed to load settlement request history');
    return (data || []) as SettlementRequestHistoryRow[];
  },

  async addHistory(input: {
    request_id: string;
    previous_status: SettlementRequestStatus | null;
    new_status: SettlementRequestStatus;
    changed_by_user_id: string;
    note: string | null;
  }): Promise<void> {
    const { error } = await supabase.from('settlement_request_history').insert(input);
    throwOnError(error, 'Failed to write settlement request history');
  },

  async sumReservedForFund(fundId: string): Promise<number> {
    const { data, error } = await supabase
      .from('settlement_requests')
      .select('amount')
      .eq('fund_id', fundId)
      .in('status', ['pending', 'approved', 'disbursed']);

    throwOnError(error, 'Failed to sum reserved settlement requests');
    return (data || []).reduce((sum, row) => sum + Number(row.amount), 0);
  },

  async sumDisbursedForFund(fundId: string): Promise<number> {
    const { data, error } = await supabase
      .from('settlement_requests')
      .select('amount')
      .eq('fund_id', fundId)
      .eq('status', 'disbursed');

    throwOnError(error, 'Failed to sum disbursed settlements');
    return (data || []).reduce((sum, row) => sum + Number(row.amount), 0);
  },
};
