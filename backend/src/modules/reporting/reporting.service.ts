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

  async getMonthlyOverview(accountId: string, months = 6): Promise<MonthlyData[]> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // Get contributions for the period
    const { data: contributions } = await supabase
      .from('contributions')
      .select('amount, status, date_received')
      .eq('account_id', accountId)
      .eq('status', 'confirmed')
      .gte('date_received', startDate.toISOString());

    // Get expenses for the period
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, date')
      .eq('account_id', accountId)
      .gte('date', startDate.toISOString());

    // Group by month
    const monthlyData: Record<string, { contributions: number; expenses: number }> = {};
    
    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
      const monthKey = date.toLocaleString('en-US', { month: 'short' });
      monthlyData[monthKey] = { contributions: 0, expenses: 0 };
    }

    (contributions || []).forEach(c => {
      const date = new Date(c.date_received);
      const monthKey = date.toLocaleString('en-US', { month: 'short' });
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].contributions += c.amount;
      }
    });

    (expenses || []).forEach(e => {
      const date = new Date(e.date);
      const monthKey = date.toLocaleString('en-US', { month: 'short' });
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].expenses += e.amount;
      }
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      ...data,
    }));
  },

  async getFundBreakdown(accountId: string): Promise<FundBreakdown[]> {
    // Get funds with contribution totals using a single optimized query
    const { data: funds } = await supabase
      .from('funds')
      .select('fund_id, fund_name')
      .eq('account_id', accountId)
      .eq('is_active', true);

    if (!funds || funds.length === 0) return [];

    // Get all confirmed contributions for all funds in a single query
    const fundIds = funds.map(f => f.fund_id);
    const { data: contributions } = await supabase
      .from('contributions')
      .select('fund_id, amount')
      .in('fund_id', fundIds)
      .eq('status', 'confirmed');

    // Calculate totals per fund
    const contributionTotals = (contributions || []).reduce((acc, c) => {
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

  async getNetPosition(accountId: string): Promise<{
    totalContributions: number;
    totalExpenses: number;
    netPosition: number;
    trend: number;
  }> {
    // Get all confirmed contributions
    const { data: contributions } = await supabase
      .from('contributions')
      .select('amount')
      .eq('account_id', accountId)
      .eq('status', 'confirmed');

    // Get all expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('account_id', accountId);

    const totalContributions = (contributions || []).reduce((sum, c) => sum + c.amount, 0);
    const totalExpenses = (expenses || []).reduce((sum, e) => sum + e.amount, 0);
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
};

