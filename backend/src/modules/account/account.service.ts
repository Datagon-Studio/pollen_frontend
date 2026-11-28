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
import { LoginAccessError, loginMessages } from '../../shared/login-access.js';

export class AccountService {
  /**
   * Get current user's account
   */
  async getUserAccount(userId: string, preferredAccountId?: string | null): Promise<Account | null> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return accountRepository.findByUserId(userId, preferredAccountId);
  }

  /**
   * Account a signed-in user may open. Throws a specific login error when
   * the login is valid but the account cannot be used.
   */
  async resolveForSession(userId: string, preferredAccountId?: string | null): Promise<Account> {
    const accounts = await accountRepository.findAllByUserId(userId);
    if (accounts.length === 0) {
      throw new LoginAccessError(loginMessages.notLinked, 'not_linked');
    }

    if (preferredAccountId) {
      const match = accounts.find((account) => account.account_id === preferredAccountId);
      if (!match) {
        throw new LoginAccessError(loginMessages.notInAccount, 'not_in_account');
      }
      this.assertAccountOpen(match);
      return match;
    }

    const open = accounts.filter((account) => account.status === 'active');
    const named = open.filter((account) => account.account_name && account.account_name.trim());
    if (named.length > 0) return named[0];
    if (open.length > 0) return open[0];

    if (accounts.some((account) => account.status === 'suspended')) {
      throw new LoginAccessError(loginMessages.accountSuspended, 'account_suspended');
    }
    throw new LoginAccessError(loginMessages.accountDeactivated, 'account_deactivated');
  }

  assertAccountOpen(account: Account): void {
    if (account.status === 'suspended') {
      throw new LoginAccessError(loginMessages.accountSuspended, 'account_suspended');
    }
    if (account.status === 'inactive') {
      throw new LoginAccessError(loginMessages.accountDeactivated, 'account_deactivated');
    }
  }

  /**
   * Update account (only account_name and account_logo)
   * Status cannot be changed - always stays 'active'
   */
  async updateAccount(userId: string, accountId: string, input: UpdateAccountInput): Promise<Account> {
    if (!accountId) {
      throw new Error('Account ID is required');
    }

    // Business Rule: Verify user is linked to this account
    const hasAccess = await accountRepository.userHasAccountAccess(userId, accountId);
    if (!hasAccess) {
      throw new Error('Unauthorized: You do not have access to this account');
    }

    // Business Rule: Only allow updating account_name and account_logo
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

  /**
   * Get account by account ID (public access)
   */
  async getAccountById(accountId: string): Promise<Account | null> {
    if (!accountId) {
      throw new Error('Account ID is required');
    }

    return accountRepository.findByAccountId(accountId);
  }
}

export const accountService = new AccountService();
