/**
 * Member Service
 * 
 * Contains business logic for members.
 * No Supabase usage here (uses repository).
 * No HTTP responses here (uses controller).
 */

import { memberRepository } from './member.repository.js';
import {
  Member,
  CreateMemberInput,
  UpdateMemberInput,
  BulkCreateMemberRow,
  BulkCreateMemberResult,
  BulkDeleteMemberResult,
} from './member.entity.js';
import { postmarkService } from '../../shared/services/postmark.service.js';
import { accountRepository } from '../account/account.repository.js';
import { supabase } from '../../shared/supabase/client.js';
import { env } from '../../env.js';
import { getFrontendUrl } from '../../shared/utils/frontend-url.js';
import { arkeselService } from '../../shared/services/arkesel.service.js';
import { bitlyService } from '../../shared/services/bitly.service.js';
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
  async createMember(input: CreateMemberInput, baseUrl?: string): Promise<Member> {
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

    const member = await memberRepository.create(memberData);

    // Send one welcome message when the member is added, regardless of
    // whether their phone was verified before creation.
    try {
      await this.sendWelcomeSMS(member, baseUrl);
    } catch (error) {
      console.error('[Create Member] Failed to send welcome SMS:', error);
    }

    // If collector, create user account and send welcome email
    if (input.isCollector && input.email?.trim()) {
      try {
        await this.createCollectorAccount(member, input.account_id, baseUrl);
      } catch (error) {
        // Log error but don't fail member creation
        console.error('[Create Member] Failed to create collector account:', error);
        // Re-throw to surface the error to the client
        throw new Error(`Failed to create collector account: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return member;
  }

  /**
   * Resolve the personalisation used by member SMS notifications.
   * Uses a persisted Bitly short URL when available; creates one once per account.
   */
  private async getMessageContext(
    member: Member,
    baseUrl?: string
  ): Promise<{ memberName: string; accountName: string; groupPageUrl: string }> {
    const account = await accountRepository.findByAccountId(member.account_id);
    if (!account) {
      throw new Error('Account not found');
    }

    const longUrl = `${getFrontendUrl(baseUrl)}/group/${member.account_id}`;
    let groupPageUrl = account.short_url || longUrl;

    if (!account.short_url) {
      try {
        const shortUrl = await bitlyService.shortenUrl(longUrl);
        if (shortUrl) {
          await accountRepository.update(member.account_id, { short_url: shortUrl });
          groupPageUrl = shortUrl;
        }
      } catch (error) {
        console.error('[Welcome SMS] Failed to create/persist short URL:', error);
      }
    }

    return {
      memberName: member.full_name.trim() || 'there',
      accountName: account.account_name?.trim() || 'your group',
      groupPageUrl,
    };
  }

  /**
   * Welcome a member when they are added to a group.
   */
  async sendWelcomeSMS(member: Member, baseUrl?: string): Promise<void> {
    const { memberName, accountName, groupPageUrl } = await this.getMessageContext(member, baseUrl);
    const message = `Hi ${memberName}! Welcome to Pollean, your welfare & fundraising platform. ${accountName} has invited you to manage your dues/pledges. Give, contribute, view, and track here: ${groupPageUrl}`;

    const result = await arkeselService.sendSMS(member.phone, message);
    if (!result.success) {
      throw new Error(result.error || 'Failed to send welcome SMS');
    }
  }

  /**
   * Create collector account (auth user + link to account + send welcome email)
   */
  async createCollectorAccount(member: Member, accountId: string, baseUrl?: string): Promise<void> {
    if (!member.email) {
      throw new Error('Email is required to create collector account');
    }

    // Get account details for welcome email
    const account = await accountRepository.findByAccountId(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const accountName = account.account_name || 'your group';

    // Check if user already exists by email - query users table directly (more efficient)
    let userExists = false;
    let userId: string | undefined;
    
    try {
      // Query users table directly to find by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', member.email.toLowerCase())
        .maybeSingle();
      
      if (userError && userError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned", which is fine
        console.error(`[Create Collector] Error checking user existence:`, userError);
        // Continue to try creating user
      } else if (userData?.user_id) {
        userExists = true;
        userId = userData.user_id;
        console.log(`[Create Collector] User ${member.email} already exists with ID: ${userId}`);
      }
    } catch (error) {
      console.log(`[Create Collector] Could not check existing users, will try to create:`, error);
      // Continue to try creating user
    }

    if (userExists && userId) {
      // Check if user is already linked to this account
      const { data: existingLink, error: linkError } = await supabase
        .from('user_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('account_id', accountId)
        .maybeSingle();

      if (linkError && linkError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned", which is fine
        console.error(`[Create Collector] Error checking account link:`, linkError);
        throw new Error(`Failed to check account link: ${linkError.message}`);
      }

      if (existingLink) {
        // User already linked, just send welcome email
        console.log(`[Create Collector] User ${userId} already linked to account ${accountId}, sending welcome email`);
        await this.sendCollectorWelcomeEmail(member, accountName, baseUrl);
        return;
      }
      
      // User exists but not linked to this account - link them
      console.log(`[Create Collector] Linking existing user ${userId} to account ${accountId}`);
      await accountRepository.linkUserToAccount(userId, accountId, 'officer');
      await this.sendCollectorWelcomeEmail(member, accountName, baseUrl);
      return;
    } else {
      // Create new auth user
      console.log(`[Create Collector] Creating new auth user for ${member.email}`);
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: member.email,
        email_confirm: true, // Auto-confirm email since it's verified
        user_metadata: {
          full_name: member.full_name,
        },
      });

      if (createError) {
        // Check if error is "user already exists"
        if (createError.message?.toLowerCase().includes('already been registered') || 
            createError.message?.toLowerCase().includes('user already exists')) {
          // User was created between our check and create - query users table
          console.log(`[Create Collector] User was created between check and create, querying users table`);
          
          // Query users table directly to find by email
          const { data: retryUserData, error: retryError } = await supabase
            .from('users')
            .select('user_id')
            .eq('email', member.email.toLowerCase())
            .maybeSingle();
          
          if (retryError && retryError.code !== 'PGRST116') {
            throw new Error(`Failed to find existing user: ${retryError.message}`);
          }
          
          if (retryUserData?.user_id) {
            const foundUserId = retryUserData.user_id;
            // Check if already linked
            const { data: existingLink } = await supabase
              .from('user_accounts')
              .select('*')
              .eq('user_id', foundUserId)
              .eq('account_id', accountId)
              .maybeSingle();
            
            if (existingLink) {
              await this.sendCollectorWelcomeEmail(member, accountName, baseUrl);
              return;
            }
            // Link existing user
            await accountRepository.linkUserToAccount(foundUserId, accountId, 'officer');
            await this.sendCollectorWelcomeEmail(member, accountName, baseUrl);
            return;
          } else {
            throw new Error(`Failed to create auth user: User exists but could not be found`);
          }
        } else {
          throw new Error(`Failed to create auth user: ${createError.message}`);
        }
      } else if (!newUser.user) {
        throw new Error('Failed to create auth user: No user returned');
      } else {
        userId = newUser.user.id;
      }

      // Wait a bit for the trigger to create user profile and account
      // Then remove any auto-created account link
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if trigger created an account link and remove it
      const { data: autoCreatedLinks } = await supabase
        .from('user_accounts')
        .select('account_id')
        .eq('user_id', userId);

      if (autoCreatedLinks && autoCreatedLinks.length > 0) {
        // Delete auto-created account links (trigger creates one)
        for (const link of autoCreatedLinks) {
          await supabase
            .from('user_accounts')
            .delete()
            .eq('user_id', userId)
            .eq('account_id', link.account_id);
        }
      }
      
      // Link new user to account with 'officer' role
      await accountRepository.linkUserToAccount(userId, accountId, 'officer');
      
      // Send welcome email with reset password link
      await this.sendCollectorWelcomeEmail(member, accountName, baseUrl);
    }
  }

  /**
   * Send welcome email to collector with reset password link
   */
  async sendCollectorWelcomeEmail(member: Member, accountName: string, baseUrl?: string): Promise<void> {
    if (!member.email) {
      throw new Error('Email is required');
    }

    const frontendUrl = getFrontendUrl(baseUrl);
    const resetPasswordUrl = `${frontendUrl}/reset-password`;
    console.log(`[Send Collector Welcome Email] Using frontend URL: ${frontendUrl}`);

    // Generate reset password link using Supabase Admin API
    let resetLink: string;
    try {
      const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: member.email,
        options: {
          redirectTo: resetPasswordUrl,
        },
      });

      if (resetError) {
        console.error('[Send Collector Welcome Email] Error generating reset link:', resetError);
        throw new Error(`Failed to generate reset password link: ${resetError.message}`);
      }

      if (!resetData?.properties?.action_link) {
        throw new Error('Reset password link was not generated');
      }

      resetLink = resetData.properties.action_link;
    } catch (error) {
      console.error('[Send Collector Welcome Email] Failed to generate reset link:', error);
      throw error;
    }

    // Collector role description
    const collectorRoles = [
      'Collect contributions from members',
      'Record expenses and transactions',
      'View member information and contributions',
      'Access admin portal features',
    ];

    const emailSubject = `Welcome to ${accountName} as a Collector`;
    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${accountName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
          .footer { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .button:hover { background-color: #0056b3; }
          .roles { margin: 20px 0; padding-left: 20px; }
          .roles li { margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${accountName}!</h1>
          </div>
          <div class="content">
            <p>Hello ${member.full_name},</p>
            <p>You have been added to <strong>${accountName}</strong> as a collector.</p>
            <p>Your role is to:</p>
            <ul class="roles">
              ${collectorRoles.map(role => `<li>${role}</li>`).join('')}
            </ul>
            <p>Kindly find attached the reset password link. Set a password with your verified email and login afterwards.</p>
            <a href="${resetLink}" class="button">Set Password & Login</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; background-color: #f8f9fa; padding: 10px; border-radius: 3px;">${resetLink}</p>
            <p>This link will expire in 24 hours.</p>
          </div>
          <div class="footer">
            <p>If you didn't expect this email, please contact the administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const plainText = `
Hello ${member.full_name},

You have been added to ${accountName} as a collector.

Your role is to:
${collectorRoles.map(role => `- ${role}`).join('\n')}

Kindly find attached the reset password link. Set a password with your verified email and login afterwards.

Reset Password Link: ${resetLink}

This link will expire in 24 hours.

If you didn't expect this email, please contact the administrator.
    `;

    const result = await postmarkService.sendEmail(
      member.email,
      emailSubject,
      emailBody,
      plainText,
      'collector-welcome'
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to send welcome email');
    }
  }

  /**
   * Bulk create members from uploaded spreadsheet rows
   */
  async bulkCreateMembers(
    accountId: string,
    rows: BulkCreateMemberRow[]
  ): Promise<BulkCreateMemberResult> {
    if (!accountId) {
      throw new Error('Account ID is required');
    }
    if (!rows.length) {
      throw new Error('No members to import');
    }

    const created: Member[] = [];
    const failed: BulkCreateMemberResult['failed'] = [];
    const seenPhones = new Set<string>();
    const seenMembershipNumbers = new Set<string>();

    for (let index = 0; index < rows.length; index++) {
      const rowNumber = index + 2; // account for header row
      const row = rows[index];
      const fullName = row.full_name?.trim() ?? '';
      const phone = row.phone?.trim() ?? '';
      const membershipNumber = row.membership_number?.trim() || null;

      if (!fullName) {
        failed.push({
          row: rowNumber,
          full_name: fullName,
          phone,
          error: 'Name is required',
        });
        continue;
      }

      if (!phone) {
        failed.push({
          row: rowNumber,
          full_name: fullName,
          phone,
          error: 'Number is required',
        });
        continue;
      }

      const normalizedPhone = phone.replace(/[\s\-+]/g, '');
      if (seenPhones.has(normalizedPhone)) {
        failed.push({
          row: rowNumber,
          full_name: fullName,
          phone,
          error: 'Duplicate phone number in upload file',
        });
        continue;
      }

      if (membershipNumber && seenMembershipNumbers.has(membershipNumber)) {
        failed.push({
          row: rowNumber,
          full_name: fullName,
          phone,
          error: 'Duplicate membership number in upload file',
        });
        continue;
      }

      try {
        const member = await this.createMember({
          account_id: accountId,
          full_name: fullName,
          phone,
          membership_number: membershipNumber,
          phone_verified: false,
          email_verified: false,
        });
        created.push(member);
        seenPhones.add(normalizedPhone);
        if (membershipNumber) {
          seenMembershipNumbers.add(membershipNumber);
        }
      } catch (error) {
        failed.push({
          row: rowNumber,
          full_name: fullName,
          phone,
          error: error instanceof Error ? error.message : 'Failed to create member',
        });
      }
    }

    return { created, failed };
  }

  /**
   * Bulk delete members by ID
   */
  async bulkDeleteMembers(
    accountId: string,
    memberIds: string[]
  ): Promise<BulkDeleteMemberResult> {
    if (!accountId) {
      throw new Error('Account ID is required');
    }
    if (!memberIds.length) {
      throw new Error('No members selected for deletion');
    }

    const uniqueIds = [...new Set(memberIds.map((id) => id.trim()).filter(Boolean))];
    const members = await memberRepository.findByIds(uniqueIds, accountId);
    const foundById = new Map(members.map((member) => [member.member_id, member]));

    const failed: BulkDeleteMemberResult['failed'] = uniqueIds
      .filter((id) => !foundById.has(id))
      .map((id) => ({
        member_id: id,
        full_name: '',
        error: 'Member not found',
      }));

    const idsToDelete = members.map((member) => member.member_id);
    if (idsToDelete.length > 0) {
      await memberRepository.deleteMany(idsToDelete, accountId);
    }

    return {
      deleted: idsToDelete,
      failed,
    };
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
    const secret = env.EMAIL_VERIFICATION_SECRET;
    if (!secret) {
      throw new Error('EMAIL_VERIFICATION_SECRET is not configured. Cannot generate verification token.');
    }
    const timestamp = Date.now();
    const tokenData = `${memberId}:${member.email}:${timestamp}`;
    const token = crypto
      .createHash('sha256')
      .update(tokenData + secret)
      .digest('hex');
    
    const verificationToken = Buffer.from(`${memberId}:${timestamp}:${token}`).toString('base64url');

    const frontendUrl = getFrontendUrl(baseUrl);
    const verificationUrl = `${frontendUrl}/verify-member-email?token=${verificationToken}`;

    // Send email via Postmark
    const emailSubject = 'Verify Your Email - Pollean';
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