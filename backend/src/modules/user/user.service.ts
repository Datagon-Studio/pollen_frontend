/**
 * User Service
 * 
 * Contains all business rules.
 * Calls repository functions only.
 * Throws errors when rules fail.
 */

import { userRepository } from './user.repository.js';
import { UserProfile, UpdateUserProfileInput, AccountRole } from './user.entity.js';

export class UserService {
  /**
   * Get user profile by user_id
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return userRepository.findByUserId(userId);
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, input: UpdateUserProfileInput): Promise<UserProfile> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Business Rule: full_name must be non-empty if provided
    if (input.full_name !== undefined && input.full_name !== null && input.full_name.trim() === '') {
      throw new Error('Full name cannot be empty');
    }

    // Business Rule: full_name max length
    if (input.full_name && input.full_name.length > 255) {
      throw new Error('Full name must be less than 255 characters');
    }

    // Business Rule: phone_number validation (optional, but if provided should be non-empty)
    if (input.phone_number !== undefined && input.phone_number !== null && input.phone_number.trim() === '') {
      // Allow empty string to clear phone number
      input.phone_number = null;
    }

    // Business Rule: profile_image_url must be a valid URL if provided
    if (input.profile_image_url !== undefined && input.profile_image_url !== null && input.profile_image_url.trim() !== '') {
      try {
        new URL(input.profile_image_url);
      } catch {
        throw new Error('Profile image URL must be a valid URL');
      }
    }

    return userRepository.update(userId, input);
  }

  /**
   * Get user's role for a specific account
   */
  async getAccountRole(userId: string, accountId: string): Promise<AccountRole | null> {
    if (!userId || !accountId) {
      throw new Error('User ID and Account ID are required');
    }

    const result = await userRepository.getAccountRole(userId, accountId);
    if (!result) {
      return null;
    }

    return {
      account_id: result.account_id,
      role: result.role as 'admin' | 'officer' | 'viewer',
    };
  }
}

export const userService = new UserService();


