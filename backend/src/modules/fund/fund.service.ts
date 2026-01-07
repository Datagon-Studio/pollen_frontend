/**
 * Fund Service
 * 
 * Contains business logic for funds.
 * No Supabase usage here (uses repository).
 * No HTTP responses here (uses controller).
 */

import { fundRepository } from './fund.repository.js';
import { Fund, CreateFundInput, UpdateFundInput } from './fund.entity.js';

export interface FundWithStats extends Fund {
  collected: number;
  contributors: number;
}

export class FundService {
  /**
   * Get fund by ID
   */
  async getFund(fundId: string): Promise<Fund | null> {
    return fundRepository.findById(fundId);
  }

  /**
   * Get all funds for an account
   */
  async getFundsByAccount(accountId: string): Promise<Fund[]> {
    return fundRepository.findByAccountId(accountId);
  }

  /**
   * Get active funds for an account
   */
  async getActiveFundsByAccount(accountId: string): Promise<Fund[]> {
    return fundRepository.findActiveByAccountId(accountId);
  }

  /**
   * Create a new fund
   */
  async createFund(input: CreateFundInput): Promise<Fund> {
    // Validate required fields
    if (!input.fund_name?.trim()) {
      throw new Error('Fund name is required');
    }
    if (!input.account_id) {
      throw new Error('Account ID is required');
    }

    // Business Rule: Trim fund name
    const fundData: CreateFundInput = {
      ...input,
      fund_name: input.fund_name.trim(),
      is_active: input.is_active ?? true,
    };

    return fundRepository.create(fundData);
  }

  /**
   * Update a fund
   */
  async updateFund(fundId: string, input: UpdateFundInput): Promise<Fund> {
    const existing = await fundRepository.findById(fundId);
    if (!existing) {
      throw new Error('Fund not found');
    }

    // Business Rule: Trim fund name if provided
    const updateData: UpdateFundInput = { ...input };
    if (updateData.fund_name !== undefined) {
      updateData.fund_name = updateData.fund_name.trim();
      if (!updateData.fund_name) {
        throw new Error('Fund name cannot be empty');
      }
    }

    return fundRepository.update(fundId, updateData);
  }

  /**
   * Delete a fund
   */
  async deleteFund(fundId: string): Promise<boolean> {
    const existing = await fundRepository.findById(fundId);
    if (!existing) {
      throw new Error('Fund not found');
    }

    return fundRepository.delete(fundId);
  }

  /**
   * Activate a fund
   */
  async activateFund(fundId: string): Promise<Fund> {
    return fundRepository.update(fundId, { is_active: true });
  }

  /**
   * Deactivate a fund
   */
  async deactivateFund(fundId: string): Promise<Fund> {
    return fundRepository.update(fundId, { is_active: false });
  }

  /**
   * Get fund statistics for an account
   */
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
  }
}

export const fundService = new FundService();

