import { expenseRepository, Expense, CreateExpenseInput, UpdateExpenseInput } from './expense.repository.js';

export const expenseService = {
  async getExpense(id: string): Promise<Expense | null> {
    return expenseRepository.findById(id);
  },

  async getExpensesByAccount(accountId: string): Promise<Expense[]> {
    return expenseRepository.findByAccountId(accountId);
  },

  async getVisibleExpenses(accountId: string): Promise<Expense[]> {
    return expenseRepository.findVisibleByAccountId(accountId);
  },

  async getExpensesByCategory(accountId: string, category: string): Promise<Expense[]> {
    return expenseRepository.findByCategory(accountId, category);
  },

  async getExpensesByDateRange(accountId: string, startDate: string, endDate: string): Promise<Expense[]> {
    return expenseRepository.findByDateRange(accountId, startDate, endDate);
  },

  async createExpense(input: CreateExpenseInput): Promise<Expense | null> {
    // Validate required fields
    if (!input.expense_name?.trim()) {
      throw new Error('Expense name is required');
    }
    if (!input.expense_category?.trim()) {
      throw new Error('Expense category is required');
    }
    if (!input.amount || input.amount <= 0) {
      throw new Error('Valid amount is required');
    }
    if (!input.account_id) {
      throw new Error('Account ID is required');
    }

    // Set defaults
    const expenseData: CreateExpenseInput = {
      ...input,
      date: input.date || new Date().toISOString(),
      member_visible: input.member_visible ?? true,
    };

    return expenseRepository.create(expenseData);
  },

  async updateExpense(id: string, input: UpdateExpenseInput): Promise<Expense | null> {
    const existing = await expenseRepository.findById(id);
    if (!existing) {
      throw new Error('Expense not found');
    }

    return expenseRepository.update(id, input);
  },

  async deleteExpense(id: string): Promise<boolean> {
    const existing = await expenseRepository.findById(id);
    if (!existing) {
      throw new Error('Expense not found');
    }

    return expenseRepository.delete(id);
  },

  async toggleVisibility(id: string): Promise<Expense | null> {
    const existing = await expenseRepository.findById(id);
    if (!existing) {
      throw new Error('Expense not found');
    }

    return expenseRepository.update(id, { member_visible: !existing.member_visible });
  },

  async getExpenseStats(accountId: string): Promise<{
    total: number;
    byCategory: Record<string, { total: number; count: number }>;
    categories: string[];
  }> {
    const [expenses, total, categories] = await Promise.all([
      expenseRepository.findByAccountId(accountId),
      expenseRepository.getTotalByAccount(accountId),
      expenseRepository.getCategories(accountId),
    ]);

    const byCategory = expenses.reduce((acc, e) => {
      if (!acc[e.expense_category]) {
        acc[e.expense_category] = { total: 0, count: 0 };
      }
      acc[e.expense_category].total += e.amount;
      acc[e.expense_category].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return {
      total,
      byCategory,
      categories,
    };
  },
};

