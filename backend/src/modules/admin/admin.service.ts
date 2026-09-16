import { supabase } from '../../shared/supabase/client.js';
import { accountRepository } from '../account/account.repository.js';
import type { Account } from '../account/account.entity.js';

export interface PlatformDashboard {
  totalAccounts: number;
  activeAccounts: number;
  inactiveAccounts: number;
  suspendedAccounts: number;
  activeFunds: number;
  totalFunds: number;
  totalCollected: number;
  collectedThisMonth: number;
  pendingKycCount: number;
  monthlyTrend: Array<{
    month: string;
    online: number;
    manual: number;
    total: number;
  }>;
}

export interface AdminAccountSummary {
  account_id: string;
  account_name: string | null;
  account_logo: string | null;
  status: string;
  kyc_status: string;
  created_at: string;
  member_count: number;
  fund_count: number;
  active_fund_count: number;
  total_collected: number;
  online_collected: number;
  manual_collected: number;
}

export interface AdminAccountDetail extends AdminAccountSummary {
  short_url: string | null;
  updated_at: string;
}

function isInAccraMonth(dateStr: string, reference = new Date()): boolean {
  // Use UTC date parts — close enough for MVP; PRD specifies Africa/Accra later
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === reference.getFullYear() && d.getMonth() === reference.getMonth();
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export const adminService = {
  async getPlatformDashboard(): Promise<PlatformDashboard> {
    const now = new Date();
    const startTrend = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [accountsRes, fundsRes, contributionsRes, kycPendingRes] = await Promise.all([
      supabase.from('accounts').select('account_id, status'),
      supabase.from('funds').select('fund_id, is_active'),
      supabase
        .from('contributions')
        .select('amount, channel, status, date_received, created_at')
        .eq('status', 'confirmed')
        .gte('date_received', startTrend.toISOString()),
      supabase.from('accounts').select('account_id').eq('kyc_status', 'pending'),
    ]);

    if (accountsRes.error) throw new Error(accountsRes.error.message);
    if (fundsRes.error) throw new Error(fundsRes.error.message);
    if (contributionsRes.error) throw new Error(contributionsRes.error.message);
    if (kycPendingRes.error) throw new Error(kycPendingRes.error.message);

    const accounts = accountsRes.data || [];
    const funds = fundsRes.data || [];
    const contributions = contributionsRes.data || [];

    // All-time confirmed for totals (separate query — trend query is last 12 months only)
    const { data: allConfirmed, error: allErr } = await supabase
      .from('contributions')
      .select('amount, channel, status, date_received, created_at')
      .eq('status', 'confirmed');

    if (allErr) throw new Error(allErr.message);
    const allRows = allConfirmed || [];

    const totalCollected = allRows.reduce((s, c) => s + Number(c.amount), 0);
    const collectedThisMonth = allRows
      .filter((c) => isInAccraMonth(c.date_received || c.created_at, now))
      .reduce((s, c) => s + Number(c.amount), 0);

    const trendMap = new Map<string, { online: number; manual: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendMap.set(monthKey(d), { online: 0, manual: 0 });
    }

    for (const c of contributions) {
      const key = monthKey(new Date(c.date_received || c.created_at));
      if (!trendMap.has(key)) continue;
      const bucket = trendMap.get(key)!;
      const amt = Number(c.amount);
      if (c.channel === 'online') bucket.online += amt;
      else bucket.manual += amt;
    }

    const monthlyTrend = [...trendMap.entries()].map(([month, v]) => ({
      month,
      online: v.online,
      manual: v.manual,
      total: v.online + v.manual,
    }));

    return {
      totalAccounts: accounts.length,
      activeAccounts: accounts.filter((a) => a.status === 'active').length,
      inactiveAccounts: accounts.filter((a) => a.status === 'inactive').length,
      suspendedAccounts: accounts.filter((a) => a.status === 'suspended').length,
      activeFunds: funds.filter((f) => f.is_active).length,
      totalFunds: funds.length,
      totalCollected,
      collectedThisMonth,
      pendingKycCount: (kycPendingRes.data || []).length,
      monthlyTrend,
    };
  },

  async listAccounts(): Promise<AdminAccountSummary[]> {
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('account_id, account_name, account_logo, status, kyc_status, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    if (!accounts?.length) return [];

    const [membersRes, fundsRes, contributionsRes] = await Promise.all([
      supabase.from('members').select('account_id'),
      supabase.from('funds').select('account_id, is_active'),
      supabase.from('contributions').select('account_id, amount, channel, status'),
    ]);

    if (membersRes.error) throw new Error(membersRes.error.message);
    if (fundsRes.error) throw new Error(fundsRes.error.message);
    if (contributionsRes.error) throw new Error(contributionsRes.error.message);

    const memberCounts = new Map<string, number>();
    for (const m of membersRes.data || []) {
      memberCounts.set(m.account_id, (memberCounts.get(m.account_id) || 0) + 1);
    }

    const fundCounts = new Map<string, { total: number; active: number }>();
    for (const f of fundsRes.data || []) {
      const cur = fundCounts.get(f.account_id) || { total: 0, active: 0 };
      cur.total += 1;
      if (f.is_active) cur.active += 1;
      fundCounts.set(f.account_id, cur);
    }

    const collected = new Map<string, { total: number; online: number; manual: number }>();
    for (const c of contributionsRes.data || []) {
      if (c.status !== 'confirmed') continue;
      const cur = collected.get(c.account_id) || { total: 0, online: 0, manual: 0 };
      const amt = Number(c.amount);
      cur.total += amt;
      if (c.channel === 'online') cur.online += amt;
      else cur.manual += amt;
      collected.set(c.account_id, cur);
    }

    return accounts.map((a) => {
      const fc = fundCounts.get(a.account_id) || { total: 0, active: 0 };
      const col = collected.get(a.account_id) || { total: 0, online: 0, manual: 0 };
      return {
        account_id: a.account_id,
        account_name: a.account_name,
        account_logo: a.account_logo,
        status: a.status,
        kyc_status: a.kyc_status,
        created_at: a.created_at,
        member_count: memberCounts.get(a.account_id) || 0,
        fund_count: fc.total,
        active_fund_count: fc.active,
        total_collected: col.total,
        online_collected: col.online,
        manual_collected: col.manual,
      };
    });
  },

  async getAccountDetail(accountId: string): Promise<AdminAccountDetail | null> {
    const account = await accountRepository.findByAccountId(accountId);
    if (!account) return null;

    const list = await this.listAccounts();
    const summary = list.find((a) => a.account_id === accountId);
    if (!summary) {
      return {
        ...this.accountToSummary(account),
        member_count: 0,
        fund_count: 0,
        active_fund_count: 0,
        total_collected: 0,
        online_collected: 0,
        manual_collected: 0,
        short_url: account.short_url,
        updated_at: account.updated_at,
      };
    }

    return {
      ...summary,
      short_url: account.short_url,
      updated_at: account.updated_at,
    };
  },

  accountToSummary(account: Account): Omit<AdminAccountSummary, 'member_count' | 'fund_count' | 'active_fund_count' | 'total_collected' | 'online_collected' | 'manual_collected'> {
    return {
      account_id: account.account_id,
      account_name: account.account_name,
      account_logo: account.account_logo,
      status: account.status,
      kyc_status: account.kyc_status,
      created_at: account.created_at,
    };
  },
};
