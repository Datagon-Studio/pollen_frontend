import { request } from './api-client.js';

export interface Fund {
  fund_id: string;
  account_id: string;
  fund_name: string;
  description: string | null;
  default_amount: number | null;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface FundWithStats extends Fund {
  collected: number;
  contributors: number;
}

export interface CreateFundInput {
  fund_name: string;
  description?: string | null;
  default_amount?: number | null;
  is_active?: boolean;
  is_public?: boolean;
}

export interface UpdateFundInput {
  fund_name?: string;
  description?: string | null;
  default_amount?: number | null;
  is_active?: boolean;
  is_public?: boolean;
}

export interface FundStats {
  total: number;
  active: number;
  inactive: number;
}

export const fundApi = {
  /**
   * Get all funds for the authenticated user's account
   */
  async getAll(): Promise<Fund[]> {
    const response = await request<Fund[]>('/funds', {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch funds');
    }

    return response.data;
  },

  /**
   * Get active funds for the authenticated user's account
   */
  async getActive(): Promise<Fund[]> {
    const response = await request<Fund[]>('/funds/active', {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch active funds');
    }

    return response.data;
  },

  /**
   * Get a specific fund by ID
   */
  async getById(fundId: string): Promise<Fund> {
    const response = await request<Fund>(`/funds/${fundId}`, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch fund');
    }

    return response.data;
  },

  /**
   * Get public active funds for an account (no auth required)
   */
  async getPublicByAccount(accountId: string): Promise<Fund[]> {
    const response = await request<Fund[]>(`/funds/public/${accountId}`, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch public funds');
    }

    return response.data;
  },

  /**
   * Get fund statistics for the authenticated user's account
   */
  async getStats(): Promise<FundStats> {
    const response = await request<FundStats>('/funds/stats', {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch fund stats');
    }

    return response.data;
  },

  /**
   * Create a new fund
   */
  async create(input: CreateFundInput): Promise<Fund> {
    const response = await request<Fund>('/funds', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create fund');
    }

    return response.data;
  },

  /**
   * Update a fund
   */
  async update(fundId: string, input: UpdateFundInput): Promise<Fund> {
    const response = await request<Fund>(`/funds/${fundId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update fund');
    }

    return response.data;
  },

  /**
   * Delete a fund
   */
  async delete(fundId: string): Promise<void> {
    const response = await request(`/funds/${fundId}`, {
      method: 'DELETE',
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete fund');
    }
  },

  /**
   * Activate a fund
   */
  async activate(fundId: string): Promise<Fund> {
    const response = await request<Fund>(`/funds/${fundId}/activate`, {
      method: 'POST',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to activate fund');
    }

    return response.data;
  },

  /**
   * Deactivate a fund
   */
  async deactivate(fundId: string): Promise<Fund> {
    const response = await request<Fund>(`/funds/${fundId}/deactivate`, {
      method: 'POST',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to deactivate fund');
    }

    return response.data;
  },
};

