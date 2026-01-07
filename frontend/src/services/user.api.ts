import { request } from './api-client.js';

export interface UserProfile {
  user_id: string;
  email: string;
  role: 'admin' | 'user';
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateUserProfileInput {
  full_name?: string;
}

export const userApi = {
  /**
   * Get current user's profile
   */
  async getProfile(): Promise<UserProfile> {
    const response = await request<UserProfile>('/users/profile', {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch user profile');
    }

    return response.data;
  },

  /**
   * Update current user's profile
   */
  async updateProfile(input: UpdateUserProfileInput): Promise<UserProfile> {
    const response = await request<UserProfile>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(input),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update user profile');
    }

    return response.data;
  },
};


