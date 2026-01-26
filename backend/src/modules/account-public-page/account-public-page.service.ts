/**
 * Account Public Page Service
 * 
 * Business logic only.
 * No Supabase, no HTTP responses.
 */

import { accountPublicPageRepository } from './account-public-page.repository.js';
import { accountRepository } from '../account/account.repository.js';
import { AccountPublicPage, CreateAccountPublicPageInput, UpdateAccountPublicPageInput } from './account-public-page.entity.js';

export class AccountPublicPageService {
  /**
   * Get public page by account ID (creates default if none exists)
   */
  async getPublicPageByAccountId(userId: string, accountId: string): Promise<AccountPublicPage> {
    // Verify user has access to this account
    const userAccount = await accountRepository.findByUserId(userId);
    if (!userAccount || userAccount.account_id !== accountId) {
      throw new Error('Unauthorized: You do not have access to this account');
    }

    let publicPage = await accountPublicPageRepository.findByAccountId(accountId);

    // If no public page exists, create a default one
    if (!publicPage) {
      const account = await accountRepository.findByAccountId(accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      const createInput: CreateAccountPublicPageInput = {
        account_id: accountId,
        display_name: account.account_name,
        logo_url: account.account_logo,
        primary_color: null,
        secondary_color: null,
        is_published: false,
      };

      publicPage = await accountPublicPageRepository.create(createInput);
    }

    return publicPage;
  }

  /**
   * Update public page
   */
  async updatePublicPage(userId: string, accountId: string, input: UpdateAccountPublicPageInput): Promise<AccountPublicPage> {
    // Verify user has access to this account
    const userAccount = await accountRepository.findByUserId(userId);
    if (!userAccount || userAccount.account_id !== accountId) {
      throw new Error('Unauthorized: You do not have access to this account');
    }

    // Check if public page exists, create if not
    let publicPage = await accountPublicPageRepository.findByAccountId(accountId);
    if (!publicPage) {
      const account = await accountRepository.findByAccountId(accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      const createInput: CreateAccountPublicPageInput = {
        account_id: accountId,
        display_name: account.account_name,
        logo_url: account.account_logo,
        primary_color: input.primary_color ?? null,
        secondary_color: input.secondary_color ?? null,
        is_published: input.is_published ?? false,
      };

      publicPage = await accountPublicPageRepository.create(createInput);
    } else {
      // Update existing public page
      publicPage = await accountPublicPageRepository.update(accountId, input);
    }

    return publicPage;
  }
}

export const accountPublicPageService = new AccountPublicPageService();
