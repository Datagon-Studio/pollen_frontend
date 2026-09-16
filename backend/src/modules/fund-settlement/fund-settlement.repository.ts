/**
 * Fund Settlement Repository
 *
 * Handles all Supabase queries.
 * No validation, no HTTP responses, no business logic.
 */

import { supabase } from '../../shared/supabase/client.js';
import {
  FundSettlement,
  FundSettlementWithDetails,
  CreateFundSettlementInput,
  UpdateFundSettlementInput,
} from './fund-settlement.entity.js';

function mapWithFundName(row: any): FundSettlementWithDetails {
  const { funds, ...settlement } = row;
  return {
    ...settlement,
    fund_name: funds?.fund_name || 'Unknown',
  };
}

export const fundSettlementRepository = {
  async findById(settlementId: string): Promise<FundSettlementWithDetails | null> {
    const { data, error } = await supabase
      .from('fund_settlements')
      .select(`
        *,
        funds(fund_name)
      `)
      .eq('settlement_id', settlementId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to find settlement: ${error.message}`);
    }
    return mapWithFundName(data);
  },

  async findByAccountId(accountId: string): Promise<FundSettlementWithDetails[]> {
    const { data, error } = await supabase
      .from('fund_settlements')
      .select(`
        *,
        funds(fund_name)
      `)
      .eq('account_id', accountId)
      .order('settlement_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch settlements: ${error.message}`);
    }
    return (data || []).map(mapWithFundName);
  },

  async findByFundId(accountId: string, fundId: string): Promise<FundSettlementWithDetails[]> {
    const { data, error } = await supabase
      .from('fund_settlements')
      .select(`
        *,
        funds(fund_name)
      `)
      .eq('account_id', accountId)
      .eq('fund_id', fundId)
      .order('settlement_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch settlements for fund: ${error.message}`);
    }
    return (data || []).map(mapWithFundName);
  },

  async create(input: CreateFundSettlementInput): Promise<FundSettlementWithDetails> {
    const { data, error } = await supabase
      .from('fund_settlements')
      .insert({
        account_id: input.account_id,
        fund_id: input.fund_id,
        recorded_by_user_id: input.recorded_by_user_id,
        amount: input.amount,
        settlement_date: input.settlement_date,
        status: input.status || 'pending',
        reference: input.reference ?? null,
        notes: input.notes ?? null,
      })
      .select(`
        *,
        funds(fund_name)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create settlement: ${error.message}`);
    }
    return mapWithFundName(data);
  },

  async update(settlementId: string, input: UpdateFundSettlementInput): Promise<FundSettlementWithDetails> {
    const updateData: Record<string, unknown> = {};

    if (input.fund_id !== undefined) updateData.fund_id = input.fund_id;
    if (input.amount !== undefined) updateData.amount = input.amount;
    if (input.settlement_date !== undefined) updateData.settlement_date = input.settlement_date;
    if (input.reference !== undefined) updateData.reference = input.reference;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const { data, error } = await supabase
      .from('fund_settlements')
      .update(updateData)
      .eq('settlement_id', settlementId)
      .select(`
        *,
        funds(fund_name)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update settlement: ${error.message}`);
    }
    return mapWithFundName(data);
  },

  async updateStatus(
    settlementId: string,
    status: FundSettlement['status']
  ): Promise<FundSettlementWithDetails> {
    const { data, error } = await supabase
      .from('fund_settlements')
      .update({ status })
      .eq('settlement_id', settlementId)
      .select(`
        *,
        funds(fund_name)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update settlement status: ${error.message}`);
    }
    return mapWithFundName(data);
  },

  async archive(settlementId: string, archivedByUserId: string): Promise<FundSettlementWithDetails> {
    const { data, error } = await supabase
      .from('fund_settlements')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by_user_id: archivedByUserId,
      })
      .eq('settlement_id', settlementId)
      .select(`
        *,
        funds(fund_name)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to archive settlement: ${error.message}`);
    }
    return mapWithFundName(data);
  },

  async unarchive(settlementId: string): Promise<FundSettlementWithDetails> {
    const { data, error } = await supabase
      .from('fund_settlements')
      .update({
        is_archived: false,
        archived_at: null,
        archived_by_user_id: null,
      })
      .eq('settlement_id', settlementId)
      .select(`
        *,
        funds(fund_name)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to restore settlement: ${error.message}`);
    }
    return mapWithFundName(data);
  },
};
