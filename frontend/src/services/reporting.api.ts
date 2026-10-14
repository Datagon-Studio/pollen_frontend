import { request } from './api-client';

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

export interface ContributionsByPeriod {
  period: string;
  amount: number;
  count: number;
}

export interface ExpensesSummary {
  total: number;
  byCategory: { category: string; amount: number; percentage: number }[];
}

export interface NetPosition {
  totalContributions: number;
  totalExpenses: number;
  netPosition: number;
  trend: number;
}

export interface PaymentChannelBreakdown {
  paystack: { amount: number; count: number };
  manual: { amount: number; count: number };
}

export interface ReportQuery {
  startDate: string;
  endDate: string;
  month?: number;
  years?: number[];
}

function reportParams(accountId: string, query: ReportQuery): string {
  const params = new URLSearchParams({ accountId });
  if (query.startDate) params.set('startDate', query.startDate);
  if (query.endDate) params.set('endDate', query.endDate);
  if (query.month) params.set('month', String(query.month));
  if (query.years?.length) params.set('years', query.years.join(','));
  return params.toString();
}

export const reportingApi = {
  async getDashboard(accountId: string): Promise<DashboardStats> {
    const response = await request<DashboardStats>(`/reports/dashboard?accountId=${accountId}`, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch dashboard stats');
    }

    return response.data;
  },

  async getMonthlyOverview(accountId: string, query: ReportQuery): Promise<MonthlyData[]> {
    const response = await request<MonthlyData[]>(`/reports/monthly?${reportParams(accountId, query)}`, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch monthly overview');
    }

    return response.data;
  },

  async getFundBreakdown(accountId: string, query: ReportQuery): Promise<FundBreakdown[]> {
    const response = await request<FundBreakdown[]>(`/reports/fund-breakdown?${reportParams(accountId, query)}`, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch fund breakdown');
    }

    return response.data;
  },

  async getContributionsByPeriod(
    accountId: string,
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month' = 'month'
  ): Promise<ContributionsByPeriod[]> {
    const response = await request<ContributionsByPeriod[]>(
      `/reports/contributions-by-period?accountId=${accountId}&startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`,
      { method: 'GET' }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch contributions by period');
    }

    return response.data;
  },

  async getExpensesSummary(accountId: string): Promise<ExpensesSummary> {
    const response = await request<ExpensesSummary>(`/reports/expenses-summary?accountId=${accountId}`, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch expenses summary');
    }

    return response.data;
  },

  async getNetPosition(accountId: string, query: ReportQuery): Promise<NetPosition> {
    const response = await request<NetPosition>(`/reports/net-position?${reportParams(accountId, query)}`, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch net position');
    }

    return response.data;
  },

  async getPaymentChannelBreakdown(
    accountId: string,
    query: ReportQuery
  ): Promise<PaymentChannelBreakdown> {
    const response = await request<PaymentChannelBreakdown>(
      `/reports/payment-channels?${reportParams(accountId, query)}`,
      { method: 'GET' }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch payment channel breakdown');
    }

    return response.data;
  },
};

