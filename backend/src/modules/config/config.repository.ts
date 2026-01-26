/**
 * Config Repository
 * 
 * Handles all Supabase queries.
 * No validation, no HTTP responses, no business logic.
 */

import { supabase } from '../../shared/supabase/client.js';
import { Config, CreateConfigInput, UpdateConfigInput } from './config.entity.js';

export const configRepository = {
  /**
   * Find config by account_id
   */
  async findByAccountId(accountId: string): Promise<Config | null> {
    const { data, error } = await supabase
      .from('config')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch config: ${error.message}`);
    }

    return data;
  },

  /**
   * Create a new config
   */
  async create(input: CreateConfigInput): Promise<Config> {
    const { data, error } = await supabase
      .from('config')
      .insert({
        account_id: input.account_id,
        smtp_profile_id: input.smtp_profile_id ?? null,
        default_email_sender_id: input.default_email_sender_id ?? null,
        payment_integration_id: input.payment_integration_id ?? null,
        birthday_messages_enabled: input.birthday_messages_enabled ?? false,
        default_notification_channel: input.default_notification_channel ?? 'both',
        sms_template: input.sms_template ?? null,
        email_template: input.email_template ?? null,
        member_portal_enabled: input.member_portal_enabled ?? true,
        expense_visibility_level: input.expense_visibility_level ?? 'summary',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create config: ${error.message}`);
    }

    return data;
  },

  /**
   * Update config
   */
  async update(accountId: string, input: UpdateConfigInput): Promise<Config> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.smtp_profile_id !== undefined) {
      updateData.smtp_profile_id = input.smtp_profile_id;
    }
    if (input.default_email_sender_id !== undefined) {
      updateData.default_email_sender_id = input.default_email_sender_id;
    }
    if (input.payment_integration_id !== undefined) {
      updateData.payment_integration_id = input.payment_integration_id;
    }
    if (input.birthday_messages_enabled !== undefined) {
      updateData.birthday_messages_enabled = input.birthday_messages_enabled;
    }
    if (input.default_notification_channel !== undefined) {
      updateData.default_notification_channel = input.default_notification_channel;
    }
    if (input.sms_template !== undefined) {
      updateData.sms_template = input.sms_template;
    }
    if (input.email_template !== undefined) {
      updateData.email_template = input.email_template;
    }
    if (input.member_portal_enabled !== undefined) {
      // Business rule: member_portal_enabled must always be true
      updateData.member_portal_enabled = true;
    }
    if (input.expense_visibility_level !== undefined) {
      updateData.expense_visibility_level = input.expense_visibility_level;
    }

    const { data, error } = await supabase
      .from('config')
      .update(updateData)
      .eq('account_id', accountId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update config: ${error.message}`);
    }

    return data;
  },
};
