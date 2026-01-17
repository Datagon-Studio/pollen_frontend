import { apiClient } from './api-client';

export interface Contribution {
  contribution_id: string;
  account_id: string;
  fund_id: string;
  member_id: string | null;
  channel: 'offline' | 'online';
  payment_method: string | null;
  amount: number;
  date_received: string;
  received_by_user_id: string | null;
  comment: string | null;
  payment_reference: string | null;
  status: 'pending' | 'confirmed' | 'failed' | 'reversed';
  created_at: string;
  updated_at: string;
}

export interface ContributionWithDetails extends Contribution {
  member_name: string;
  fund_name: string;
}

export type CreateContributionInput = Omit<Contribution, 'contribution_id' | 'created_at' | 'updated_at'>;
export type UpdateContributionInput = Partial<Omit<CreateContributionInput, 'account_id' | 'fund_id'>>;

export interface ContributionStats {
  pendingCount: number;
  pendingAmount: number;
}

export interface FundContributionStats {
  totalCollected: number;
  contributorCount: number;
}

export const contributionApi = {
  async getByAccount(accountId: string) {
    return apiClient.get<ContributionWithDetails[]>(`/contributions?accountId=${accountId}`);
  },

  async getPending(accountId: string) {
    return apiClient.get<ContributionWithDetails[]>(`/contributions/pending?accountId=${accountId}`);
  },

  async getByMember(memberId: string) {
    return apiClient.get<Contribution[]>(`/contributions/member/${memberId}`);
  },

  async getByFund(fundId: string) {
    return apiClient.get<Contribution[]>(`/contributions/fund/${fundId}`);
  },

  async getById(id: string) {
    return apiClient.get<Contribution>(`/contributions/${id}`);
  },

  async getStats(accountId: string) {
    return apiClient.get<ContributionStats>(`/contributions/stats/${accountId}`);
  },

  async getFundStats(fundId: string) {
    return apiClient.get<FundContributionStats>(`/contributions/fund/${fundId}/stats`);
  },

  async create(data: CreateContributionInput) {
    return apiClient.post<Contribution>('/contributions', data);
  },

  async update(id: string, data: UpdateContributionInput) {
    return apiClient.put<Contribution>(`/contributions/${id}`, data);
  },

  async confirm(id: string) {
    return apiClient.post<Contribution>(`/contributions/${id}/confirm`);
  },

  async reject(id: string) {
    return apiClient.post<Contribution>(`/contributions/${id}/reject`);
  },

  async delete(id: string) {
    return apiClient.delete(`/contributions/${id}`);
  },
};

