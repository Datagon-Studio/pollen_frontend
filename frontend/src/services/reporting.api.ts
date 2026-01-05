import { apiClient } from './api-client';

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
  async getDashboard(accountId: string) {
    return apiClient.get<DashboardStats>(`/reports/dashboard?accountId=${accountId}`);
  },

  async getMonthlyOverview(accountId: string, months = 6) {
    return apiClient.get<MonthlyData[]>(`/reports/monthly?accountId=${accountId}&months=${months}`);
  },

  async getFundBreakdown(accountId: string) {
    return apiClient.get<FundBreakdown[]>(`/reports/fund-breakdown?accountId=${accountId}`);
  },

  async getContributionsByPeriod(
    accountId: string,
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month' = 'month'
  ) {
    return apiClient.get<ContributionsByPeriod[]>(
      `/reports/contributions-by-period?accountId=${accountId}&startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`
    );
  },

  async getExpensesSummary(accountId: string) {
    return apiClient.get<ExpensesSummary>(`/reports/expenses-summary?accountId=${accountId}`);
  },

  async getNetPosition(accountId: string) {
    return apiClient.get<NetPosition>(`/reports/net-position?accountId=${accountId}`);
  },
};

