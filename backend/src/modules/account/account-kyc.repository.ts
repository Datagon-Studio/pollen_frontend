/**
 * Account KYC Repository
 * 
 * Handles all Supabase queries for Account KYC.
 */

import { supabase } from '../../shared/supabase/client.js';
import { AccountKYC, CreateAccountKYCInput, UpdateAccountKYCInput } from './account-kyc.entity.js';

export const accountKYCRepository = {
  /**
   * Create a new KYC record
   */
  async create(input: CreateAccountKYCInput): Promise<AccountKYC> {
    const { data, error } = await supabase
      .from('account_kyc')
      .insert({
        account_id: input.account_id,
        account_type: input.account_type,
        official_name: input.official_name,
        business_registration_url: input.business_registration_url ?? null,
        passport_photo_url: input.passport_photo_url ?? null,
        national_id_url: input.national_id_url,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create KYC: ${error.message}`);
    }

    return data;
  },

  /**
   * Find KYC by account_id
   */
  async findByAccountId(accountId: string): Promise<AccountKYC | null> {
    const { data, error } = await supabase
      .from('account_kyc')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to find KYC: ${error.message}`);
    }

    return data;
  },

  /**
   * Update KYC record
   */
  async update(accountId: string, input: UpdateAccountKYCInput): Promise<AccountKYC> {
    const { data, error } = await supabase
      .from('account_kyc')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', accountId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update KYC: ${error.message}`);
    }

    return data;
  },

  /**
   * Get all KYC records (for admin review)
   */
  async findAll(): Promise<AccountKYC[]> {
    const { data, error } = await supabase
      .from('account_kyc')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find all KYC: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Verify KYC (set verified_by and verified_at)
   */
  async verify(accountId: string, verifiedBy: string): Promise<AccountKYC> {
    const { data, error } = await supabase
      .from('account_kyc')
      .update({
        verified_by: verifiedBy,
        verified_at: new Date().toISOString(),
      })
      .eq('account_id', accountId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to verify KYC: ${error.message}`);
    }

    return data;
  },
};
