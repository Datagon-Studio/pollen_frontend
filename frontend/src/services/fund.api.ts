import { apiClient } from './api-client';

export interface Fund {
  id: string;
  account_id: string;
  fund_name: string;
  description: string | null;
  default_amount: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FundWithStats extends Fund {
  collected: number;
  contributors: number;
}

export type CreateFundInput = Omit<Fund, 'id' | 'created_at' | 'updated_at'>;
export type UpdateFundInput = Partial<Omit<CreateFundInput, 'account_id'>>;

export interface FundStats {
  total: number;
  active: number;
  inactive: number;
}

export const fundApi = {
  async getByAccount(accountId: string) {
    return apiClient.get<Fund[]>(`/funds?accountId=${accountId}`);
  },

  async getActiveByAccount(accountId: string) {
    return apiClient.get<Fund[]>(`/funds/active?accountId=${accountId}`);
  },

  async getById(id: string) {
    return apiClient.get<Fund>(`/funds/${id}`);
  },

  async getStats(accountId: string) {
    return apiClient.get<FundStats>(`/funds/stats/${accountId}`);
  },

  async create(data: CreateFundInput) {
    return apiClient.post<Fund>('/funds', data);
  },

  async update(id: string, data: UpdateFundInput) {
    return apiClient.put<Fund>(`/funds/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete(`/funds/${id}`);
  },

  async activate(id: string) {
    return apiClient.post<Fund>(`/funds/${id}/activate`);
  },

  async deactivate(id: string) {
    return apiClient.post<Fund>(`/funds/${id}/deactivate`);
  },
};

