/**
 * Expense Category Repository
 * 
 * Handles all Supabase queries for Expense Categories.
 */

import { supabase } from '../../shared/supabase/client.js';
import { ExpenseCategory } from './expense-category.entity.js';

export const expenseCategoryRepository = {
  /**
   * Get all active expense categories (alphabetically sorted)
   */
  async findAll(): Promise<ExpenseCategory[]> {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('is_active', true)
      .order('category_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch expense categories: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Find category by name
   */
  async findByName(categoryName: string): Promise<ExpenseCategory | null> {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('category_name', categoryName)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to find expense category: ${error.message}`);
    }

    return data;
  },
};
