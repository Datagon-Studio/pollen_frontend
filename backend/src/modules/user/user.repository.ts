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
};


