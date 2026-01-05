import { supabase } from '../../shared/supabase/client.js';

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

export const expenseRepository = {
  async findById(id: string): Promise<Expense | null> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  },

  async findByAccountId(accountId: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
      return [];
    }
    return data || [];
  },

  async findVisibleByAccountId(accountId: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('account_id', accountId)
      .eq('member_visible', true)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching visible expenses:', error);
      return [];
    }
    return data || [];
  },

  async findByCategory(accountId: string, category: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('account_id', accountId)
      .eq('expense_category', category)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching expenses by category:', error);
      return [];
    }
    return data || [];
  },

  async findByDateRange(accountId: string, startDate: string, endDate: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('account_id', accountId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching expenses by date range:', error);
      return [];
    }
    return data || [];
  },

  async create(input: CreateExpenseInput): Promise<Expense | null> {
    const { data, error } = await supabase
      .from('expenses')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('Error creating expense:', error);
      return null;
    }
    return data;
  },

  async update(id: string, input: UpdateExpenseInput): Promise<Expense | null> {
    const { data, error } = await supabase
      .from('expenses')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating expense:', error);
      return null;
    }
    return data;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting expense:', error);
      return false;
    }
    return true;
  },

  async getTotalByAccount(accountId: string): Promise<number> {
    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .eq('account_id', accountId);

    if (error) return 0;
    return (data || []).reduce((sum, e) => sum + e.amount, 0);
  },

  async getTotalByCategory(accountId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('expenses')
      .select('expense_category, amount')
      .eq('account_id', accountId);

    if (error) return {};
    
    return (data || []).reduce((acc, e) => {
      acc[e.expense_category] = (acc[e.expense_category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);
  },

  async getCategories(accountId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('expense_category')
      .eq('account_id', accountId);

    if (error) return [];
    
    const categories = new Set((data || []).map(e => e.expense_category));
    return Array.from(categories);
  },
};

