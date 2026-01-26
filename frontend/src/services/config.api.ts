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

export interface PublicConfig {
  expense_visibility_level: ExpenseVisibilityLevel;
}

export const configApi = {
  /**
   * Get public config for an account (no auth required)
   */
  async getPublicConfig(accountId: string): Promise<PublicConfig> {
    const response = await request<PublicConfig>(`/config/public/${accountId}`, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      // Default to 'summary' if config not found
      return { expense_visibility_level: 'summary' };
    }

    return response.data;
  },

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

  /**
   * Send a test email via Postmark
   */
  async sendTestEmail(to: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const response = await request<{ messageId?: string }>('/config/test-email', {
      method: 'POST',
      body: JSON.stringify({ to }),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to send test email');
    }

    return {
      success: true,
      messageId: response.data?.messageId,
    };
  },
};
