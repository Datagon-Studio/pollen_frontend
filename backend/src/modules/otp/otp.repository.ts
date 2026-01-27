/**
 * OTP Repository
 * 
 * Handles all Supabase queries for OTP codes.
 */

import { supabase } from '../../shared/supabase/client.js';

export interface OTPCode {
  otp_id: string;
  account_id: string;
  identifier: string;
  identifier_type: 'email' | 'phone';
  otp_code: string;
  expires_at: string;
  verified: boolean;
  attempts: number;
  max_attempts: number;
  created_at: string;
  verified_at: string | null;
}

export interface CreateOTPInput {
  account_id: string;
  identifier: string;
  identifier_type: 'email' | 'phone';
  otp_code: string;
  expires_at: Date;
  max_attempts?: number;
}

export const otpRepository = {
  /**
   * Create a new OTP code
   */
  async create(input: CreateOTPInput): Promise<OTPCode> {
    // Mark any existing unverified OTPs for this identifier as expired
    await supabase
      .from('otp_codes')
      .update({ verified: true }) // Mark as "used" by setting verified to true
      .eq('account_id', input.account_id)
      .eq('identifier', input.identifier.toLowerCase().trim())
      .eq('identifier_type', input.identifier_type)
      .eq('verified', false);

    const { data, error } = await supabase
      .from('otp_codes')
      .insert({
        account_id: input.account_id,
        identifier: input.identifier.toLowerCase().trim(),
        identifier_type: input.identifier_type,
        otp_code: input.otp_code,
        expires_at: input.expires_at.toISOString(),
        max_attempts: input.max_attempts || 3,
        verified: false,
        attempts: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create OTP: ${error.message}`);
    }

    return data;
  },

  /**
   * Find active OTP by account, identifier, and type
   */
  async findActive(
    accountId: string,
    identifier: string,
    identifierType: 'email' | 'phone'
  ): Promise<OTPCode | null> {
    const normalizedIdentifier = identifier.toLowerCase().trim();

    const { data, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('account_id', accountId)
      .eq('identifier', normalizedIdentifier)
      .eq('identifier_type', identifierType)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find OTP: ${error.message}`);
    }

    return data;
  },

  /**
   * Verify OTP code
   */
  async verify(
    accountId: string,
    identifier: string,
    identifierType: 'email' | 'phone',
    code: string
  ): Promise<boolean> {
    const normalizedIdentifier = identifier.toLowerCase().trim();

    // Find active OTP
    const otp = await this.findActive(accountId, normalizedIdentifier, identifierType);

    if (!otp) {
      return false;
    }

    // Check if expired
    if (new Date(otp.expires_at) < new Date()) {
      return false;
    }

    // Check if max attempts reached
    if (otp.attempts >= otp.max_attempts) {
      return false;
    }

    // Increment attempts
    const { error: updateError } = await supabase
      .from('otp_codes')
      .update({ attempts: otp.attempts + 1 })
      .eq('otp_id', otp.otp_id);

    if (updateError) {
      throw new Error(`Failed to update OTP attempts: ${updateError.message}`);
    }

    // Verify code
    if (otp.otp_code !== code.trim()) {
      return false;
    }

    // Mark as verified
    const { error: verifyError } = await supabase
      .from('otp_codes')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('otp_id', otp.otp_id);

    if (verifyError) {
      throw new Error(`Failed to verify OTP: ${verifyError.message}`);
    }

    return true;
  },

  /**
   * Clean up expired OTPs
   */
  async cleanupExpired(): Promise<void> {
    await supabase
      .from('otp_codes')
      .delete()
      .lt('expires_at', new Date().toISOString());
  },
};
