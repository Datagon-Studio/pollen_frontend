import { supabase } from '../../shared/supabase/client.js';

function throwQueryError(context: string, error: { message: string } | null): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

export const managerRepository = {
  async findManagedAccounts(userId: string) {
    const { data: links, error: linksError } = await supabase
      .from('user_accounts')
      .select('account_id')
      .eq('user_id', userId)
      .in('role', ['admin', 'officer']);

    throwQueryError('Failed to fetch managed account links', linksError);

    const accountIds = (links || []).map((link) => link.account_id);
    if (accountIds.length === 0) return [];

    const { data, error } = await supabase
      .from('accounts')
      .select('account_id, account_name, account_logo, status, kyc_status, created_at')
      .in('account_id', accountIds)
      .order('created_at', { ascending: false });

    throwQueryError('Failed to fetch managed accounts', error);
    return data || [];
  },

  async findContributionAmounts(accountIds: string[]) {
    if (accountIds.length === 0) return [];

    const { data, error } = await supabase
      .from('contributions')
      .select('member_id, fund_id, amount, status, date_received, created_at')
      .in('account_id', accountIds);

    throwQueryError('Failed to fetch contribution totals', error);
    return data || [];
  },

  async findContributions(accountIds: string[], limit?: number) {
    if (accountIds.length === 0) return [];

    let query = supabase
      .from('contributions')
      .select(`
        *,
        members(full_name),
        funds(fund_name)
      `)
      .in('account_id', accountIds)
      .order('date_received', { ascending: false });

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    throwQueryError('Failed to fetch managed contributions', error);
    return data || [];
  },

  async findReversalAudits(contributionIds: string[]) {
    if (contributionIds.length === 0) return [];

    const { data, error } = await supabase
      .from('audit_logs')
      .select('entity_id, action_details, created_at, user_id')
      .eq('action_type', 'CONTRIBUTION_REVERSED')
      .in('entity_id', contributionIds);

    if (error) {
      console.error('Failed to fetch reversal records:', error);
      return [];
    }
    return data || [];
  },

  async findExpenses(accountIds: string[]) {
    if (accountIds.length === 0) return [];

    const { data, error } = await supabase
      .from('expenses')
      .select('account_id, amount')
      .in('account_id', accountIds);

    throwQueryError('Failed to fetch managed expenses', error);
    return data || [];
  },

  async findMembers(accountIds: string[]) {
    if (accountIds.length === 0) return [];

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .in('account_id', accountIds)
      .order('created_at', { ascending: false });

    throwQueryError('Failed to fetch managed members', error);
    return data || [];
  },

  async findFunds(accountIds: string[]) {
    if (accountIds.length === 0) return [];

    const { data, error } = await supabase
      .from('funds')
      .select('*')
      .in('account_id', accountIds)
      .order('created_at', { ascending: false });

    throwQueryError('Failed to fetch managed funds', error);
    return data || [];
  },

  async findSettlements(accountIds: string[]) {
    if (accountIds.length === 0) return [];

    const { data, error } = await supabase
      .from('fund_settlements')
      .select(`
        *,
        funds(fund_name)
      `)
      .in('account_id', accountIds)
      .order('settlement_date', { ascending: false });

    throwQueryError('Failed to fetch managed settlements', error);
    return data || [];
  },
};
