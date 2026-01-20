/**
 * Settlement Details Repository
 * 
 * Handles all Supabase queries for Settlement Details.
 */

import { supabase } from '../../shared/supabase/client.js';
import { SettlementDetails, CreateSettlementDetailsInput, UpdateSettlementDetailsInput } from './settlement.entity.js';

export const settlementRepository = {
  /**
   * Create a new settlement details record
   */
  async create(input: CreateSettlementDetailsInput): Promise<SettlementDetails> {
    // If this is being set as active, deactivate all other settlement details for this account first
    if (input.is_active !== false) {
      const { error: updateError } = await supabase
        .from('account_settlement_details')
        .update({ is_active: false })
        .eq('account_id', input.account_id)
        .eq('is_active', true);
      
      if (updateError) {
        console.error('Error deactivating existing settlements:', updateError);
        // Continue anyway - the unique constraint will handle it
      }
    }

    const { data, error } = await supabase
      .from('account_settlement_details')
      .insert({
        account_id: input.account_id,
        settlement_type: input.settlement_type,
        account_name: input.account_name,
        account_number: input.account_number,
        bank_name: input.bank_name ?? null,
        bank_branch: input.bank_branch ?? null,
        provider: input.provider ?? null,
        is_active: input.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create settlement details: ${error.message}`);
    }

    return data;
  },

  /**
   * Find settlement details by account_id
   */
  async findByAccountId(accountId: string): Promise<SettlementDetails[]> {
    const { data, error } = await supabase
      .from('account_settlement_details')
      .select('*')
      .eq('account_id', accountId)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find settlement details: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Find active settlement details by account_id
   */
  async findActiveByAccountId(accountId: string): Promise<SettlementDetails | null> {
    const { data, error } = await supabase
      .from('account_settlement_details')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to find active settlement details: ${error.message}`);
    }

    return data;
  },

  /**
   * Update settlement details
   */
  async update(settlementId: string, input: UpdateSettlementDetailsInput): Promise<SettlementDetails> {
    // If this is being set as active, deactivate all other settlement details for this account
    if (input.is_active === true) {
      const existing = await this.findById(settlementId);
      if (existing) {
        await supabase
          .from('account_settlement_details')
          .update({ is_active: false })
          .eq('account_id', existing.account_id)
          .eq('is_active', true)
          .neq('settlement_id', settlementId);
      }
    }

    const updateData: any = {
      ...input,
      updated_at: new Date().toISOString(),
    };
    
    // Ensure bank fields are null for mobile_money and provider is null for bank
    if (input.settlement_type === 'mobile_money') {
      updateData.bank_name = null;
      updateData.bank_branch = null;
    } else if (input.settlement_type === 'bank') {
      updateData.provider = null;
    }

    const { data, error } = await supabase
      .from('account_settlement_details')
      .update(updateData)
      .eq('settlement_id', settlementId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update settlement details: ${error.message}`);
    }

    return data;
  },

  /**
   * Find by settlement_id
   */
  async findById(settlementId: string): Promise<SettlementDetails | null> {
    const { data, error } = await supabase
      .from('account_settlement_details')
      .select('*')
      .eq('settlement_id', settlementId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to find settlement details: ${error.message}`);
    }

    return data;
  },

  /**
   * Delete settlement details
   */
  async delete(settlementId: string): Promise<void> {
    const { error } = await supabase
      .from('account_settlement_details')
      .delete()
      .eq('settlement_id', settlementId);

    if (error) {
      throw new Error(`Failed to delete settlement details: ${error.message}`);
    }
  },
};
