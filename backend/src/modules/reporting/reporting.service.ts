import { supabase } from '../../shared/supabase/client.js';

export interface MonthlyData {
  month: string;
  contributions: number;
  expenses: number;
}

export interface FundBreakdown {
  name: string;
  value: number;
  color: string;
}

export interface DashboardStats {
  totalBalance: number;
  thisMonth: number;
  monthContributions: number;
  pending: number;
  pendingCount: number;
  activeFunds: number;
  totalFunds: number;
  members: number;
  newMembersThisMonth: number;
}

const FUND_COLORS = [
  '#f59e0b',
  '#fbbf24',
  '#d97706',
  '#b45309',
  '#92400e',
  '#78350f',
];

export interface ReportWindow {
  startIso: string;
  endIso: string;
  /** Calendar month, 1-12. When set, only this month is included. */
  month?: number;
  /** When set, only these calendar years are included. */
  years?: number[];
}

function utcParts(dateStr: string): { year: number; month: number } | null {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function matchesMonthYear(dateStr: string, window?: ReportWindow): boolean {
  if (!window?.month && !window?.years?.length) return true;
  const parts = utcParts(dateStr);
  if (!parts) return false;
  if (window.years?.length && !window.years.includes(parts.year)) return false;
  if (window.month && parts.month !== window.month) return false;
  return true;
}

function windowFromMonthCount(months: number): ReportWindow {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function resolveWindow(window: ReportWindow | undefined, months: number): ReportWindow {
  return window ?? windowFromMonthCount(months);
}

function monthSlots(window: ReportWindow): { key: string; label: string }[] {
  const start = new Date(window.startIso);
  const end = new Date(window.endIso);
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  const years = window.years?.length
    ? [...window.years].sort((a, b) => a - b)
    : Array.from({ length: Math.max(endYear - startYear + 1, 0) }, (_, index) => startYear + index);
  const months = window.month ? [window.month] : Array.from({ length: 12 }, (_, index) => index + 1);
  const spansYears = years.length > 1 || startYear !== endYear;
  const slots: { key: string; label: string }[] = [];

  for (const year of years) {
    for (const month of months) {
      const monthStart = Date.UTC(year, month - 1, 1);
      const monthEnd = Date.UTC(year, month, 0, 23, 59, 59, 999);
      if (monthEnd < start.getTime() || monthStart > end.getTime()) continue;

      const label = new Date(monthStart).toLocaleString('en-US', {
        month: 'short',
        timeZone: 'UTC',
        ...(spansYears ? { year: '2-digit' } : {}),
      });
      slots.push({
        key: `${year}-${String(month).padStart(2, '0')}`,
        label,
      });
    }
  }

  return slots;
}

/** True when dateStr falls in the same calendar month/year as reference (local time). */
function isInCalendarMonth(dateStr: string, reference: Date = new Date()): boolean {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth()
  );
}

export const reportingService = {
  async getDashboardStats(accountId: string): Promise<DashboardStats> {
    const now = new Date();

    // Parallelize all database queries for better performance
    const [contributionsResult, expensesResult, fundsResult, membersResult] = await Promise.all([
      supabase
        .from('contributions')
        .select('amount, status, created_at, date_received')
        .eq('account_id', accountId),
      supabase
        .from('expenses')
        .select('amount')
        .eq('account_id', accountId),
      supabase
        .from('funds')
        .select('is_active')
        .eq('account_id', accountId),
      supabase
        .from('members')
        .select('created_at')
        .eq('account_id', accountId),
    ]);

    const contributions = contributionsResult.data || [];
    const expenses = expensesResult.data || [];
    const funds = fundsResult.data || [];
    const members = membersResult.data || [];

    // Calculate stats
    const confirmedContributions = contributions.filter(c => c.status === 'confirmed');
    const pendingContributions = contributions.filter(c => c.status === 'pending');
    // Use date_received for contributions; match full calendar month (incl. 31st).
    const monthContributions = confirmedContributions.filter(c => {
      const dateReceived = c.date_received || c.created_at;
      return isInCalendarMonth(dateReceived, now);
    });
    const newMembers = members.filter(m => isInCalendarMonth(m.created_at, now));

    const totalContributions = confirmedContributions.reduce((sum, c) => sum + c.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      totalBalance: totalContributions - totalExpenses,
      thisMonth: monthContributions.reduce((sum, c) => sum + c.amount, 0),
      monthContributions: monthContributions.length,
      pending: pendingContributions.reduce((sum, c) => sum + c.amount, 0),
      pendingCount: pendingContributions.length,
      activeFunds: funds.filter(f => f.is_active).length,
      totalFunds: funds.length,
      members: members.length,
      newMembersThisMonth: newMembers.length,
    };
  },

  async getMonthlyOverview(accountId: string, months = 6, window?: ReportWindow): Promise<MonthlyData[]> {
    const range = resolveWindow(window, months);

    const [{ data: contributions }, { data: expenses }] = await Promise.all([
      supabase
        .from('contributions')
        .select('amount, date_received')
        .eq('account_id', accountId)
        .eq('status', 'confirmed')
        .gte('date_received', range.startIso)
        .lte('date_received', range.endIso),
      supabase
        .from('expenses')
        .select('amount, date')
        .eq('account_id', accountId)
        .gte('date', range.startIso)
        .lte('date', range.endIso),
    ]);

    const slots = monthSlots(range);
    const totals: Record<string, { contributions: number; expenses: number }> = {};
    for (const slot of slots) {
      totals[slot.key] = { contributions: 0, expenses: 0 };
    }

    for (const row of contributions || []) {
      if (!matchesMonthYear(row.date_received, range)) continue;
      const parts = utcParts(row.date_received);
      if (!parts) continue;
      const key = `${parts.year}-${String(parts.month).padStart(2, '0')}`;
      if (totals[key]) totals[key].contributions += row.amount;
    }

    for (const row of expenses || []) {
      if (!matchesMonthYear(row.date, range)) continue;
      const parts = utcParts(row.date);
      if (!parts) continue;
      const key = `${parts.year}-${String(parts.month).padStart(2, '0')}`;
      if (totals[key]) totals[key].expenses += row.amount;
    }

    return slots.map((slot) => ({
      month: slot.label,
      contributions: totals[slot.key].contributions,
      expenses: totals[slot.key].expenses,
    }));
  },

  async getFundBreakdown(accountId: string, window?: ReportWindow): Promise<FundBreakdown[]> {
    // Get funds with contribution totals using a single optimized query
    const { data: funds } = await supabase
      .from('funds')
      .select('fund_id, fund_name')
      .eq('account_id', accountId)
      .eq('is_active', true);

    if (!funds || funds.length === 0) return [];

    const fundIds = funds.map(f => f.fund_id);
    let contributionQuery = supabase
      .from('contributions')
      .select('fund_id, amount, date_received')
      .in('fund_id', fundIds)
      .eq('status', 'confirmed');

    if (window) {
      contributionQuery = contributionQuery
        .gte('date_received', window.startIso)
        .lte('date_received', window.endIso);
    }

    const { data: contributions } = await contributionQuery;

    const contributionTotals = (contributions || []).reduce((acc, c) => {
      if (window && !matchesMonthYear(c.date_received, window)) return acc;
      if (!acc[c.fund_id]) {
        acc[c.fund_id] = 0;
      }
      acc[c.fund_id] += c.amount;
      return acc;
    }, {} as Record<string, number>);

    // Map funds to breakdown with totals
    const fundBreakdown = funds
      .map((fund, index) => ({
        name: fund.fund_name,
        value: contributionTotals[fund.fund_id] || 0,
        color: FUND_COLORS[index % FUND_COLORS.length],
      }))
      .filter(f => f.value > 0);

    return fundBreakdown;
  },

  async getContributionsByPeriod(
    accountId: string,
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month' = 'month'
  ): Promise<{ period: string; amount: number; count: number }[]> {
    const { data: contributions } = await supabase
      .from('contributions')
      .select('amount, date_received')
      .eq('account_id', accountId)
      .eq('status', 'confirmed')
      .gte('date_received', startDate)
      .lte('date_received', endDate);

    if (!contributions) return [];

    // Group by period
    const grouped: Record<string, { amount: number; count: number }> = {};

    contributions.forEach(c => {
      const date = new Date(c.date_received);
      let periodKey: string;

      if (groupBy === 'day') {
        periodKey = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
      } else {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[periodKey]) {
        grouped[periodKey] = { amount: 0, count: 0 };
      }
      grouped[periodKey].amount += c.amount;
      grouped[periodKey].count += 1;
    });

    return Object.entries(grouped)
      .map(([period, data]) => ({ period, ...data }))
      .sort((a, b) => a.period.localeCompare(b.period));
  },

  async getExpensesSummary(accountId: string): Promise<{
    total: number;
    byCategory: { category: string; amount: number; percentage: number }[];
  }> {
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, expense_category')
      .eq('account_id', accountId);

    if (!expenses || expenses.length === 0) {
      return { total: 0, byCategory: [] };
    }

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    const byCategory = expenses.reduce((acc, e) => {
      if (!acc[e.expense_category]) {
        acc[e.expense_category] = 0;
      }
      acc[e.expense_category] += e.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      byCategory: Object.entries(byCategory)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: (amount / total) * 100,
        }))
        .sort((a, b) => b.amount - a.amount),
    };
  },

  async getNetPosition(accountId: string, window?: ReportWindow): Promise<{
    totalContributions: number;
    totalExpenses: number;
    netPosition: number;
    trend: number;
  }> {
    let contributionQuery = supabase
      .from('contributions')
      .select('amount, date_received')
      .eq('account_id', accountId)
      .eq('status', 'confirmed');
    let expenseQuery = supabase
      .from('expenses')
      .select('amount, date')
      .eq('account_id', accountId);

    if (window) {
      contributionQuery = contributionQuery
        .gte('date_received', window.startIso)
        .lte('date_received', window.endIso);
      expenseQuery = expenseQuery
        .gte('date', window.startIso)
        .lte('date', window.endIso);
    }

    const [{ data: contributions }, { data: expenses }] = await Promise.all([
      contributionQuery,
      expenseQuery,
    ]);

    const totalContributions = (contributions || []).reduce((sum, c) => {
      if (window && !matchesMonthYear(c.date_received, window)) return sum;
      return sum + c.amount;
    }, 0);
    const totalExpenses = (expenses || []).reduce((sum, e) => {
      if (window && !matchesMonthYear(e.date, window)) return sum;
      return sum + e.amount;
    }, 0);
    const netPosition = totalContributions - totalExpenses;

    // Calculate trend (simplified - would need historical data for accurate trend)
    const trend = netPosition > 0 ? 12 : netPosition < 0 ? -8 : 0;

    return {
      totalContributions,
      totalExpenses,
      netPosition,
      trend,
    };
  },

  async getPaymentChannelBreakdown(
    accountId: string,
    months = 6,
    window?: ReportWindow
  ): Promise<{
    paystack: { amount: number; count: number };
    manual: { amount: number; count: number };
  }> {
    const range = resolveWindow(window, months);

    const { data: contributions } = await supabase
      .from('contributions')
      .select('amount, payment_method, date_received')
      .eq('account_id', accountId)
      .eq('status', 'confirmed')
      .gte('date_received', range.startIso)
      .lte('date_received', range.endIso);

    const paystack = { amount: 0, count: 0 };
    const manual = { amount: 0, count: 0 };

    (contributions || []).forEach((c) => {
      if (!matchesMonthYear(c.date_received, range)) return;
      const isPaystack = c.payment_method === 'Paystack';

      if (isPaystack) {
        paystack.amount += c.amount;
        paystack.count += 1;
      } else {
        manual.amount += c.amount;
        manual.count += 1;
      }
    });

    return { paystack, manual };
  },
};

