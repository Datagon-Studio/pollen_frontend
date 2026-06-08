/**
 * Account KYC Service
 * 
 * Business logic for Account KYC operations.
 */

import { accountKYCRepository } from './account-kyc.repository.js';
import { accountRepository } from './account.repository.js';
import { CreateAccountKYCInput, UpdateAccountKYCInput, AccountKYC } from './account-kyc.entity.js';
import { KYCStatus } from './account.entity.js';
import { supabase } from '../../shared/supabase/client.js';

const KYC_DOCUMENT_PATH_PATTERN =
  /^(business-registration|passport-photo|national-id)\/[0-9a-f-]{36}\/\d+\.[a-z0-9]+$/i;

export class AccountKYCService {
  /**
   * Submit or update KYC information
   */
  async submitKYC(input: CreateAccountKYCInput): Promise<AccountKYC> {
    // Validate account exists
    const account = await accountRepository.findByAccountId(input.account_id);
    if (!account) {
      throw new Error('Account not found');
    }

    // Validate document requirements based on account type
    if (input.account_type === 'business' && !input.business_registration_url) {
      throw new Error('Business registration document is required for business accounts');
    }

    if (input.account_type === 'individual' && !input.passport_photo_url) {
      throw new Error('Passport photo is required for individual accounts');
    }

    if (!input.national_id_url) {
      throw new Error('National ID document is required');
    }

    // Check if KYC already exists
    const existing = await accountKYCRepository.findByAccountId(input.account_id);

    let kyc: AccountKYC;
    if (existing) {
      // Update existing KYC
      kyc = await accountKYCRepository.update(input.account_id, {
        account_type: input.account_type,
        official_name: input.official_name,
        business_registration_url: input.business_registration_url ?? null,
        passport_photo_url: input.passport_photo_url ?? null,
        national_id_url: input.national_id_url,
      });
    } else {
      // Create new KYC
      kyc = await accountKYCRepository.create(input);
    }

    // Update account KYC status to pending (for both new and updated submissions)
    try {
      const updatedAccount = await accountRepository.update(input.account_id, {
        kyc_status: KYCStatus.PENDING,
      });
      console.log('Account KYC status updated to pending:', updatedAccount.kyc_status);
    } catch (error) {
      console.error('Failed to update account KYC status:', error);
      throw new Error(`Failed to update account KYC status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return kyc;
  }

  /**
   * Get KYC by account ID
   */
  async getKYCByAccountId(accountId: string): Promise<AccountKYC | null> {
    return await accountKYCRepository.findByAccountId(accountId);
  }

  /**
   * Update KYC information
   */
  async updateKYC(accountId: string, input: UpdateAccountKYCInput): Promise<AccountKYC> {
    const existing = await accountKYCRepository.findByAccountId(accountId);
    if (!existing) {
      throw new Error('KYC record not found');
    }

    // Validate document requirements based on account type
    const accountType = input.account_type ?? existing.account_type;

    if (accountType === 'business' && !input.business_registration_url && !existing.business_registration_url) {
      throw new Error('Business registration document is required for business accounts');
    }

    if (accountType === 'individual' && !input.passport_photo_url && !existing.passport_photo_url) {
      throw new Error('Passport photo is required for individual accounts');
    }

    return await accountKYCRepository.update(accountId, input);
  }

  /**
   * Get all KYC submissions (for admin review)
   */
  async getAllKYC(): Promise<AccountKYC[]> {
    return await accountKYCRepository.findAll();
  }

  /**
   * Verify KYC and update account status
   */
  async verifyKYC(accountId: string, verifiedBy: string): Promise<AccountKYC> {
    const kyc = await accountKYCRepository.verify(accountId, verifiedBy);
    
    // Update account KYC status to verified
    await accountRepository.update(accountId, {
      kyc_status: KYCStatus.VERIFIED,
    });

    return kyc;
  }

  /**
   * Generate a signed URL for a KYC document (admin use only)
   */
  async getDocumentSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
    if (!KYC_DOCUMENT_PATH_PATTERN.test(filePath)) {
      throw new Error('Invalid KYC document path');
    }

    const { data, error } = await supabase.storage
      .from('kyc-documents')
      .createSignedUrl(filePath, expiresIn);

    if (error || !data?.signedUrl) {
      throw new Error(error?.message || 'Failed to generate signed URL');
    }

    return data.signedUrl;
  }

  /**
   * Reject KYC and update account status
   */
  async rejectKYC(accountId: string, verifiedBy: string): Promise<void> {
    // Update account KYC status to rejected
    await accountRepository.update(accountId, {
      kyc_status: KYCStatus.REJECTED,
    });
  }
}

export const accountKYCService = new AccountKYCService();
