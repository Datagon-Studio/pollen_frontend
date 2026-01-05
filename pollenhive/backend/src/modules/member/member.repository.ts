import { supabase } from '../../shared/supabase/client.js';

export interface Member {
  id: string;
  account_id: string;
  first_name: string;
  last_name: string;
  dob: string | null;
  phone: string;
  phone_verified: boolean;
  email: string | null;
  email_verified: boolean;
  membership_number: string | null;
  total_contributed: number;
  created_at: string;
  updated_at: string;
}

export type CreateMemberInput = Omit<Member, 'id' | 'created_at' | 'updated_at' | 'total_contributed'>;
export type UpdateMemberInput = Partial<Omit<CreateMemberInput, 'account_id'>>;

export const memberRepository = {
  async findById(id: string): Promise<Member | null> {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  },

  async findByAccountId(accountId: string): Promise<Member[]> {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching members:', error);
      return [];
    }
    return data || [];
  },

  async findByPhone(phone: string, accountId: string): Promise<Member | null> {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('phone', phone)
      .eq('account_id', accountId)
      .single();

    if (error) return null;
    return data;
  },

  async findByEmail(email: string, accountId: string): Promise<Member | null> {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('email', email)
      .eq('account_id', accountId)
      .single();

    if (error) return null;
    return data;
  },

  async create(input: CreateMemberInput): Promise<Member | null> {
    const { data, error } = await supabase
      .from('members')
      .insert({ ...input, total_contributed: 0 })
      .select()
      .single();

    if (error) {
      console.error('Error creating member:', error);
      return null;
    }
    return data;
  },

  async update(id: string, input: UpdateMemberInput): Promise<Member | null> {
    const { data, error } = await supabase
      .from('members')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating member:', error);
      return null;
    }
    return data;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting member:', error);
      return false;
    }
    return true;
  },

  async updateTotalContributed(id: string, amount: number): Promise<Member | null> {
    const { data, error } = await supabase
      .from('members')
      .update({ 
        total_contributed: amount,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating member contribution total:', error);
      return null;
    }
    return data;
  },

  async getActiveCount(accountId: string): Promise<number> {
    const { count, error } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .or('phone_verified.eq.true,email_verified.eq.true');

    if (error) return 0;
    return count || 0;
  },

  async getInactiveCount(accountId: string): Promise<number> {
    const { count, error } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('phone_verified', false)
      .eq('email_verified', false);

    if (error) return 0;
    return count || 0;
  },
};

