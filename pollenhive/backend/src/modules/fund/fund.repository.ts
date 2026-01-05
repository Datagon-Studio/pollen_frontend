import { supabase } from '../../shared/supabase/client.js';

export interface Fund {
  id: string;
  account_id: string;
  fund_name: string;
  description: string | null;
  default_amount: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CreateFundInput = Omit<Fund, 'id' | 'created_at' | 'updated_at'>;
export type UpdateFundInput = Partial<Omit<CreateFundInput, 'account_id'>>;

export const fundRepository = {
  async findById(id: string): Promise<Fund | null> {
    const { data, error } = await supabase
      .from('funds')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  },

  async findByAccountId(accountId: string): Promise<Fund[]> {
    const { data, error } = await supabase
      .from('funds')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching funds:', error);
      return [];
    }
    return data || [];
  },

  async findActiveByAccountId(accountId: string): Promise<Fund[]> {
    const { data, error } = await supabase
      .from('funds')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active funds:', error);
      return [];
    }
    return data || [];
  },

  async create(input: CreateFundInput): Promise<Fund | null> {
    const { data, error } = await supabase
      .from('funds')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('Error creating fund:', error);
      return null;
    }
    return data;
  },

  async update(id: string, input: UpdateFundInput): Promise<Fund | null> {
    const { data, error } = await supabase
      .from('funds')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating fund:', error);
      return null;
    }
    return data;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('funds')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting fund:', error);
      return false;
    }
    return true;
  },

  async getActiveCount(accountId: string): Promise<number> {
    const { count, error } = await supabase
      .from('funds')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('is_active', true);

    if (error) return 0;
    return count || 0;
  },

  async getTotalCount(accountId: string): Promise<number> {
    const { count, error } = await supabase
      .from('funds')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId);

    if (error) return 0;
    return count || 0;
  },
};

