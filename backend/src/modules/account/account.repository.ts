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
   * Get all accounts linked to a user
   */
  async findAllByUserId(userId: string): Promise<Account[]> {
    const { data: links, error: linkError } = await supabase
      .from('user_accounts')
      .select('account_id, role, created_at')
      .eq('user_id', userId);

    if (linkError) {
      throw new Error(`Failed to fetch user account links: ${linkError.message}`);
    }

    if (!links || links.length === 0) {
      return [];
    }

    const accountIds = links.map((link) => link.account_id);
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .in('account_id', accountIds);

    if (error) {
      throw new Error(`Failed to fetch accounts: ${error.message}`);
    }

    return accounts || [];
  },

  /**
   * Get user's account — prefers preferredAccountId when linked, otherwise
   * prefers named accounts over empty auto-created shells.
   */
  async findByUserId(userId: string, preferredAccountId?: string | null): Promise<Account | null> {
    try {
      const accounts = await this.findAllByUserId(userId);
      if (accounts.length === 0) {
        return null;
      }

      if (preferredAccountId) {
        const preferred = accounts.find((account) => account.account_id === preferredAccountId);
        if (preferred) {
          return preferred;
        }
      }

      // Prefer real groups (named) over empty personal shells from signup trigger
      const namedAccounts = accounts.filter(
        (account) => account.account_name && account.account_name.trim()
      );
      if (namedAccounts.length > 0) {
        return namedAccounts[0];
      }

      return accounts[0];
    } catch (err) {
      console.error('Error in findByUserId:', err);
      throw err;
    }
  },

  /**
   * Check whether a user is linked to a specific account
   */
  async userHasAccountAccess(userId: string, accountId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('account_id')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to check account access: ${error.message}`);
    }

    return !!data;
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
    if (input.short_url !== undefined) {
      updateData.short_url = input.short_url;
    }
    if (input.kyc_status !== undefined) {
      updateData.kyc_status = input.kyc_status;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
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
