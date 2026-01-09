/**
 * Account Service
 * 
 * Contains all business rules.
 * Calls repository functions only.
 * Throws errors when rules fail.
 */

import { accountRepository } from './account.repository.js';
import {
  Account,
  UpdateAccountInput,
} from './account.entity.js';

export class AccountService {
  /**
   * Get current user's account
   */
  async getUserAccount(userId: string): Promise<Account | null> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return accountRepository.findByUserId(userId);
  }

  /**
   * Update account (only account_name, account_logo, foreground_color, and background_color)
   * Status cannot be changed - always stays 'active'
   */
  async updateAccount(userId: string, accountId: string, input: UpdateAccountInput): Promise<Account> {
    if (!accountId) {
      throw new Error('Account ID is required');
    }

    // Business Rule: Verify user owns this account
    const userAccount = await accountRepository.findByUserId(userId);
    if (!userAccount || userAccount.account_id !== accountId) {
      throw new Error('Unauthorized: You do not have access to this account');
    }

    // Business Rule: Only allow updating account_name, account_logo, foreground_color, and background_color
    // Status and kyc_status cannot be changed by user
    const updateData: UpdateAccountInput = {};
    
    // Handle account_name: use provided value, or keep existing if not provided
    if (input.account_name !== undefined) {
      updateData.account_name = input.account_name;
    }
    
    // Handle account_logo: use provided value (including null), or keep existing if not provided
    if (input.account_logo !== undefined) {
      updateData.account_logo = input.account_logo;
    }

    // Handle foreground_color: use provided value (including null), or keep existing if not provided
    if (input.foreground_color !== undefined) {
      updateData.foreground_color = input.foreground_color;
    }

    // Handle background_color: use provided value (including null), or keep existing if not provided
    if (input.background_color !== undefined) {
      updateData.background_color = input.background_color;
    }

    // Business Rule: Account name validation if provided
    if (updateData.account_name !== null && updateData.account_name !== undefined) {
      if (updateData.account_name.trim() === '') {
        throw new Error('Account name cannot be empty');
      }
      if (updateData.account_name.length > 255) {
        throw new Error('Account name must be less than 255 characters');
      }
      updateData.account_name = updateData.account_name.trim();
    }

    return accountRepository.update(accountId, updateData);
  }
}

export const accountService = new AccountService();
