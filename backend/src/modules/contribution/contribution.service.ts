import { contributionRepository, Contribution, CreateContributionInput, UpdateContributionInput, ContributionWithDetails } from './contribution.repository.js';
import { fundRepository } from '../fund/fund.repository.js';
import { memberRepository } from '../member/member.repository.js';
import { accountRepository } from '../account/account.repository.js';
import { configRepository } from '../config/config.repository.js';
import { userRepository } from '../user/user.repository.js';
import { postmarkService } from '../../shared/services/postmark.service.js';

export const contributionService = {
  async getContribution(id: string): Promise<Contribution | null> {
    return contributionRepository.findById(id);
  },

  async getContributionsByAccount(accountId: string): Promise<ContributionWithDetails[]> {
    return contributionRepository.findByAccountId(accountId);
  },

  async getContributionsByMember(memberId: string): Promise<ContributionWithDetails[]> {
    const contributions = await contributionRepository.findByMemberId(memberId);
    // Map to ContributionWithDetails format (fund_name is already included from repository)
    return contributions.map(c => ({
      ...c,
      member_name: '', // Not needed for member's own contributions
      fund_name: (c as any).fund_name || '',
    })) as ContributionWithDetails[];
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
    // Handle empty string as null
    const memberId = input.member_id && input.member_id.trim() !== '' ? input.member_id : null;
    if (memberId) {
      const member = await memberRepository.findById(memberId);
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
      member_id: memberId, // Use normalized member_id (null if empty string)
      channel: input.channel || 'offline',
      status: input.status || 'pending',
      date_received: input.date_received || new Date().toISOString(),
      received_by_user_id: input.received_by_user_id || (input.channel === 'offline' ? userId : null) || null,
    };

    const contribution = await contributionRepository.create(contributionData);

    // Send email notification to admins if enabled
    try {
      const config = await configRepository.findByAccountId(input.account_id);
      // Check if email notifications are enabled via default_notification_channel
      const shouldSendEmail = config && (
        config.default_notification_channel === 'email' || 
        config.default_notification_channel === 'both'
      );
      
      if (shouldSendEmail) {
        const account = await accountRepository.findByAccountId(input.account_id);
        const admins = await userRepository.findAdminsByAccountId(input.account_id);
        const fund = await fundRepository.findById(input.fund_id);
        const member = memberId ? await memberRepository.findById(memberId) : null;

        // Format amount
        const formattedAmount = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(input.amount);

        // Prepare email content
        const subject = `New Contribution Received - ${formattedAmount}`;
        const memberName = member ? member.full_name || 'Anonymous' : 'Anonymous';
        const fundName = fund?.fund_name || 'Unknown Fund';
        const accountName = account?.account_name || 'Your Account';

        const htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">New Contribution Received</h2>
            <p>Hello,</p>
            <p>A new contribution has been received for <strong>${accountName}</strong>:</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Amount:</strong> ${formattedAmount}</p>
              <p style="margin: 5px 0;"><strong>Fund:</strong> ${fundName}</p>
              <p style="margin: 5px 0;"><strong>Contributor:</strong> ${memberName}</p>
              <p style="margin: 5px 0;"><strong>Channel:</strong> ${input.channel === 'online' ? 'Online' : 'Offline'}</p>
              ${input.comment ? `<p style="margin: 5px 0;"><strong>Comment:</strong> ${input.comment}</p>` : ''}
            </div>
            <p style="margin-top: 20px;">Thank you for using PollenHive!</p>
          </body>
          </html>
        `;

        const textBody = `
New Contribution Received

A new contribution has been received for ${accountName}:

Amount: ${formattedAmount}
Fund: ${fundName}
Contributor: ${memberName}
Channel: ${input.channel === 'online' ? 'Online' : 'Offline'}
${input.comment ? `Comment: ${input.comment}` : ''}

Thank you for using PollenHive!
        `.trim();

        // Send emails to all admins
        const emailPromises = admins
          .filter(admin => admin.email) // Only send to admins with email
          .map(admin => 
            postmarkService.sendEmail(
              admin.email,
              subject,
              htmlBody,
              textBody,
              'new-contribution'
            )
          );

        await Promise.allSettled(emailPromises);
        console.log(`📧 [Contribution] Sent email notifications to ${admins.length} admin(s)`);
      }
    } catch (error) {
      // Don't fail contribution creation if email fails
      console.error('Error sending contribution notification emails:', error);
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

