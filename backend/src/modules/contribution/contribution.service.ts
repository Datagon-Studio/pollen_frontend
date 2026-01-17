import { contributionRepository, Contribution, CreateContributionInput, UpdateContributionInput, ContributionWithDetails } from './contribution.repository.js';
import { fundRepository } from '../fund/fund.repository.js';
import { memberRepository } from '../member/member.repository.js';

export const contributionService = {
  async getContribution(id: string): Promise<Contribution | null> {
    return contributionRepository.findById(id);
  },

  async getContributionsByAccount(accountId: string): Promise<ContributionWithDetails[]> {
    return contributionRepository.findByAccountId(accountId);
  },

  async getContributionsByMember(memberId: string): Promise<Contribution[]> {
    return contributionRepository.findByMemberId(memberId);
  },

  async getContributionsByFund(fundId: string): Promise<Contribution[]> {
    return contributionRepository.findByFundId(fundId);
  },

  async getPendingContributions(accountId: string): Promise<ContributionWithDetails[]> {
    return contributionRepository.findPendingByAccountId(accountId);
  },

  async createContribution(input: CreateContributionInput, userId?: string): Promise<Contribution | null> {
    // Validate required fields
    if (!input.fund_id) {
      throw new Error('Fund ID is required');
    }
    if (!input.account_id) {
      throw new Error('Account ID is required');
    }
    if (!input.amount || input.amount <= 0) {
      throw new Error('Valid amount is required');
    }

    // Validate member exists if provided (member_id is nullable for anonymous donations)
    if (input.member_id) {
      const member = await memberRepository.findById(input.member_id);
      if (!member) {
        throw new Error('Member not found');
      }
      // Verify member belongs to the same account
      if (member.account_id !== input.account_id) {
        throw new Error('Member does not belong to this account');
      }
    }

    // Validate fund exists
    const fund = await fundRepository.findById(input.fund_id);
    if (!fund) {
      throw new Error('Fund not found');
    }

    // Verify fund belongs to the same account
    if (fund.account_id !== input.account_id) {
      throw new Error('Fund does not belong to this account');
    }

    // Check if fund is active (only active funds accept contributions)
    if (!fund.is_active) {
      throw new Error(`Fund "${fund.fund_name}" is inactive and cannot accept contributions`);
    }

    // Check minimum amount if fund has default
    if (fund.default_amount && input.amount < fund.default_amount) {
      throw new Error(`Minimum contribution for ${fund.fund_name} is $${fund.default_amount}`);
    }

    // Business rule: For offline contributions, received_by_user_id is required
    if (input.channel === 'offline' && !input.received_by_user_id && !userId) {
      throw new Error('Received by user ID is required for offline contributions');
    }

    // Business rule: For online contributions, payment_reference should be provided
    if (input.channel === 'online' && !input.payment_reference) {
      // Allow it but log warning - might be pending webhook confirmation
    }

    // Set defaults
    const contributionData: CreateContributionInput = {
      ...input,
      channel: input.channel || 'offline',
      status: input.status || 'pending',
      date_received: input.date_received || new Date().toISOString(),
      received_by_user_id: input.received_by_user_id || (input.channel === 'offline' ? userId : null) || null,
    };

    const contribution = await contributionRepository.create(contributionData);

    return contribution;
  },

  async updateContribution(id: string, input: UpdateContributionInput): Promise<Contribution | null> {
    const existing = await contributionRepository.findById(id);
    if (!existing) {
      throw new Error('Contribution not found');
    }

    return contributionRepository.update(id, input);
  },

  async confirmContribution(id: string): Promise<Contribution | null> {
    const existing = await contributionRepository.findById(id);
    if (!existing) {
      throw new Error('Contribution not found');
    }

    const contribution = await contributionRepository.update(id, { status: 'confirmed' });

    // Note: total_contributed is calculated from contributions, not stored on member
    // If you need to store it, add total_contributed field to members table and member entity

    return contribution;
  },

  async rejectContribution(id: string): Promise<Contribution | null> {
    const existing = await contributionRepository.findById(id);
    if (!existing) {
      throw new Error('Contribution not found');
    }

    return contributionRepository.update(id, { status: 'failed' });
  },

  async deleteContribution(id: string): Promise<boolean> {
    const existing = await contributionRepository.findById(id);
    if (!existing) {
      throw new Error('Contribution not found');
    }

    const deleted = await contributionRepository.delete(id);

    // Note: total_contributed is calculated from contributions, not stored on member
    // If you need to store it, add total_contributed field to members table and member entity

    return deleted;
  },

  async getContributionStats(accountId: string): Promise<{
    pendingCount: number;
    pendingAmount: number;
  }> {
    const [pendingCount, pendingAmount] = await Promise.all([
      contributionRepository.getPendingCount(accountId),
      contributionRepository.getPendingAmount(accountId),
    ]);

    return {
      pendingCount,
      pendingAmount,
    };
  },

  async getFundContributionStats(fundId: string): Promise<{
    totalCollected: number;
    contributorCount: number;
  }> {
    const [totalCollected, contributorCount] = await Promise.all([
      contributionRepository.getTotalByFund(fundId),
      contributionRepository.getContributorCountByFund(fundId),
    ]);

    return {
      totalCollected,
      contributorCount,
    };
  },
};

