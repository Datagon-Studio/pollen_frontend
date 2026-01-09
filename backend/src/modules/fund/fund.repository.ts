/**
 * Fund Repository
 * 
 * Handles all Supabase queries.
 * No validation, no HTTP responses, no business logic.
 */

import { supabase } from '../../shared/supabase/client.js';
import { Fund, CreateFundInput, UpdateFundInput } from './fund.entity.js';

export const fundRepository = {
  /**
   * Find fund by ID
   */
  async findById(fundId: string): Promise<Fund | null> {
    const { data, error } = await supabase
      .from('funds')
      .select('*')
      .eq('fund_id', fundId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to find fund: ${error.message}`);
    }
    return data;
  },

  /**
   * Find all funds for an account
   */
  async findByAccountId(accountId: string): Promise<Fund[]> {
    const { data, error } = await supabase
      .from('funds')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch funds: ${error.message}`);
    }
    return data || [];
  },

  /**
   * Find active funds for an account
   */
  async findActiveByAccountId(accountId: string): Promise<Fund[]> {
    const { data, error } = await supabase
      .from('funds')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch active funds: ${error.message}`);
    }
    return data || [];
  },

  /**
   * Find public active funds for an account (for public pages)
   */
  async findPublicActiveByAccountId(accountId: string): Promise<Fund[]> {
    const { data, error } = await supabase
      .from('funds')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch public active funds: ${error.message}`);
    }
    return data || [];
  },

  /**
   * Create a new fund
   */
  async create(input: CreateFundInput): Promise<Fund> {
    const { data, error } = await supabase
      .from('funds')
      .insert({
        account_id: input.account_id,
        fund_name: input.fund_name,
        description: input.description ?? null,
        default_amount: input.default_amount ?? null,
        is_active: input.is_active ?? true,
        is_public: input.is_public ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create fund: ${error.message}`);
    }
    return data;
  },

  /**
   * Update a fund
   */
  async update(fundId: string, input: UpdateFundInput): Promise<Fund> {
    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};

    if (input.fund_name !== undefined) {
      updateData.fund_name = input.fund_name;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.default_amount !== undefined) {
      updateData.default_amount = input.default_amount;
    }
    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }
    if (input.is_public !== undefined) {
      updateData.is_public = input.is_public;
    }

    const { data, error } = await supabase
      .from('funds')
      .update(updateData)
      .eq('fund_id', fundId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update fund: ${error.message}`);
    }
    return data;
  },

  /**
   * Delete a fund
   */
  async delete(fundId: string): Promise<boolean> {
    const { error } = await supabase
      .from('funds')
      .delete()
      .eq('fund_id', fundId);

    if (error) {
      throw new Error(`Failed to delete fund: ${error.message}`);
    }
    return true;
  },

  /**
   * Get count of active funds for an account
   */
  async getActiveCount(accountId: string): Promise<number> {
    const { count, error } = await supabase
      .from('funds')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to get active count: ${error.message}`);
    }
    return count || 0;
  },

  /**
   * Get total count of funds for an account
   */
  async getTotalCount(accountId: string): Promise<number> {
    const { count, error } = await supabase
      .from('funds')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId);

    if (error) {
      throw new Error(`Failed to get total count: ${error.message}`);
    }
    return count || 0;
  },
};

