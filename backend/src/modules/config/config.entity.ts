/**
 * Config Entity Types
 * 
 * Defines TypeScript types only.
 * No Supabase, no business logic, no HTTP logic.
 */

export type NotificationChannel = 'sms' | 'email' | 'both';
export type ExpenseVisibilityLevel = 'none' | 'summary' | 'detailed';

export interface Config {
  config_id: string;
  account_id: string;
  /**
   * ISO 4217 currency code for this account's amounts.
   * MVP: default 'GHS'. No FX conversion – purely display/formatting.
   */
  currency_code: string;
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

export interface CreateConfigInput {
  account_id: string;
  currency_code?: string;
  smtp_profile_id?: string | null;
  default_email_sender_id?: string | null;
  payment_integration_id?: string | null;
  birthday_messages_enabled?: boolean;
  default_notification_channel?: NotificationChannel;
  sms_template?: string | null;
  email_template?: string | null;
  member_portal_enabled?: boolean;
  expense_visibility_level?: ExpenseVisibilityLevel;
}

export interface UpdateConfigInput {
  currency_code?: string;
  smtp_profile_id?: string | null;
  default_email_sender_id?: string | null;
  payment_integration_id?: string | null;
  birthday_messages_enabled?: boolean;
  default_notification_channel?: NotificationChannel;
  sms_template?: string | null;
  email_template?: string | null;
  member_portal_enabled?: boolean;
  expense_visibility_level?: ExpenseVisibilityLevel;
}
