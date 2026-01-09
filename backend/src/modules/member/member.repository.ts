/**
 * Member Repository
 * 
 * Handles all Supabase queries.
 * No validation, no HTTP responses, no business logic.
 */

import { supabase } from '../../shared/supabase/client.js';
import { Member, CreateMemberInput, UpdateMemberInput } from './member.entity.js';

export const memberRepository = {
  /**
   * Find member by ID
   */
  async findById(memberId: string): Promise<Member | null> {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('member_id', memberId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to find member: ${error.message}`);
    }
    return data;
  },

  /**
   * Find all members for an account
   */
  async findByAccountId(accountId: string): Promise<Member[]> {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch members: ${error.message}`);
    }
    return data || [];
  },

  /**
   * Find member by phone number
   */
  async findByPhone(phone: string, accountId: string): Promise<Member | null> {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('phone', phone)
      .eq('account_id', accountId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to find member by phone: ${error.message}`);
    }
    return data;
  },

  /**
   * Find member by email
   */
  async findByEmail(email: string, accountId: string): Promise<Member | null> {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('email', email)
      .eq('account_id', accountId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to find member by email: ${error.message}`);
    }
    return data;
  },

  /**
   * Find member by membership number
   */
  async findByMembershipNumber(membershipNumber: string, accountId: string): Promise<Member | null> {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('membership_number', membershipNumber)
      .eq('account_id', accountId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to find member by membership number: ${error.message}`);
    }
    return data;
  },

  /**
   * Create a new member
   */
  async create(input: CreateMemberInput): Promise<Member> {
    const { data, error } = await supabase
      .from('members')
      .insert({
        account_id: input.account_id,
        full_name: input.full_name,
        dob: input.dob || null,
        phone: input.phone,
        phone_verified: input.phone_verified ?? false,
        email: input.email || null,
        email_verified: input.email_verified ?? false,
        membership_number: input.membership_number || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create member: ${error.message}`);
    }
    return data;
  },

  /**
   * Update a member
   */
  async update(memberId: string, input: UpdateMemberInput): Promise<Member> {
    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};

    if (input.full_name !== undefined) {
      updateData.full_name = input.full_name;
    }
    if (input.dob !== undefined) {
      updateData.dob = input.dob;
    }
    if (input.phone !== undefined) {
      updateData.phone = input.phone;
    }
    if (input.phone_verified !== undefined) {
      updateData.phone_verified = input.phone_verified;
    }
    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    if (input.email_verified !== undefined) {
      updateData.email_verified = input.email_verified;
    }
    if (input.membership_number !== undefined) {
      updateData.membership_number = input.membership_number;
    }

    const { data, error } = await supabase
      .from('members')
      .update(updateData)
      .eq('member_id', memberId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update member: ${error.message}`);
    }
    return data;
  },

  /**
   * Delete a member
   */
  async delete(memberId: string): Promise<boolean> {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('member_id', memberId);

    if (error) {
      throw new Error(`Failed to delete member: ${error.message}`);
    }
    return true;
  },

  /**
   * Get count of active members (phone or email verified)
   */
  async getActiveCount(accountId: string): Promise<number> {
    const { count, error } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .or('phone_verified.eq.true,email_verified.eq.true');

    if (error) {
      throw new Error(`Failed to get active count: ${error.message}`);
    }
    return count || 0;
  },

  /**
   * Get count of inactive members (neither phone nor email verified)
   */
  async getInactiveCount(accountId: string): Promise<number> {
    const { count, error } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('phone_verified', false)
      .eq('email_verified', false);

    if (error) {
      throw new Error(`Failed to get inactive count: ${error.message}`);
    }
    return count || 0;
  },
};
