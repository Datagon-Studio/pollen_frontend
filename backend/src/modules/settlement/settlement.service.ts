/**
 * Settlement Details Service
 * 
 * Business logic for Settlement Details operations.
 */

import { settlementRepository } from './settlement.repository.js';
import { accountRepository } from '../account/account.repository.js';
import { CreateSettlementDetailsInput, UpdateSettlementDetailsInput, SettlementDetails } from './settlement.entity.js';

export class SettlementService {
  /**
   * Create or update settlement details
   */
  async upsertSettlementDetails(input: CreateSettlementDetailsInput): Promise<SettlementDetails> {
    // Validate account exists
    const account = await accountRepository.findByAccountId(input.account_id);
    if (!account) {
      throw new Error('Account not found');
    }

    // Validate provider is provided for mobile_money
    if (input.settlement_type === 'mobile_money' && !input.provider) {
      throw new Error('Provider is required for mobile money settlement type');
    }

    // Check if active settlement already exists
    const existingActive = await settlementRepository.findActiveByAccountId(input.account_id);

    if (existingActive) {
      // Update existing active settlement
      return await settlementRepository.update(existingActive.settlement_id, {
        settlement_type: input.settlement_type,
        account_name: input.account_name,
        account_number: input.account_number,
        provider: input.provider ?? null,
        is_active: input.is_active ?? true,
      });
    }

    // Create new settlement details
    return await settlementRepository.create(input);
  }

  /**
   * Get settlement details by account ID
   */
  async getSettlementDetailsByAccountId(accountId: string): Promise<SettlementDetails[]> {
    return await settlementRepository.findByAccountId(accountId);
  }

  /**
   * Get active settlement details by account ID
   */
  async getActiveSettlementDetails(accountId: string): Promise<SettlementDetails | null> {
    return await settlementRepository.findActiveByAccountId(accountId);
  }

  /**
   * Update settlement details
   */
  async updateSettlementDetails(settlementId: string, input: UpdateSettlementDetailsInput): Promise<SettlementDetails> {
    const existing = await settlementRepository.findById(settlementId);
    if (!existing) {
      throw new Error('Settlement details not found');
    }

    // Validate provider is provided for mobile_money if type is being changed
    if (input.settlement_type === 'mobile_money' && !input.provider && existing.settlement_type !== 'mobile_money') {
      throw new Error('Provider is required for mobile money settlement type');
    }

    return await settlementRepository.update(settlementId, input);
  }

  /**
   * Delete settlement details
   */
  async deleteSettlementDetails(settlementId: string): Promise<void> {
    await settlementRepository.delete(settlementId);
  }
}

export const settlementService = new SettlementService();
