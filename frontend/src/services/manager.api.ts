import { request } from './api-client';
import { Account } from './account.api';
import { Member } from './member.api';
import { Fund } from './fund.api';
import { ContributionWithDetails } from './contribution.api';
import { FundSettlement } from './fund-settlement.api';

export interface ManagerDashboardStats {
  totalAccounts: number;
  activeAccounts: number;
  overallCollected: number;
  totalBalance: number;
  collectedThisMonth: number;
  monthContributions: number;
  pending: number;
  pendingCount: number;
  activeFunds: number;
  totalFunds: number;
  members: number;
  newMembersThisMonth: number;
  monthlyCollections: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
}

export interface ManagerMember extends Member {
  account_name: string;
}

export interface ManagerFund extends Fund {
  account_name: string;
  collected: number;
}

export interface ManagerContribution extends ContributionWithDetails {
  account_name: string;
}

export interface ManagerSettlement extends FundSettlement {
  account_name: string;
}

async function getManagerData<T>(endpoint: string): Promise<T> {
  const response = await request<T>(endpoint, { method: 'GET' });
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to load manager data');
  }
  return response.data;
}

export const managerApi = {
  getAccounts() {
    return getManagerData<Account[]>('/manager/accounts');
  },

  getDashboard() {
    return getManagerData<ManagerDashboardStats>('/manager/dashboard');
  },

  getMembers() {
    return getManagerData<ManagerMember[]>('/manager/members');
  },

  getFunds() {
    return getManagerData<ManagerFund[]>('/manager/funds');
  },

  getContributions() {
    return getManagerData<ManagerContribution[]>('/manager/contributions');
  },

  getSettlements() {
    return getManagerData<ManagerSettlement[]>('/manager/settlements');
  },
};
