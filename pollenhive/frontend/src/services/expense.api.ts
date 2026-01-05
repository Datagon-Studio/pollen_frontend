import { apiClient } from './api-client';

export interface Expense {
  id: string;
  account_id: string;
  expense_name: string;
  expense_category: string;
  date: string;
  amount: number;
  notes: string | null;
  member_visible: boolean;
  created_at: string;
  updated_at: string;
}

export type CreateExpenseInput = Omit<Expense, 'id' | 'created_at' | 'updated_at'>;
export type UpdateExpenseInput = Partial<Omit<CreateExpenseInput, 'account_id'>>;

export interface ExpenseStats {
  total: number;
  byCategory: Record<string, { total: number; count: number }>;
  categories: string[];
}

export const expenseApi = {
  async getByAccount(accountId: string) {
    return apiClient.get<Expense[]>(`/expenses?accountId=${accountId}`);
  },

  async getVisible(accountId: string) {
    return apiClient.get<Expense[]>(`/expenses/visible?accountId=${accountId}`);
  },

  async getByCategory(accountId: string, category: string) {
    return apiClient.get<Expense[]>(`/expenses/category/${category}?accountId=${accountId}`);
  },

  async getByDateRange(accountId: string, startDate: string, endDate: string) {
    return apiClient.get<Expense[]>(`/expenses/range?accountId=${accountId}&startDate=${startDate}&endDate=${endDate}`);
  },

  async getById(id: string) {
    return apiClient.get<Expense>(`/expenses/${id}`);
  },

  async getStats(accountId: string) {
    return apiClient.get<ExpenseStats>(`/expenses/stats/${accountId}`);
  },

  async create(data: CreateExpenseInput) {
    return apiClient.post<Expense>('/expenses', data);
  },

  async update(id: string, data: UpdateExpenseInput) {
    return apiClient.put<Expense>(`/expenses/${id}`, data);
  },

  async toggleVisibility(id: string) {
    return apiClient.post<Expense>(`/expenses/${id}/toggle-visibility`);
  },

  async delete(id: string) {
    return apiClient.delete(`/expenses/${id}`);
  },
};

