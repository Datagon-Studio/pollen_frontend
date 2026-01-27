import { request } from './api-client.js';

export interface UserProfile {
  user_id: string;
  email: string;
  role: 'superadmin' | 'admin' | 'user';
  full_name: string | null;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountRole {
  account_id: string;
  role: 'admin' | 'officer' | 'viewer';
}

export interface UpdateUserProfileInput {
  full_name?: string;
  profile_image_url?: string | null;
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

  /**
   * Get user's role for a specific account
   */
  async getAccountRole(accountId: string): Promise<AccountRole> {
    const response = await request<AccountRole>(`/users/account-role/${accountId}`, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch account role');
    }

    return response.data;
  },
};



