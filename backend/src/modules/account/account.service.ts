import { accountRepository, Account, CreateAccountInput, UpdateAccountInput } from './account.repository.js';

export const accountService = {
  async getAccount(id: string): Promise<Account | null> {
    return accountRepository.findById(id);
  },

  async getAccountBySlug(slug: string): Promise<Account | null> {
    return accountRepository.findBySlug(slug);
  },

  async getAllAccounts(): Promise<Account[]> {
    return accountRepository.findAll();
  },

  async createAccount(input: CreateAccountInput): Promise<Account | null> {
    // Validate required fields
    if (!input.account_name?.trim()) {
      throw new Error('Account name is required');
    }

    // Set defaults
    const accountData: CreateAccountInput = {
      ...input,
      account_status: input.account_status || 'active',
      kyc_status: input.kyc_status || 'pending',
      is_public_page_published: input.is_public_page_published ?? false,
      settlement_active: input.settlement_active ?? false,
      notification_channel: input.notification_channel || 'both',
      notify_new_contributions: input.notify_new_contributions ?? true,
      notify_pending_confirmations: input.notify_pending_confirmations ?? true,
      notify_birthdays: input.notify_birthdays ?? false,
      member_portal_enabled: input.member_portal_enabled ?? true,
      expense_visibility: input.expense_visibility || 'summary',
      show_fund_balances: input.show_fund_balances ?? true,
      show_contribution_rankings: input.show_contribution_rankings ?? false,
    };

    return accountRepository.create(accountData);
  },

  async updateAccount(id: string, input: UpdateAccountInput): Promise<Account | null> {
    // Verify account exists
    const existing = await accountRepository.findById(id);
    if (!existing) {
      throw new Error('Account not found');
    }

    return accountRepository.update(id, input);
  },

  async deleteAccount(id: string): Promise<boolean> {
    const existing = await accountRepository.findById(id);
    if (!existing) {
      throw new Error('Account not found');
    }

    return accountRepository.delete(id);
  },

  async updatePublicPageSettings(
    id: string,
    settings: {
      url_slug?: string;
      display_name?: string;
      primary_color?: string;
      logo_url?: string;
      is_public_page_published?: boolean;
    }
  ): Promise<Account | null> {
    return accountRepository.update(id, settings);
  },

  async updateSettlementDetails(
    id: string,
    settlement: {
      settlement_type?: 'bank' | 'mobile_money';
      settlement_account_name?: string;
      settlement_account_number?: string;
      settlement_provider?: string;
      settlement_active?: boolean;
    }
  ): Promise<Account | null> {
    return accountRepository.update(id, settlement);
  },

  async updateNotificationSettings(
    id: string,
    notifications: {
      notification_channel?: 'sms' | 'email' | 'both';
      notify_new_contributions?: boolean;
      notify_pending_confirmations?: boolean;
      notify_birthdays?: boolean;
      member_portal_enabled?: boolean;
    }
  ): Promise<Account | null> {
    return accountRepository.update(id, notifications);
  },

  async updateExpenseTransparency(
    id: string,
    transparency: {
      expense_visibility?: 'none' | 'summary' | 'detailed';
      show_fund_balances?: boolean;
      show_contribution_rankings?: boolean;
    }
  ): Promise<Account | null> {
    return accountRepository.update(id, transparency);
  },
};

