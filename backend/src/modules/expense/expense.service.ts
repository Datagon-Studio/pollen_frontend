/**
 * Expense Service
 * 
 * Contains business logic for expenses.
 * No Supabase usage here (uses repository).
 * No HTTP responses here (uses controller).
 */

import { expenseRepository } from './expense.repository.js';
import { Expense, CreateExpenseInput, UpdateExpenseInput } from './expense.entity.js';

export class ExpenseService {
  /**
   * Get expense by ID
   */
  async getExpense(expenseId: string): Promise<Expense | null> {
    return expenseRepository.findById(expenseId);
  }

  /**
   * Get all expenses for an account
   */
  async getExpensesByAccount(accountId: string): Promise<Expense[]> {
    return expenseRepository.findByAccountId(accountId);
  }

  /**
   * Get visible expenses for an account
   */
  async getVisibleExpenses(accountId: string): Promise<Expense[]> {
    return expenseRepository.findVisibleByAccountId(accountId);
  }

  /**
   * Get expenses by category
   */
  async getExpensesByCategory(accountId: string, category: string): Promise<Expense[]> {
    return expenseRepository.findByCategory(accountId, category);
  }

  /**
   * Get expenses by date range
   */
  async getExpensesByDateRange(accountId: string, startDate: string, endDate: string): Promise<Expense[]> {
    return expenseRepository.findByDateRange(accountId, startDate, endDate);
  }

  /**
   * Create a new expense
   */
  async createExpense(input: CreateExpenseInput): Promise<Expense> {
    // Validate required fields
    if (!input.expense_name?.trim()) {
      throw new Error('Expense name is required');
    }
    if (!input.expense_category?.trim()) {
      throw new Error('Expense category is required');
    }
    if (!input.amount || input.amount <= 0) {
      throw new Error('Valid amount is required (must be greater than 0)');
    }
    if (!input.account_id) {
      throw new Error('Account ID is required');
    }
    if (!input.created_by_user_id) {
      throw new Error('User ID is required');
    }

    // Business Rule: Trim text fields
    const expenseData: CreateExpenseInput = {
      ...input,
      expense_name: input.expense_name.trim(),
      expense_category: input.expense_category.trim(),
      date: input.date || new Date().toISOString().split('T')[0], // Default to today
      member_visible: input.member_visible ?? true,
    };

    return expenseRepository.create(expenseData);
  }

  /**
   * Update an expense
   */
  async updateExpense(expenseId: string, input: UpdateExpenseInput): Promise<Expense> {
    const existing = await expenseRepository.findById(expenseId);
    if (!existing) {
      throw new Error('Expense not found');
    }

    // Business Rule: Validate amount if provided
    if (input.amount !== undefined && input.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Business Rule: Trim text fields if provided
    const updateData: UpdateExpenseInput = { ...input };
    if (updateData.expense_name !== undefined) {
      updateData.expense_name = updateData.expense_name.trim();
      if (!updateData.expense_name) {
        throw new Error('Expense name cannot be empty');
      }
    }
    if (updateData.expense_category !== undefined) {
      updateData.expense_category = updateData.expense_category.trim();
      if (!updateData.expense_category) {
        throw new Error('Expense category cannot be empty');
      }
    }

    return expenseRepository.update(expenseId, updateData);
  }

  /**
   * Delete an expense
   */
  async deleteExpense(expenseId: string): Promise<boolean> {
    const existing = await expenseRepository.findById(expenseId);
    if (!existing) {
      throw new Error('Expense not found');
    }

    return expenseRepository.delete(expenseId);
  }

  /**
   * Toggle expense visibility
   */
  async toggleVisibility(expenseId: string): Promise<Expense> {
    const existing = await expenseRepository.findById(expenseId);
    if (!existing) {
      throw new Error('Expense not found');
    }

    return expenseRepository.update(expenseId, { member_visible: !existing.member_visible });
  }

  /**
   * Get expense statistics for an account
   */
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
      acc[e.expense_category].total += Number(e.amount);
      acc[e.expense_category].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return {
      total,
      byCategory,
      categories,
    };
  }
}

export const expenseService = new ExpenseService();
