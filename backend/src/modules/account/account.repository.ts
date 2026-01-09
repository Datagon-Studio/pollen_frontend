/**
 * Account Repository
 * 
 * Handles all Supabase queries.
 * No validation, no HTTP responses, no business logic.
 */

import { supabase } from '../../shared/supabase/client.js';
import { Account, CreateAccountInput, UpdateAccountInput } from './account.entity.js';

export const accountRepository = {
  /**
   * Create a new account (with just ID, no name/logo)
   */
  async create(input: CreateAccountInput): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        account_name: input.account_name ?? null,
        account_logo: input.account_logo ?? null,
        foreground_color: input.foreground_color ?? null,
        background_color: input.background_color ?? null,
        kyc_status: 'unverified',
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create account: ${error.message}`);
    }

    return data;
  },

  /**
   * Find account by account_id
   */
  async findByAccountId(accountId: string): Promise<Account | null> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch account: ${error.message}`);
    }

    return data;
  },

  /**
   * Get user's account(s) - returns first account linked to user
   */
  async findByUserId(userId: string): Promise<Account | null> {
    // First get the account_id from user_accounts
    const { data: userAccountLink, error: linkError } = await supabase
      .from('user_accounts')
      .select('account_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (linkError || !userAccountLink) {
      if (linkError?.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch user account link: ${linkError?.message}`);
    }

    // Then get the account details
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('account_id', userAccountLink.account_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch account: ${error.message}`);
    }

    return data;
  },

  /**
   * Link user to account
   */
  async linkUserToAccount(userId: string, accountId: string, role: string = 'admin'): Promise<void> {
    const { error } = await supabase
      .from('user_accounts')
      .insert({
        user_id: userId,
        account_id: accountId,
        role: role,
      });

    if (error) {
      throw new Error(`Failed to link user to account: ${error.message}`);
    }
  },

  /**
   * Update account
   */
  async update(accountId: string, input: UpdateAccountInput): Promise<Account> {
    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Only include fields that are explicitly provided (not undefined)
    if (input.account_name !== undefined) {
      updateData.account_name = input.account_name;
    }
    if (input.account_logo !== undefined) {
      updateData.account_logo = input.account_logo;
    }
    if (input.foreground_color !== undefined) {
      updateData.foreground_color = input.foreground_color;
    }
    if (input.background_color !== undefined) {
      updateData.background_color = input.background_color;
    }

    const { data, error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('account_id', accountId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update account: ${error.message}`);
    }

    return data;
  },
};
