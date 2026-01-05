import { apiClient } from './api-client';

export interface Account {
  id: string;
  account_name: string;
  account_status: 'active' | 'inactive' | 'suspended';
  kyc_status: 'pending' | 'verified' | 'rejected';
  official_name: string | null;
  account_type: string | null;
  logo_url: string | null;
  url_slug: string | null;
  display_name: string | null;
  primary_color: string | null;
  is_public_page_published: boolean;
  settlement_type: 'bank' | 'mobile_money' | null;
  settlement_account_name: string | null;
  settlement_account_number: string | null;
  settlement_provider: string | null;
  settlement_active: boolean;
  notification_channel: 'sms' | 'email' | 'both';
  notify_new_contributions: boolean;
  notify_pending_confirmations: boolean;
  notify_birthdays: boolean;
  member_portal_enabled: boolean;
  expense_visibility: 'none' | 'summary' | 'detailed';
  show_fund_balances: boolean;
  show_contribution_rankings: boolean;
  created_at: string;
  updated_at: string;
}

export type CreateAccountInput = Omit<Account, 'id' | 'created_at' | 'updated_at'>;
export type UpdateAccountInput = Partial<CreateAccountInput>;

export const accountApi = {
  async getAll() {
    return apiClient.get<Account[]>('/accounts');
  },

  async getById(id: string) {
    return apiClient.get<Account>(`/accounts/${id}`);
  },

  async getBySlug(slug: string) {
    return apiClient.get<Account>(`/accounts/slug/${slug}`);
  },

  async create(data: CreateAccountInput) {
    return apiClient.post<Account>('/accounts', data);
  },

  async update(id: string, data: UpdateAccountInput) {
    return apiClient.put<Account>(`/accounts/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete(`/accounts/${id}`);
  },

  async updatePublicPage(id: string, settings: {
    url_slug?: string;
    display_name?: string;
    primary_color?: string;
    logo_url?: string;
    is_public_page_published?: boolean;
  }) {
    return apiClient.put<Account>(`/accounts/${id}/public-page`, settings);
  },

  async updateSettlement(id: string, settlement: {
    settlement_type?: 'bank' | 'mobile_money';
    settlement_account_name?: string;
    settlement_account_number?: string;
    settlement_provider?: string;
    settlement_active?: boolean;
  }) {
    return apiClient.put<Account>(`/accounts/${id}/settlement`, settlement);
  },

  async updateNotifications(id: string, notifications: {
    notification_channel?: 'sms' | 'email' | 'both';
    notify_new_contributions?: boolean;
    notify_pending_confirmations?: boolean;
    notify_birthdays?: boolean;
    member_portal_enabled?: boolean;
  }) {
    return apiClient.put<Account>(`/accounts/${id}/notifications`, notifications);
  },

  async updateTransparency(id: string, transparency: {
    expense_visibility?: 'none' | 'summary' | 'detailed';
    show_fund_balances?: boolean;
    show_contribution_rankings?: boolean;
  }) {
    return apiClient.put<Account>(`/accounts/${id}/transparency`, transparency);
  },
};

