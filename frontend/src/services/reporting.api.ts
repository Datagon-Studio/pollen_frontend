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

  async getMonthlyOverview(accountId: string, months = 6): Promise<MonthlyData[]> {
    const response = await request<MonthlyData[]>(`/reports/monthly?accountId=${accountId}&months=${months}`, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch monthly overview');
    }

    return response.data;
  },

  async getFundBreakdown(accountId: string): Promise<FundBreakdown[]> {
    const response = await request<FundBreakdown[]>(`/reports/fund-breakdown?accountId=${accountId}`, {
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

  async getNetPosition(accountId: string): Promise<NetPosition> {
    const response = await request<NetPosition>(`/reports/net-position?accountId=${accountId}`, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch net position');
    }

    return response.data;
  },
};

