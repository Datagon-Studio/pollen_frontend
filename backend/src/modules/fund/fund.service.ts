import { fundRepository, Fund, CreateFundInput, UpdateFundInput } from './fund.repository.js';

export interface FundWithStats extends Fund {
  collected: number;
  contributors: number;
}

export const fundService = {
  async getFund(id: string): Promise<Fund | null> {
    return fundRepository.findById(id);
  },

  async getFundsByAccount(accountId: string): Promise<Fund[]> {
    return fundRepository.findByAccountId(accountId);
  },

  async getActiveFundsByAccount(accountId: string): Promise<Fund[]> {
    return fundRepository.findActiveByAccountId(accountId);
  },

  async createFund(input: CreateFundInput): Promise<Fund | null> {
    // Validate required fields
    if (!input.fund_name?.trim()) {
      throw new Error('Fund name is required');
    }
    if (!input.account_id) {
      throw new Error('Account ID is required');
    }

    // Set defaults
    const fundData: CreateFundInput = {
      ...input,
      is_active: input.is_active ?? true,
    };

    return fundRepository.create(fundData);
  },

  async updateFund(id: string, input: UpdateFundInput): Promise<Fund | null> {
    const existing = await fundRepository.findById(id);
    if (!existing) {
      throw new Error('Fund not found');
    }

    return fundRepository.update(id, input);
  },

  async deleteFund(id: string): Promise<boolean> {
    const existing = await fundRepository.findById(id);
    if (!existing) {
      throw new Error('Fund not found');
    }

    return fundRepository.delete(id);
  },

  async activateFund(id: string): Promise<Fund | null> {
    return fundRepository.update(id, { is_active: true });
  },

  async deactivateFund(id: string): Promise<Fund | null> {
    return fundRepository.update(id, { is_active: false });
  },

  async getFundStats(accountId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const [activeCount, totalCount] = await Promise.all([
      fundRepository.getActiveCount(accountId),
      fundRepository.getTotalCount(accountId),
    ]);

    return {
      total: totalCount,
      active: activeCount,
      inactive: totalCount - activeCount,
    };
  },
};

