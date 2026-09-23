/**
 * Fund Settlement Service
 *
 * Contains business logic for fund settlements.
 * No Supabase usage here (uses repository).
 * No HTTP responses here (uses controller).
 */

import { fundSettlementRepository } from './fund-settlement.repository.js';
import { fundService } from '../fund/fund.service.js';
import { contributionRepository } from '../contribution/contribution.repository.js';
import { PAYMENT_FEE_RATE } from '../payment/paystack-fees.js';
import {
  FundSettlementWithDetails,
  CreateFundSettlementInput,
  UpdateFundSettlementInput,
  FundSettlementStats,
  FundSettlementAvailability,
} from './fund-settlement.entity.js';

function roundMoney(amount: number): number {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

export class FundSettlementService {
  async getSettlement(settlementId: string): Promise<FundSettlementWithDetails | null> {
    return fundSettlementRepository.findById(settlementId);
  }

  async getSettlementsByAccount(accountId: string): Promise<FundSettlementWithDetails[]> {
    return fundSettlementRepository.findByAccountId(accountId);
  }

  async getSettlementsByFund(accountId: string, fundId: string): Promise<FundSettlementWithDetails[]> {
    const fund = await fundService.getFund(fundId);
    if (!fund || fund.account_id !== accountId) {
      throw new Error('Fund not found');
    }
    return fundSettlementRepository.findByFundId(accountId, fundId);
  }

  async getAvailability(
    accountId: string,
    fundId: string,
    excludeSettlementId?: string
  ): Promise<FundSettlementAvailability> {
    const fund = await fundService.getFund(fundId);
    if (!fund || fund.account_id !== accountId) {
      throw new Error('Fund not found');
    }

    const [breakdown, reservedAmount] = await Promise.all([
      contributionRepository.getConfirmedBreakdownByFund(fundId),
      fundSettlementRepository.getReservedAmountByFund(accountId, fundId, excludeSettlementId),
    ]);

    const collected = roundMoney(breakdown.total);
    const onlineCollected = roundMoney(breakdown.online);
    const offlineCollected = roundMoney(breakdown.offline);
    const feeAmount = roundMoney(onlineCollected * PAYMENT_FEE_RATE);
    const reserved = roundMoney(reservedAmount);
    // Contribution amounts already exclude donor-paid transaction fees.
    const availableAmount = roundMoney(Math.max(0, collected - reserved));

    return {
      fund_id: fundId,
      collected,
      onlineCollected,
      offlineCollected,
      feeAmount,
      reservedAmount: reserved,
      availableAmount,
    };
  }

  async createSettlement(input: CreateFundSettlementInput): Promise<FundSettlementWithDetails> {
    if (!input.account_id) {
      throw new Error('Account ID is required');
    }
    if (!input.fund_id) {
      throw new Error('Fund is required');
    }
    if (!input.recorded_by_user_id) {
      throw new Error('User ID is required');
    }
    if (!input.amount || input.amount <= 0) {
      throw new Error('Valid amount is required (must be greater than 0)');
    }

    const fund = await fundService.getFund(input.fund_id);
    if (!fund || fund.account_id !== input.account_id) {
      throw new Error('Fund not found');
    }

    const status = input.status || 'pending';
    if (status !== 'pending' && status !== 'successful') {
      throw new Error('New settlements must be pending or successful');
    }

    await this.assertAmountWithinAvailable(input.account_id, input.fund_id, input.amount);

    return fundSettlementRepository.create({
      ...input,
      settlement_date: input.settlement_date || new Date().toISOString().split('T')[0],
      status,
      reference: input.reference?.trim() || null,
      notes: input.notes?.trim() || null,
    });
  }

  async updateSettlement(
    settlementId: string,
    accountId: string,
    input: UpdateFundSettlementInput
  ): Promise<FundSettlementWithDetails> {
    const existing = await this.requireOwnedSettlement(settlementId, accountId);

    if (existing.is_archived) {
      throw new Error('Archived settlements cannot be edited');
    }
    if (existing.status !== 'pending') {
      throw new Error('Only pending settlements can be edited');
    }

    if (input.amount !== undefined && input.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const nextFundId = input.fund_id || existing.fund_id;
    if (input.fund_id && input.fund_id !== existing.fund_id) {
      const fund = await fundService.getFund(input.fund_id);
      if (!fund || fund.account_id !== accountId) {
        throw new Error('Fund not found');
      }
    }

    const nextAmount = input.amount !== undefined ? input.amount : Number(existing.amount);
    await this.assertAmountWithinAvailable(
      accountId,
      nextFundId,
      nextAmount,
      existing.settlement_id
    );

    const updateData: UpdateFundSettlementInput = { ...input };
    if (updateData.reference !== undefined) {
      updateData.reference = updateData.reference?.trim() || null;
    }
    if (updateData.notes !== undefined) {
      updateData.notes = updateData.notes?.trim() || null;
    }

    return fundSettlementRepository.update(settlementId, updateData);
  }

  async markSuccessful(settlementId: string, accountId: string): Promise<FundSettlementWithDetails> {
    const existing = await this.requireOwnedSettlement(settlementId, accountId);
    this.assertPendingAndActive(existing);
    return fundSettlementRepository.updateStatus(settlementId, 'successful');
  }

  async cancelSettlement(settlementId: string, accountId: string): Promise<FundSettlementWithDetails> {
    const existing = await this.requireOwnedSettlement(settlementId, accountId);
    this.assertPendingAndActive(existing);
    return fundSettlementRepository.updateStatus(settlementId, 'canceled');
  }

  async archiveSettlement(
    settlementId: string,
    accountId: string,
    userId: string
  ): Promise<FundSettlementWithDetails> {
    const existing = await this.requireOwnedSettlement(settlementId, accountId);
    if (existing.is_archived) {
      throw new Error('Settlement is already archived');
    }
    return fundSettlementRepository.archive(settlementId, userId);
  }

  async unarchiveSettlement(settlementId: string, accountId: string): Promise<FundSettlementWithDetails> {
    const existing = await this.requireOwnedSettlement(settlementId, accountId);
    if (!existing.is_archived) {
      throw new Error('Settlement is not archived');
    }
    return fundSettlementRepository.unarchive(settlementId);
  }

  async getStats(accountId: string): Promise<FundSettlementStats> {
    const settlements = await fundSettlementRepository.findByAccountId(accountId);
    const active = settlements.filter((s) => !s.is_archived);

    return {
      pendingCount: active.filter((s) => s.status === 'pending').length,
      successfulCount: active.filter((s) => s.status === 'successful').length,
      canceledCount: active.filter((s) => s.status === 'canceled').length,
      archivedCount: settlements.filter((s) => s.is_archived).length,
      pendingAmount: active
        .filter((s) => s.status === 'pending')
        .reduce((sum, s) => sum + Number(s.amount), 0),
      successfulAmount: active
        .filter((s) => s.status === 'successful')
        .reduce((sum, s) => sum + Number(s.amount), 0),
    };
  }

  private async requireOwnedSettlement(
    settlementId: string,
    accountId: string
  ): Promise<FundSettlementWithDetails> {
    const existing = await fundSettlementRepository.findById(settlementId);
    if (!existing || existing.account_id !== accountId) {
      throw new Error('Settlement not found');
    }
    return existing;
  }

  private assertPendingAndActive(settlement: FundSettlementWithDetails): void {
    if (settlement.is_archived) {
      throw new Error('Archived settlements cannot be updated');
    }
    if (settlement.status !== 'pending') {
      throw new Error('Only pending settlements can change status');
    }
  }

  private async assertAmountWithinAvailable(
    accountId: string,
    fundId: string,
    amount: number,
    excludeSettlementId?: string
  ): Promise<void> {
    const availability = await this.getAvailability(accountId, fundId, excludeSettlementId);
    if (roundMoney(amount) > availability.availableAmount) {
      throw new Error(
        `Amount exceeds the maximum requestable for this fund (${availability.availableAmount.toFixed(2)})`
      );
    }
  }
}

export const fundSettlementService = new FundSettlementService();
