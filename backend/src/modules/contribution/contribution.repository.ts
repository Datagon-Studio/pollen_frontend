import { supabase } from '../../shared/supabase/client.js';

export interface Contribution {
  id: string;
  account_id: string;
  member_id: string;
  fund_id: string;
  amount: number;
  channel: 'online' | 'offline';
  payment_method: string;
  status: 'pending' | 'confirmed' | 'rejected';
  date_received: string;
  comment: string | null;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContributionWithDetails extends Contribution {
  member_name: string;
  fund_name: string;
}

export type CreateContributionInput = Omit<Contribution, 'id' | 'created_at' | 'updated_at'>;
export type UpdateContributionInput = Partial<Omit<CreateContributionInput, 'account_id' | 'member_id' | 'fund_id'>>;

export const contributionRepository = {
  async findById(id: string): Promise<Contribution | null> {
    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  },

  async findByAccountId(accountId: string): Promise<ContributionWithDetails[]> {
    const { data, error } = await supabase
      .from('contributions')
      .select(`
        *,
        members!inner(first_name, last_name),
        funds!inner(fund_name)
      `)
      .eq('account_id', accountId)
      .order('date_received', { ascending: false });

    if (error) {
      console.error('Error fetching contributions:', error);
      return [];
    }

    return (data || []).map((c: any) => ({
      ...c,
      member_name: `${c.members.first_name} ${c.members.last_name}`,
      fund_name: c.funds.fund_name,
    }));
  },

  async findByMemberId(memberId: string): Promise<Contribution[]> {
    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .eq('member_id', memberId)
      .order('date_received', { ascending: false });

    if (error) {
      console.error('Error fetching member contributions:', error);
      return [];
    }
    return data || [];
  },

  async findByFundId(fundId: string): Promise<Contribution[]> {
    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .eq('fund_id', fundId)
      .order('date_received', { ascending: false });

    if (error) {
      console.error('Error fetching fund contributions:', error);
      return [];
    }
    return data || [];
  },

  async findPendingByAccountId(accountId: string): Promise<ContributionWithDetails[]> {
    const { data, error } = await supabase
      .from('contributions')
      .select(`
        *,
        members!inner(first_name, last_name),
        funds!inner(fund_name)
      `)
      .eq('account_id', accountId)
      .eq('status', 'pending')
      .order('date_received', { ascending: false });

    if (error) {
      console.error('Error fetching pending contributions:', error);
      return [];
    }

    return (data || []).map((c: any) => ({
      ...c,
      member_name: `${c.members.first_name} ${c.members.last_name}`,
      fund_name: c.funds.fund_name,
    }));
  },

  async create(input: CreateContributionInput): Promise<Contribution | null> {
    const { data, error } = await supabase
      .from('contributions')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('Error creating contribution:', error);
      return null;
    }
    return data;
  },

  async update(id: string, input: UpdateContributionInput): Promise<Contribution | null> {
    const { data, error } = await supabase
      .from('contributions')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contribution:', error);
      return null;
    }
    return data;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('contributions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting contribution:', error);
      return false;
    }
    return true;
  },

  async getTotalByFund(fundId: string): Promise<number> {
    const { data, error } = await supabase
      .from('contributions')
      .select('amount')
      .eq('fund_id', fundId)
      .eq('status', 'confirmed');

    if (error) return 0;
    return (data || []).reduce((sum, c) => sum + c.amount, 0);
  },

  async getTotalByMember(memberId: string): Promise<number> {
    const { data, error } = await supabase
      .from('contributions')
      .select('amount')
      .eq('member_id', memberId)
      .eq('status', 'confirmed');

    if (error) return 0;
    return (data || []).reduce((sum, c) => sum + c.amount, 0);
  },

  async getContributorCountByFund(fundId: string): Promise<number> {
    const { data, error } = await supabase
      .from('contributions')
      .select('member_id')
      .eq('fund_id', fundId)
      .eq('status', 'confirmed');

    if (error) return 0;
    const uniqueMembers = new Set((data || []).map(c => c.member_id));
    return uniqueMembers.size;
  },

  async getPendingCount(accountId: string): Promise<number> {
    const { count, error } = await supabase
      .from('contributions')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('status', 'pending');

    if (error) return 0;
    return count || 0;
  },

  async getPendingAmount(accountId: string): Promise<number> {
    const { data, error } = await supabase
      .from('contributions')
      .select('amount')
      .eq('account_id', accountId)
      .eq('status', 'pending');

    if (error) return 0;
    return (data || []).reduce((sum, c) => sum + c.amount, 0);
  },
};

