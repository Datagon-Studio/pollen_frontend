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
  total_disbursed: number;
  expense_count: number;
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

const REPORT_RECORD_LIMIT = 500;
const REPORT_DURATIONS = ['7d', '30d', '3m', '6m', '12m', 'ytd', 'all', 'custom'] as const;

export type ReportDuration = (typeof REPORT_DURATIONS)[number];

export class ReportQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportQueryError';
  }
}

export interface PlatformReportPoint {
  month: string;
  label: string;
  online: number;
  manual: number;
  total: number;
}

export interface PlatformReportRecord {
  contribution_id: string;
  account_id: string;
  account_name: string | null;
  fund_id: string;
  fund_name: string | null;
  member_id: string | null;
  member_name: string | null;
  amount: number;
  channel: 'offline' | 'online';
  payment_method: string | null;
  payment_reference: string | null;
  status: string;
  date_received: string;
  comment: string | null;
  received_by_user_id: string | null;
  created_at: string;
}

export interface PlatformReport {
  duration: ReportDuration;
  startDate: string | null;
  endDate: string | null;
  recordCount: number;
  recordsLimited: boolean;
  summary: {
    collected: number;
    online: number;
    manual: number;
    contributionCount: number;
    accountCount: number;
    fundCount: number;
    expenses: number;
    net: number;
  };
  trend: PlatformReportPoint[];
  records: PlatformReportRecord[];
}

type ContributionAgg = {
  amount: number | string;
  channel: string | null;
  date_received: string;
  account_id: string;
  fund_id: string;
  status: string;
};

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

function isReportDuration(value: string): value is ReportDuration {
  return (REPORT_DURATIONS as readonly string[]).includes(value);
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function addUtcDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function mondayOf(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return date.toISOString().slice(0, 10);
}

function utcDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function daySpan(start: string, end: string): number {
  const ms = Date.parse(`${end}T00:00:00.000Z`) - Date.parse(`${start}T00:00:00.000Z`);
  return Math.floor(ms / 86_400_000) + 1;
}

type ReportGrain = 'day' | 'week' | 'month';

function grainForSpan(start: string, end: string): ReportGrain {
  const days = daySpan(start, end);
  if (days <= 31) return 'day';
  if (days <= 120) return 'week';
  return 'month';
}

function formatDayLabel(iso: string, withYear: boolean): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GH', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    ...(withYear ? { year: '2-digit' } : {}),
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GH', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function resolveReportBounds(
  duration: ReportDuration,
  dateFrom?: string,
  dateTo?: string
): { startDate: string | null; endDate: string | null } {
  const today = utcToday();
  if (duration === 'all') return { startDate: null, endDate: null };
  if (duration === 'custom') {
    if (!dateFrom || !dateTo || !isIsoDate(dateFrom) || !isIsoDate(dateTo)) {
      throw new ReportQueryError('Choose a valid start and end date');
    }
    if (dateFrom > dateTo) {
      throw new ReportQueryError('Start date must be on or before the end date');
    }
    return { startDate: dateFrom, endDate: dateTo };
  }
  if (duration === 'ytd') {
    return { startDate: `${today.slice(0, 4)}-01-01`, endDate: today };
  }
  if (duration === '7d' || duration === '30d') {
    const daysBack = duration === '7d' ? 6 : 29;
    return { startDate: addUtcDays(today, -daysBack), endDate: today };
  }
  const monthsBack = duration === '3m' ? 2 : duration === '6m' ? 5 : 11;
  const [year, month] = today.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1 - monthsBack, 1));
  return { startDate: start.toISOString().slice(0, 10), endDate: today };
}

function buildTrendSlots(
  start: string,
  end: string,
  grain: ReportGrain
): Array<{ key: string; label: string }> {
  const withYear = start.slice(0, 4) !== end.slice(0, 4);
  if (grain === 'day') {
    const slots: Array<{ key: string; label: string }> = [];
    for (let cursor = start; cursor <= end; cursor = addUtcDays(cursor, 1)) {
      slots.push({ key: cursor, label: formatDayLabel(cursor, withYear) });
      if (slots.length > 400) break;
    }
    return slots;
  }
  if (grain === 'week') {
    const slots: Array<{ key: string; label: string }> = [];
    const last = mondayOf(end);
    for (let cursor = mondayOf(start); cursor <= last; cursor = addUtcDays(cursor, 7)) {
      const labelDate = cursor < start ? start : cursor;
      slots.push({ key: cursor, label: formatDayLabel(labelDate, withYear) });
    }
    return slots;
  }

  const slots: Array<{ key: string; label: string }> = [];
  let year = Number(start.slice(0, 4));
  let month = Number(start.slice(5, 7));
  const endKey = end.slice(0, 7);
  while (`${year}-${String(month).padStart(2, '0')}` <= endKey) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    slots.push({ key, label: formatMonthLabel(key) });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    if (slots.length > 240) break;
  }
  return slots;
}

function trendKey(day: string, grain: ReportGrain): string {
  if (grain === 'day') return day;
  if (grain === 'week') return mondayOf(day);
  return day.slice(0, 7);
}

async function fetchPages<T>(
  load: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await load(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
  }
}

function mapReportRecord(row: Record<string, unknown>): PlatformReportRecord {
  const members = row.members as { full_name?: string } | null;
  const funds = row.funds as { fund_name?: string } | null;
  const accounts = row.accounts as { account_name?: string } | null;
  const memberId = (row.member_id as string | null) ?? null;
  return {
    contribution_id: row.contribution_id as string,
    account_id: row.account_id as string,
    account_name: accounts?.account_name ?? null,
    fund_id: row.fund_id as string,
    fund_name: funds?.fund_name ?? null,
    member_id: memberId,
    member_name: members?.full_name ?? (memberId ? null : 'Anonymous'),
    amount: Number(row.amount),
    channel: row.channel as 'offline' | 'online',
    payment_method: (row.payment_method as string | null) ?? null,
    payment_reference: (row.payment_reference as string | null) ?? null,
    status: row.status as string,
    date_received: row.date_received as string,
    comment: (row.comment as string | null) ?? null,
    received_by_user_id: (row.received_by_user_id as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

export const adminService = {
  async getPlatformDashboard(): Promise<PlatformDashboard> {
    const now = new Date();

    const [accountsRes, fundsRes, contributionsRes, kycPendingRes] = await Promise.all([
      supabase.from('accounts').select('account_id, status'),
      supabase.from('funds').select('fund_id, is_active'),
      supabase
        .from('contributions')
        .select('amount, channel, date_received, created_at')
        .eq('status', 'confirmed'),
      supabase.from('accounts').select('account_id').eq('kyc_status', 'pending'),
    ]);

    if (accountsRes.error) throw new Error(accountsRes.error.message);
    if (fundsRes.error) throw new Error(fundsRes.error.message);
    if (contributionsRes.error) throw new Error(contributionsRes.error.message);
    if (kycPendingRes.error) throw new Error(kycPendingRes.error.message);

    const accounts = accountsRes.data || [];
    const funds = fundsRes.data || [];
    const allRows = contributionsRes.data || [];

    const totalCollected = allRows.reduce((s, c) => s + Number(c.amount), 0);
    const collectedThisMonth = allRows
      .filter((c) => isInAccraMonth(c.date_received || c.created_at, now))
      .reduce((s, c) => s + Number(c.amount), 0);

    const trendMap = new Map<string, { online: number; manual: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendMap.set(monthKey(d), { online: 0, manual: 0 });
    }

    for (const c of allRows) {
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

  async getPlatformReport(query: {
    duration?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PlatformReport> {
    const rawDuration = query.duration?.trim() || '30d';
    if (!isReportDuration(rawDuration)) {
      throw new ReportQueryError('Choose a supported duration');
    }
    const bounds = resolveReportBounds(rawDuration, query.dateFrom, query.dateTo);
    const startIso = bounds.startDate ? `${bounds.startDate}T00:00:00.000Z` : null;
    const endIso = bounds.endDate ? `${bounds.endDate}T23:59:59.999Z` : null;

    const [contributions, expenses, recordResult] = await Promise.all([
      fetchPages<ContributionAgg>((from, to) => {
        let request = supabase
          .from('contributions')
          .select('amount, channel, date_received, account_id, fund_id, status')
          .order('date_received', { ascending: true })
          .order('contribution_id', { ascending: true })
          .range(from, to);
        if (startIso) request = request.gte('date_received', startIso);
        if (endIso) request = request.lte('date_received', endIso);
        return request;
      }),
      fetchPages<{ amount: number | string }>((from, to) => {
        let request = supabase
          .from('expenses')
          .select('amount, date')
          .order('date', { ascending: true })
          .order('expense_id', { ascending: true })
          .range(from, to);
        if (bounds.startDate) request = request.gte('date', bounds.startDate);
        if (bounds.endDate) request = request.lte('date', bounds.endDate);
        return request;
      }),
      (() => {
        let request = supabase
          .from('contributions')
          .select(`
            *,
            members(full_name),
            funds(fund_name),
            accounts(account_name)
          `)
          .order('date_received', { ascending: false })
          .limit(REPORT_RECORD_LIMIT);
        if (startIso) request = request.gte('date_received', startIso);
        if (endIso) request = request.lte('date_received', endIso);
        return request;
      })(),
    ]);

    if (recordResult.error) throw new Error(recordResult.error.message);

    const confirmed = contributions.filter((row) => row.status === 'confirmed');
    const accounts = new Set<string>();
    const funds = new Set<string>();
    let collected = 0;
    let online = 0;
    let manual = 0;
    for (const row of confirmed) {
      const amount = Number(row.amount);
      collected += amount;
      if (row.channel === 'online') online += amount;
      else manual += amount;
      accounts.add(row.account_id);
      funds.add(row.fund_id);
    }
    const expenseTotal = expenses.reduce((sum, row) => sum + Number(row.amount), 0);

    let trendStart = bounds.startDate;
    let trendEnd = bounds.endDate;
    if (!trendStart || !trendEnd) {
      const days = contributions
        .map((row) => utcDay(row.date_received))
        .filter((day) => isIsoDate(day))
        .sort();
      if (days.length > 0) {
        trendStart = days[0];
        const last = days[days.length - 1];
        const today = utcToday();
        trendEnd = last > today ? last : today;
      }
    }

    let trend: PlatformReportPoint[] = [];
    if (trendStart && trendEnd) {
      const grain = grainForSpan(trendStart, trendEnd);
      const buckets = new Map(buildTrendSlots(trendStart, trendEnd, grain).map((slot) => [
        slot.key,
        { online: 0, manual: 0, label: slot.label },
      ]));
      for (const row of confirmed) {
        const key = trendKey(utcDay(row.date_received), grain);
        const bucket = buckets.get(key);
        if (!bucket) continue;
        const amount = Number(row.amount);
        if (row.channel === 'online') bucket.online += amount;
        else bucket.manual += amount;
      }
      trend = [...buckets.entries()].map(([month, bucket]) => ({
        month,
        label: bucket.label,
        online: bucket.online,
        manual: bucket.manual,
        total: bucket.online + bucket.manual,
      }));
    }

    const records = (recordResult.data || []).map((row) =>
      mapReportRecord(row as Record<string, unknown>)
    );

    return {
      duration: rawDuration,
      startDate: bounds.startDate,
      endDate: bounds.endDate,
      recordCount: contributions.length,
      recordsLimited: contributions.length > records.length,
      summary: {
        collected,
        online,
        manual,
        contributionCount: confirmed.length,
        accountCount: accounts.size,
        fundCount: funds.size,
        expenses: expenseTotal,
        net: collected - expenseTotal,
      },
      trend,
      records,
    };
  },

  async listAccounts(): Promise<AdminAccountSummary[]> {
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('account_id, account_name, account_logo, status, kyc_status, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    if (!accounts?.length) return [];

    const [membersRes, fundsRes, contributionsRes, expensesRes] = await Promise.all([
      supabase.from('members').select('account_id'),
      supabase.from('funds').select('account_id, is_active'),
      supabase.from('contributions').select('account_id, amount, channel, status'),
      supabase.from('expenses').select('account_id, amount'),
    ]);

    if (membersRes.error) throw new Error(membersRes.error.message);
    if (fundsRes.error) throw new Error(fundsRes.error.message);
    if (contributionsRes.error) throw new Error(contributionsRes.error.message);
    if (expensesRes.error) throw new Error(expensesRes.error.message);

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

    const disbursed = new Map<string, { total: number; count: number }>();
    for (const e of expensesRes.data || []) {
      const cur = disbursed.get(e.account_id) || { total: 0, count: 0 };
      cur.total += Number(e.amount);
      cur.count += 1;
      disbursed.set(e.account_id, cur);
    }

    return accounts.map((a) => {
      const fc = fundCounts.get(a.account_id) || { total: 0, active: 0 };
      const col = collected.get(a.account_id) || { total: 0, online: 0, manual: 0 };
      const dis = disbursed.get(a.account_id) || { total: 0, count: 0 };
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
        total_disbursed: dis.total,
        expense_count: dis.count,
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
        total_disbursed: 0,
        expense_count: 0,
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

  accountToSummary(account: Account): Omit<AdminAccountSummary, 'member_count' | 'fund_count' | 'active_fund_count' | 'total_collected' | 'online_collected' | 'manual_collected' | 'total_disbursed' | 'expense_count'> {
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
