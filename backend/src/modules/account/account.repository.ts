import { supabase } from '../../shared/supabase/client.js';

export interface Account {
  id: string;
  account_name: string;
  account_status: 'active' | 'inactive' | 'suspended';
  kyc_status: 'pending' | 'verified' | 'rejected';
  official_name: string | null;
  account_type: string | null;
  logo_url: string | null;
  url_slug: string | null;
  display_name: string | null;
  primary_color: string | null;
  is_public_page_published: boolean;
  settlement_type: 'bank' | 'mobile_money' | null;
  settlement_account_name: string | null;
  settlement_account_number: string | null;
  settlement_provider: string | null;
  settlement_active: boolean;
  notification_channel: 'sms' | 'email' | 'both';
  notify_new_contributions: boolean;
  notify_pending_confirmations: boolean;
  notify_birthdays: boolean;
  member_portal_enabled: boolean;
  expense_visibility: 'none' | 'summary' | 'detailed';
  show_fund_balances: boolean;
  show_contribution_rankings: boolean;
  created_at: string;
  updated_at: string;
}

export type CreateAccountInput = Omit<Account, 'id' | 'created_at' | 'updated_at'>;
export type UpdateAccountInput = Partial<CreateAccountInput>;

export const accountRepository = {
  async findById(id: string): Promise<Account | null> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching account:', error);
      return null;
    }
    return data;
  },

  async findBySlug(slug: string): Promise<Account | null> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('url_slug', slug)
      .single();

    if (error) return null;
    return data;
  },

  async findAll(): Promise<Account[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
      return [];
    }
    return data || [];
  },

  async create(input: CreateAccountInput): Promise<Account | null> {
    const { data, error } = await supabase
      .from('accounts')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('Error creating account:', error);
      return null;
    }
    return data;
  },

  async update(id: string, input: UpdateAccountInput): Promise<Account | null> {
    const { data, error } = await supabase
      .from('accounts')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating account:', error);
      return null;
    }
    return data;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting account:', error);
      return false;
    }
    return true;
  },
};

