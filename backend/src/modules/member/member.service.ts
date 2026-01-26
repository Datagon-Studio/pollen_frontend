/**
 * Member Service
 * 
 * Contains business logic for members.
 * No Supabase usage here (uses repository).
 * No HTTP responses here (uses controller).
 */

import { memberRepository } from './member.repository.js';
import { Member, CreateMemberInput, UpdateMemberInput } from './member.entity.js';
import { postmarkService } from '../../shared/services/postmark.service.js';
import crypto from 'crypto';

export class MemberService {
  /**
   * Get member by ID
   */
  async getMember(memberId: string): Promise<Member | null> {
    return memberRepository.findById(memberId);
  }

  /**
   * Get all members for an account
   */
  async getMembersByAccount(accountId: string): Promise<Member[]> {
    return memberRepository.findByAccountId(accountId);
  }

  /**
   * Create a new member
   */
  async createMember(input: CreateMemberInput): Promise<Member> {
    // Validate required fields
    if (!input.full_name?.trim()) {
      throw new Error('Full name is required');
    }
    if (!input.phone?.trim()) {
      throw new Error('Phone number is required');
    }
    if (!input.account_id) {
      throw new Error('Account ID is required');
    }

    // Business Rule: Check for duplicate phone
    const existingPhone = await memberRepository.findByPhone(input.phone.trim(), input.account_id);
    if (existingPhone) {
      throw new Error('A member with this phone number already exists');
    }

    // Business Rule: Check for duplicate email if provided
    if (input.email?.trim()) {
      const existingEmail = await memberRepository.findByEmail(input.email.trim(), input.account_id);
      if (existingEmail) {
        throw new Error('A member with this email already exists');
      }
    }

    // Business Rule: Check for duplicate membership number if provided
    if (input.membership_number?.trim()) {
      const existingMembership = await memberRepository.findByMembershipNumber(
        input.membership_number.trim(),
        input.account_id
      );
      if (existingMembership) {
        throw new Error('A member with this membership number already exists');
      }
    }

    // Business Rule: Trim text fields
    const memberData: CreateMemberInput = {
      ...input,
      full_name: input.full_name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      membership_number: input.membership_number?.trim() || null,
      phone_verified: input.phone_verified ?? false,
      email_verified: input.email_verified ?? false,
    };

    return memberRepository.create(memberData);
  }

  /**
   * Update a member
   */
  async updateMember(memberId: string, input: UpdateMemberInput): Promise<Member> {
    const existing = await memberRepository.findById(memberId);
    if (!existing) {
      throw new Error('Member not found');
    }

    // Business Rule: Check for duplicate phone if changing
    if (input.phone && input.phone.trim() !== existing.phone) {
      const existingPhone = await memberRepository.findByPhone(input.phone.trim(), existing.account_id);
      if (existingPhone) {
        throw new Error('A member with this phone number already exists');
      }
    }

    // Business Rule: Check for duplicate email if changing
    if (input.email && input.email.trim() !== existing.email) {
      const existingEmail = await memberRepository.findByEmail(input.email.trim(), existing.account_id);
      if (existingEmail) {
        throw new Error('A member with this email already exists');
      }
    }

    // Business Rule: Check for duplicate membership number if changing
    if (input.membership_number && input.membership_number.trim() !== existing.membership_number) {
      const existingMembership = await memberRepository.findByMembershipNumber(
        input.membership_number.trim(),
        existing.account_id
      );
      if (existingMembership) {
        throw new Error('A member with this membership number already exists');
      }
    }

    // Business Rule: Trim text fields if provided
    const updateData: UpdateMemberInput = { ...input };
    if (updateData.full_name !== undefined) {
      updateData.full_name = updateData.full_name.trim();
      if (!updateData.full_name) {
        throw new Error('Full name cannot be empty');
      }
    }
    if (updateData.phone !== undefined) {
      updateData.phone = updateData.phone.trim();
      if (!updateData.phone) {
        throw new Error('Phone number cannot be empty');
      }
    }
    if (updateData.email !== undefined && updateData.email) {
      updateData.email = updateData.email.trim();
    }
    if (updateData.membership_number !== undefined && updateData.membership_number) {
      updateData.membership_number = updateData.membership_number.trim();
    }

    return memberRepository.update(memberId, updateData);
  }

  /**
   * Delete a member
   */
  async deleteMember(memberId: string): Promise<boolean> {
    const existing = await memberRepository.findById(memberId);
    if (!existing) {
      throw new Error('Member not found');
    }

    return memberRepository.delete(memberId);
  }

  /**
   * Verify phone number
   */
  async verifyPhone(memberId: string): Promise<Member> {
    return memberRepository.update(memberId, { phone_verified: true });
  }

  /**
   * Verify email
   */
  async verifyEmail(memberId: string): Promise<Member> {
    return memberRepository.update(memberId, { email_verified: true });
  }

  /**
   * Send verification email to member
   */
  async sendVerificationEmail(memberId: string, baseUrl?: string): Promise<void> {
    const member = await this.getMember(memberId);
    if (!member) {
      throw new Error('Member not found');
    }

    if (!member.email) {
      throw new Error('Member does not have an email address');
    }

    if (member.email_verified) {
      throw new Error('Email is already verified');
    }

    // Generate verification token
    const secret = process.env.EMAIL_VERIFICATION_SECRET || 'default-secret-change-in-production';
    const timestamp = Date.now();
    const tokenData = `${memberId}:${member.email}:${timestamp}`;
    const token = crypto
      .createHash('sha256')
      .update(tokenData + secret)
      .digest('hex');
    
    const verificationToken = Buffer.from(`${memberId}:${timestamp}:${token}`).toString('base64url');

    // Create verification URL
    const frontendUrl = baseUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = `${frontendUrl}/verify-member-email?token=${verificationToken}`;

    // Send email via Postmark
    const emailSubject = 'Verify Your Email - PollenHive';
    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Verify Your Email Address</h2>
          <p>Hello ${member.full_name},</p>
          <p>Thank you for joining! Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" class="button">Verify Email</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <div class="footer">
            <p>If you didn't request this verification email, you can safely ignore it.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await postmarkService.sendEmail(
      member.email,
      emailSubject,
      emailBody,
      `Hello ${member.full_name},\n\nThank you for joining! Please verify your email address by clicking this link:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't request this verification email, you can safely ignore it.`,
      'email-verification'
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to send verification email');
    }
  }

  /**
   * Get member statistics for an account
   */
  async getMemberStats(accountId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const [members, activeCount, inactiveCount] = await Promise.all([
      memberRepository.findByAccountId(accountId),
      memberRepository.getActiveCount(accountId),
      memberRepository.getInactiveCount(accountId),
    ]);

    return {
      total: members.length,
      active: activeCount,
      inactive: inactiveCount,
    };
  }

  /**
   * Check if member is active (phone or email verified)
   */
  isMemberActive(member: Member): boolean {
    return member.phone_verified || member.email_verified;
  }
}

export const memberService = new MemberService();