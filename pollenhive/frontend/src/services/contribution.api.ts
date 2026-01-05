import { apiClient } from './api-client';

export interface Contribution {
  id: string;
  account_id: string;
  member_id: string;
  fund_id: string;
  amount: number;
  channel: 'online' | 'offline';
  payment_method: string;
  status: 'pending' | 'confirmed' | 'rejected';
  date_received: string;
  comment: string | null;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContributionWithDetails extends Contribution {
  member_name: string;
  fund_name: string;
}

export type CreateContributionInput = Omit<Contribution, 'id' | 'created_at' | 'updated_at'>;
export type UpdateContributionInput = Partial<Omit<CreateContributionInput, 'account_id' | 'member_id' | 'fund_id'>>;

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

