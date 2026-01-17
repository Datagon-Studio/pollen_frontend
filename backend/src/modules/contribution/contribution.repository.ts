import { supabase } from '../../shared/supabase/client.js';

export interface Contribution {
  contribution_id: string;
  account_id: string;
  fund_id: string;
  member_id: string | null;
  channel: 'offline' | 'online';
  payment_method: string | null;
  amount: number;
  date_received: string;
  received_by_user_id: string | null;
  comment: string | null;
  payment_reference: string | null;
  status: 'pending' | 'confirmed' | 'failed' | 'reversed';
  created_at: string;
  updated_at: string;
}

export interface ContributionWithDetails extends Contribution {
  member_name: string;
  fund_name: string;
}

export type CreateContributionInput = Omit<Contribution, 'contribution_id' | 'created_at' | 'updated_at'>;
export type UpdateContributionInput = Partial<Omit<CreateContributionInput, 'account_id' | 'fund_id'>>;

export const contributionRepository = {
  async findById(id: string): Promise<Contribution | null> {
    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .eq('contribution_id', id)
      .single();

    if (error) return null;
    return data;
  },

  async findByAccountId(accountId: string): Promise<ContributionWithDetails[]> {
    const { data, error } = await supabase
      .from('contributions')
      .select(`
        *,
        members(full_name),
        funds(fund_name)
      `)
      .eq('account_id', accountId)
      .order('date_received', { ascending: false });

    if (error) {
      console.error('Error fetching contributions:', error);
      return [];
    }

    return (data || []).map((c: any) => ({
      ...c,
      member_name: c.members?.full_name || 'Anonymous',
      fund_name: c.funds?.fund_name || 'Unknown',
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
        members(full_name),
        funds(fund_name)
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
      member_name: c.members?.full_name || 'Anonymous',
      fund_name: c.funds?.fund_name || 'Unknown',
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
      .eq('contribution_id', id)
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
      .eq('contribution_id', id);

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
    return (data || []).reduce((sum: number, c: any) => sum + Number(c.amount), 0);
  },

  async getTotalByMember(memberId: string): Promise<number> {
    const { data, error } = await supabase
      .from('contributions')
      .select('amount')
      .eq('member_id', memberId)
      .eq('status', 'confirmed');

    if (error) return 0;
    return (data || []).reduce((sum: number, c: any) => sum + Number(c.amount), 0);
  },

  async getContributorCountByFund(fundId: string): Promise<number> {
    const { data, error } = await supabase
      .from('contributions')
      .select('member_id')
      .eq('fund_id', fundId)
      .eq('status', 'confirmed');

    if (error) return 0;
    const uniqueMembers = new Set((data || []).map((c: any) => c.member_id).filter((id: string | null) => id !== null));
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
    return (data || []).reduce((sum: number, c: any) => sum + Number(c.amount), 0);
  },
};

