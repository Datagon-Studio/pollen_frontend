/**
 * Expense Repository
 * 
 * Handles all Supabase queries.
 * No validation, no HTTP responses, no business logic.
 */

import { supabase } from '../../shared/supabase/client.js';
import { Expense, CreateExpenseInput, UpdateExpenseInput } from './expense.entity.js';

export const expenseRepository = {
  /**
   * Find expense by ID
   */
  async findById(expenseId: string): Promise<Expense | null> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('expense_id', expenseId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to find expense: ${error.message}`);
    }
    return data;
  },

  /**
   * Find all expenses for an account
   */
  async findByAccountId(accountId: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch expenses: ${error.message}`);
    }
    return data || [];
  },

  /**
   * Find visible expenses for an account
   */
  async findVisibleByAccountId(accountId: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('account_id', accountId)
      .eq('member_visible', true)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch visible expenses: ${error.message}`);
    }
    return data || [];
  },

  /**
   * Find expenses by category
   */
  async findByCategory(accountId: string, category: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('account_id', accountId)
      .eq('expense_category', category)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch expenses by category: ${error.message}`);
    }
    return data || [];
  },

  /**
   * Find expenses by date range
   */
  async findByDateRange(accountId: string, startDate: string, endDate: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('account_id', accountId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch expenses by date range: ${error.message}`);
    }
    return data || [];
  },

  /**
   * Create a new expense
   */
  async create(input: CreateExpenseInput): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        account_id: input.account_id,
        expense_name: input.expense_name,
        expense_category: input.expense_category,
        date: input.date,
        amount: input.amount,
        created_by_user_id: input.created_by_user_id,
        notes: input.notes ?? null,
        member_visible: input.member_visible ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create expense: ${error.message}`);
    }
    return data;
  },

  /**
   * Update an expense
   */
  async update(expenseId: string, input: UpdateExpenseInput): Promise<Expense> {
    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};

    if (input.expense_name !== undefined) {
      updateData.expense_name = input.expense_name;
    }
    if (input.expense_category !== undefined) {
      updateData.expense_category = input.expense_category;
    }
    if (input.date !== undefined) {
      updateData.date = input.date;
    }
    if (input.amount !== undefined) {
      updateData.amount = input.amount;
    }
    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }
    if (input.member_visible !== undefined) {
      updateData.member_visible = input.member_visible;
    }

    const { data, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('expense_id', expenseId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update expense: ${error.message}`);
    }
    return data;
  },

  /**
   * Delete an expense
   */
  async delete(expenseId: string): Promise<boolean> {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('expense_id', expenseId);

    if (error) {
      throw new Error(`Failed to delete expense: ${error.message}`);
    }
    return true;
  },

  /**
   * Get total expenses for an account
   */
  async getTotalByAccount(accountId: string): Promise<number> {
    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .eq('account_id', accountId);

    if (error) {
      throw new Error(`Failed to get total expenses: ${error.message}`);
    }
    return (data || []).reduce((sum, e) => sum + Number(e.amount), 0);
  },

  /**
   * Get total expenses by category
   */
  async getTotalByCategory(accountId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('expenses')
      .select('expense_category, amount')
      .eq('account_id', accountId);

    if (error) {
      throw new Error(`Failed to get expenses by category: ${error.message}`);
    }
    
    return (data || []).reduce((acc, e) => {
      const category = e.expense_category;
      acc[category] = (acc[category] || 0) + Number(e.amount);
      return acc;
    }, {} as Record<string, number>);
  },

  /**
   * Get unique categories for an account
   */
  async getCategories(accountId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('expense_category')
      .eq('account_id', accountId);

    if (error) {
      throw new Error(`Failed to get categories: ${error.message}`);
    }
    
    const categories = new Set((data || []).map(e => e.expense_category));
    return Array.from(categories);
  },
};
