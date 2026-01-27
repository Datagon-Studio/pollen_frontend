/**
 * User Repository
 * 
 * Handles all Supabase queries.
 * No validation, no HTTP responses, no business logic.
 */

import { supabase } from '../../shared/supabase/client.js';
import { UserProfile, UpdateUserProfileInput } from './user.entity.js';

export const userRepository = {
  /**
   * Find user by user_id
   */
  async findByUserId(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return data;
  },

  /**
   * Update user profile
   */
  async update(userId: string, input: UpdateUserProfileInput): Promise<UserProfile> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.full_name !== undefined) {
      updateData.full_name = input.full_name ?? null;
    }

    if (input.phone_number !== undefined) {
      updateData.phone_number = input.phone_number ?? null;
    }

    if (input.profile_image_url !== undefined) {
      updateData.profile_image_url = input.profile_image_url ?? null;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('User update error:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId,
        updateData,
      });
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return data;
  },

  /**
   * Get all admin users for an account
   */
  async findAdminsByAccountId(accountId: string): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_accounts')
      .select(`
        user_id,
        users!inner (
          user_id,
          email,
          role,
          full_name,
          phone_number,
          profile_image_url,
          created_at,
          updated_at
        )
      `)
      .eq('account_id', accountId)
      .eq('role', 'admin');

    if (error) {
      throw new Error(`Failed to fetch admin users: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Extract user profiles from the nested structure
    // Supabase returns users as an array, so we need to get the first element
    return data
      .map((item: any) => {
        const users = item.users;
        // If users is an array, take the first element; if it's an object, use it directly
        return Array.isArray(users) ? users[0] : users;
      })
      .filter((user: any) => user !== null && user !== undefined) as UserProfile[];
  },

  /**
   * Get user's role for a specific account
   */
  async getAccountRole(userId: string, accountId: string): Promise<{ account_id: string; role: string } | null> {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('account_id, role')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch account role: ${error.message}`);
    }

    return data;
  },
};


