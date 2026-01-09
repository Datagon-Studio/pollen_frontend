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

  async createContribution(input: CreateContributionInput): Promise<Contribution | null> {
    // Validate required fields
    if (!input.member_id) {
      throw new Error('Member ID is required');
    }
    if (!input.fund_id) {
      throw new Error('Fund ID is required');
    }
    if (!input.amount || input.amount <= 0) {
      throw new Error('Valid amount is required');
    }
    if (!input.payment_method) {
      throw new Error('Payment method is required');
    }

    // Validate member exists
    const member = await memberRepository.findById(input.member_id);
    if (!member) {
      throw new Error('Member not found');
    }

    // Validate fund exists
    const fund = await fundRepository.findById(input.fund_id);
    if (!fund) {
      throw new Error('Fund not found');
    }

    // Check if fund is active (only active funds accept contributions)
    if (!fund.is_active) {
      throw new Error(`Fund "${fund.fund_name}" is inactive and cannot accept contributions`);
    }

    // Check minimum amount if fund has default
    if (fund.default_amount && input.amount < fund.default_amount) {
      throw new Error(`Minimum contribution for ${fund.fund_name} is $${fund.default_amount}`);
    }

    // Set defaults
    const contributionData: CreateContributionInput = {
      ...input,
      channel: input.channel || 'offline',
      status: input.status || 'pending',
      date_received: input.date_received || new Date().toISOString(),
    };

    const contribution = await contributionRepository.create(contributionData);

    // Update member total if confirmed
    if (contribution && contribution.status === 'confirmed') {
      const newTotal = await contributionRepository.getTotalByMember(member.id);
      await memberRepository.updateTotalContributed(member.id, newTotal);
    }

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

    if (contribution) {
      // Update member total
      const newTotal = await contributionRepository.getTotalByMember(existing.member_id);
      await memberRepository.updateTotalContributed(existing.member_id, newTotal);
    }

    return contribution;
  },

  async rejectContribution(id: string): Promise<Contribution | null> {
    const existing = await contributionRepository.findById(id);
    if (!existing) {
      throw new Error('Contribution not found');
    }

    return contributionRepository.update(id, { status: 'rejected' });
  },

  async deleteContribution(id: string): Promise<boolean> {
    const existing = await contributionRepository.findById(id);
    if (!existing) {
      throw new Error('Contribution not found');
    }

    const deleted = await contributionRepository.delete(id);

    if (deleted && existing.status === 'confirmed') {
      // Update member total
      const newTotal = await contributionRepository.getTotalByMember(existing.member_id);
      await memberRepository.updateTotalContributed(existing.member_id, newTotal);
    }

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

