import { request } from './api-client.js';

export interface Expense {
  expense_id: string;
  account_id: string;
  expense_name: string;
  expense_category: string;
  date: string;
  amount: number;
  created_by_user_id: string;
  notes: string | null;
  member_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseInput {
  expense_name: string;
  expense_category: string;
  date: string;
  amount: number;
  notes?: string | null;
  member_visible?: boolean;
}

export interface UpdateExpenseInput {
  expense_name?: string;
  expense_category?: string;
  date?: string;
  amount?: number;
  notes?: string | null;
  member_visible?: boolean;
}

export interface ExpenseStats {
  total: number;
  byCategory: Record<string, { total: number; count: number }>;
  categories: string[];
}

export const expenseApi = {
  /**
   * Get all expenses for the authenticated user's account
   */
  async getAll(): Promise<Expense[]> {
    const response = await request<Expense[]>('/expenses', {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch expenses');
    }

    return response.data;
  },

  /**
   * Get visible expenses for the authenticated user's account
   */
  async getVisible(): Promise<Expense[]> {
    const response = await request<Expense[]>('/expenses/visible', {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch visible expenses');
    }

    return response.data;
  },

  /**
   * Get expenses by category
   */
  async getByCategory(category: string): Promise<Expense[]> {
    const response = await request<Expense[]>(`/expenses/category/${category}`, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch expenses by category');
    }

    return response.data;
  },

  /**
   * Get expenses by date range
   */
  async getByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    const response = await request<Expense[]>(`/expenses/range?startDate=${startDate}&endDate=${endDate}`, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch expenses by date range');
    }

    return response.data;
  },

  /**
   * Get a specific expense by ID
   */
  async getById(expenseId: string): Promise<Expense> {
    const response = await request<Expense>(`/expenses/${expenseId}`, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch expense');
    }

    return response.data;
  },

  /**
   * Get expense statistics for the authenticated user's account
   */
  async getStats(): Promise<ExpenseStats> {
    const response = await request<ExpenseStats>('/expenses/stats', {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch expense stats');
    }

    return response.data;
  },

  /**
   * Create a new expense
   */
  async create(input: CreateExpenseInput): Promise<Expense> {
    const response = await request<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create expense');
    }

    return response.data;
  },

  /**
   * Update an expense
   */
  async update(expenseId: string, input: UpdateExpenseInput): Promise<Expense> {
    const response = await request<Expense>(`/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update expense');
    }

    return response.data;
  },

  /**
   * Toggle expense visibility
   */
  async toggleVisibility(expenseId: string): Promise<Expense> {
    const response = await request<Expense>(`/expenses/${expenseId}/toggle-visibility`, {
      method: 'POST',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to toggle expense visibility');
    }

    return response.data;
  },

  /**
   * Delete an expense
   */
  async delete(expenseId: string): Promise<void> {
    const response = await request(`/expenses/${expenseId}`, {
      method: 'DELETE',
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete expense');
    }
  },
};

