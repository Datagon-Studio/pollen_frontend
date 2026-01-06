/**
 * User Service
 * 
 * Contains all business rules.
 * Calls repository functions only.
 * Throws errors when rules fail.
 */

import { userRepository } from './user.repository.js';
import { UserProfile, UpdateUserProfileInput } from './user.entity.js';

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

    return userRepository.update(userId, input);
  }
}

export const userService = new UserService();

