import { request } from './api-client';

export interface ExpenseCategory {
  category_id: string;
  category_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const expenseCategoryApi = {
  /**
   * Get all active expense categories (alphabetically sorted)
   */
  async getAll(): Promise<ExpenseCategory[]> {
    const response = await request<ExpenseCategory[]>('/expense-categories', {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch expense categories');
    }

    return response.data;
  },
};
