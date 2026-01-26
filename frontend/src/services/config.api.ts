import { request } from './api-client.js';

export type NotificationChannel = 'sms' | 'email' | 'both';
export type ExpenseVisibilityLevel = 'none' | 'summary' | 'detailed';

export interface Config {
  config_id: string;
  account_id: string;
  smtp_profile_id: string | null;
  default_email_sender_id: string | null;
  payment_integration_id: string | null;
  birthday_messages_enabled: boolean;
  default_notification_channel: NotificationChannel;
  sms_template: string | null;
  email_template: string | null;
  member_portal_enabled: boolean;
  expense_visibility_level: ExpenseVisibilityLevel;
  created_at: string;
  updated_at: string;
}

export interface UpdateConfigInput {
  smtp_profile_id?: string | null;
  default_email_sender_id?: string | null;
  payment_integration_id?: string | null;
  birthday_messages_enabled?: boolean;
  default_notification_channel?: NotificationChannel;
  sms_template?: string | null;
  email_template?: string | null;
  expense_visibility_level?: ExpenseVisibilityLevel;
}

export const configApi = {
  /**
   * Get current user's account config
   */
  async getMyConfig(): Promise<Config> {
    const response = await request<Config>('/config/me', {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch config');
    }

    return response.data;
  },

  /**
   * Update current user's account config
   */
  async updateMyConfig(input: UpdateConfigInput): Promise<Config> {
    const response = await request<Config>('/config/me', {
      method: 'PUT',
      body: JSON.stringify(input),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update config');
    }

    return response.data;
  },
};
