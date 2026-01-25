import axios from 'axios';
import crypto from 'crypto';
import { contributionService } from '../contribution/contribution.service.js';
import { memberRepository } from '../member/member.repository.js';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_26f11dd10895605a6eb9c0cdb0f4648cb852f2f6';
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_cab5814d019ab5a55e6a1260e2bbe85a248e9c10';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface InitializePaymentInput {
  account_id: string;
  fund_id: string;
  amount: number;
  email: string;
  name: string;
  phone?: string;
  member_id?: string;
}

interface PaymentInitializationResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

interface VerifyPaymentResult {
  status: string;
  reference: string;
  amount: number;
  contribution_id: string | null;
}

export const paymentService = {
  /**
   * Initialize Paystack payment
   */
  async initializePayment(input: InitializePaymentInput): Promise<{
    success: boolean;
    data?: PaymentInitializationResult;
    error?: string;
  }> {
    try {
      // Convert amount to kobo (Paystack uses smallest currency unit)
      const amountInKobo = Math.round(input.amount * 100);

      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          email: input.email,
          amount: amountInKobo,
          reference: `PH_${Date.now()}_${input.fund_id.substring(0, 8)}`,
          metadata: {
            account_id: input.account_id,
            fund_id: input.fund_id,
            name: input.name,
            email: input.email, // Store email in metadata for member lookup
            ...(input.phone && { phone: input.phone }), // Only include phone if provided
            ...(input.member_id && { member_id: input.member_id }), // Only include member_id if provided (for verified users)
          },
          callback_url: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/payment/callback`,
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status) {
        return {
          success: true,
          data: {
            authorization_url: response.data.data.authorization_url,
            access_code: response.data.data.access_code,
            reference: response.data.data.reference,
          },
        };
      }

      return {
        success: false,
        error: response.data.message || 'Failed to initialize payment',
      };
    } catch (error) {
      console.error('Paystack initialization error:', error);
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.message || 'Failed to initialize payment',
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize payment',
      };
    }
  },

  /**
   * Verify Paystack payment
   */
  async verifyPayment(reference: string): Promise<{
    success: boolean;
    data?: VerifyPaymentResult;
    error?: string;
  }> {
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      if (response.data.status && response.data.data.status === 'success') {
        const transaction = response.data.data;
        const metadata = transaction.metadata || {};
        const customer = transaction.customer || {};
        
        // Paystack email can be in multiple places - check all possibilities
        const customerEmail = 
          customer.email || 
          transaction.customer_email || 
          transaction.email ||
          metadata.email ||
          (typeof customer === 'object' && customer !== null ? (customer as any).email : null);
        
        const customerPhone = 
          customer.phone || 
          transaction.customer_phone ||
          metadata.phone ||
          (typeof customer === 'object' && customer !== null ? (customer as any).phone : null);
        
        console.log(`[Payment] Transaction data:`, {
          hasCustomer: !!customer,
          customerType: typeof customer,
          customerEmail: customerEmail,
          transactionEmail: transaction.email,
          metadataEmail: metadata.email,
          customerPhone: customerPhone,
          metadataMemberId: metadata.member_id,
          fullMetadata: JSON.stringify(metadata),
        });

        // Try to find member - first check if member_id is in metadata (for verified users)
        let memberId: string | null = null;
        if (metadata.member_id && metadata.member_id !== 'null' && metadata.member_id !== '') {
          memberId = String(metadata.member_id);
          console.log(`[Payment] Found member_id in metadata: ${memberId}`);
        }
        const accountId = metadata.account_id;

        // Check if contribution already exists with this reference (to extract email from comment if needed)
        let existingContribution = null;
        let emailForLookup = customerEmail;
        
        try {
          const allContributions = await contributionService.getContributionsByAccount(metadata.account_id);
          existingContribution = allContributions.find(c => c.payment_reference === reference);
          
          // If we have an existing contribution with email in comment, extract it
          if (!emailForLookup && existingContribution?.comment) {
            const emailMatch = existingContribution.comment.match(/\(([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\)/);
            if (emailMatch) {
              emailForLookup = emailMatch[1];
              console.log(`[Payment] Extracted email from existing contribution comment: ${emailForLookup}`);
            }
          }
        } catch (error) {
          console.error('Error checking for existing contribution:', error);
        }

        // If member_id not already found from metadata, try to find by email or phone
        if (!memberId && accountId) {
          try {
            // First try to find by email (normalize email)
            if (emailForLookup) {
              const normalizedEmail = emailForLookup.trim().toLowerCase();
              console.log(`[Payment] Looking up member by email: "${normalizedEmail}" for account: ${accountId}`);
              const memberByEmail = await memberRepository.findByEmail(normalizedEmail, accountId);
              if (memberByEmail) {
                memberId = memberByEmail.member_id;
                console.log(`[Payment] ✓ Found member by email: ${memberByEmail.full_name} (${memberByEmail.member_id}), email: ${normalizedEmail}`);
              } else {
                console.log(`[Payment] ✗ No member found for email: ${normalizedEmail}`);
                // Log all members' emails for debugging
                const allMembers = await memberRepository.findByAccountId(accountId);
                const memberEmails = allMembers.map(m => m.email).filter(Boolean);
                console.log(`[Payment] Available member emails in account:`, memberEmails);
              }
            } else {
              console.log(`[Payment] No email provided in transaction or metadata`);
            }

            // If not found by email, try by phone (normalize phone number)
            if (!memberId && customerPhone) {
              const normalizePhone = (phoneNum: string): string => {
                let normalized = phoneNum.replace(/[\s\-+()]/g, '');
                // If starts with 233 (country code), replace with 0
                if (normalized.startsWith('233') && normalized.length === 12) {
                  normalized = '0' + normalized.substring(3);
                }
                return normalized;
              };

              const normalizedPhone = normalizePhone(customerPhone);
              console.log(`[Payment] Looking up member by phone: "${normalizedPhone}" for account: ${accountId}`);
              const memberByPhone = await memberRepository.findByPhone(normalizedPhone, accountId);
              if (memberByPhone) {
                memberId = memberByPhone.member_id;
                console.log(`[Payment] ✓ Found member by phone: ${memberByPhone.full_name} (${memberByPhone.member_id})`);
              } else {
                console.log(`[Payment] ✗ No member found for phone: ${normalizedPhone}`);
              }
            }
          } catch (error) {
            console.error('Error looking up member:', error);
            // Continue with anonymous if lookup fails
          }
        } else if (memberId) {
          console.log(`[Payment] ✓ Using member_id from metadata: ${memberId}`);
        }


        // Create or update contribution record
        let contributionId: string | null = null;

        try {
          const contributorName = memberId 
            ? metadata.name || 'Member'
            : metadata.name || 'Anonymous';

          if (existingContribution && memberId) {
            // Update existing contribution to link to member
            console.log(`[Payment] Updating existing contribution ${existingContribution.contribution_id} to link to member ${memberId}`);
            const updated = await contributionService.updateContribution(existingContribution.contribution_id, {
              member_id: memberId,
            });
            contributionId = updated?.contribution_id || existingContribution.contribution_id;
          } else if (existingContribution && !memberId) {
            // Contribution exists but member not found - try to link using email from comment
            console.log(`[Payment] Contribution exists but member not found, attempting to link using comment email`);
            if (emailForLookup) {
              // Try lookup one more time with extracted email
              const normalizedEmail = emailForLookup.trim().toLowerCase();
              const memberByEmail = await memberRepository.findByEmail(normalizedEmail, metadata.account_id);
              if (memberByEmail) {
                console.log(`[Payment] ✓ Found member on retry: ${memberByEmail.full_name} (${memberByEmail.member_id})`);
                const updated = await contributionService.updateContribution(existingContribution.contribution_id, {
                  member_id: memberByEmail.member_id,
                });
                contributionId = updated?.contribution_id || existingContribution.contribution_id;
              } else {
                contributionId = existingContribution.contribution_id;
              }
            } else {
              contributionId = existingContribution.contribution_id;
            }
          } else if (!existingContribution) {
            // Create new contribution
            console.log(`[Payment] Creating new contribution with member_id: ${memberId || 'null (anonymous)'}`);
            const contribution = await contributionService.createContribution({
              account_id: metadata.account_id,
              fund_id: metadata.fund_id,
              member_id: memberId, // Link to member if found, otherwise null (anonymous)
              channel: 'online',
              payment_method: 'Paystack',
              amount: transaction.amount / 100, // Convert from kobo
              date_received: new Date().toISOString(),
              received_by_user_id: null,
              comment: `Payment via Paystack - ${contributorName}${emailForLookup ? ` (${emailForLookup})` : ''}`,
              payment_reference: reference,
              status: 'confirmed', // Paystack verified = confirmed
            });

            contributionId = contribution?.contribution_id || null;
            if (contribution) {
              console.log(`[Payment] ✓ Contribution created: ${contribution.contribution_id}, member_id: ${contribution.member_id || 'null'}`);
            } else {
              console.log(`[Payment] ✗ Failed to create contribution`);
            }
          } else {
            contributionId = existingContribution.contribution_id;
          }
        } catch (error) {
          console.error('Error creating/updating contribution:', error);
          // Continue even if contribution creation fails - payment is still verified
        }

        return {
          success: true,
          data: {
            status: transaction.status,
            reference: reference,
            amount: transaction.amount / 100,
            contribution_id: contributionId,
          },
        };
      }

      return {
        success: false,
        error: response.data.message || 'Payment verification failed',
      };
    } catch (error) {
      console.error('Paystack verification error:', error);
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.message || 'Failed to verify payment',
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify payment',
      };
    }
  },

  /**
   * Handle Paystack webhook
   */
  async handleWebhook(payload: any, signature: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Verify webhook signature
      const hash = crypto
        .createHmac('sha512', PAYSTACK_SECRET_KEY)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (hash !== signature) {
        return {
          success: false,
          error: 'Invalid signature',
        };
      }

      const event = payload.event;
      const data = payload.data;

      if (event === 'charge.success') {
        // Payment was successful
        const metadata = data.metadata || {};
        const customer = data.customer || {};
        
        // Paystack email can be in multiple places - check all possibilities
        const customerEmail = 
          customer.email || 
          data.customer_email || 
          data.email ||
          metadata.email ||
          (typeof customer === 'object' && customer !== null ? (customer as any).email : null);
        
        const customerPhone = 
          customer.phone || 
          data.customer_phone ||
          metadata.phone ||
          (typeof customer === 'object' && customer !== null ? (customer as any).phone : null);
        
        console.log(`[Webhook] Transaction data:`, {
          hasCustomer: !!customer,
          customerEmail: customerEmail,
          dataEmail: data.email,
          metadataEmail: metadata.email,
          customerPhone: customerPhone,
          metadataMemberId: metadata.member_id,
          fullMetadata: JSON.stringify(metadata),
        });
        const reference = data.reference;

        // Try to find member - first check if member_id is in metadata (for verified users)
        // Paystack stores metadata values, check if member_id exists and is not null/empty
        let memberId: string | null = null;
        if (metadata.member_id && metadata.member_id !== 'null' && metadata.member_id !== '') {
          memberId = String(metadata.member_id); // Ensure it's a string
          console.log(`[Webhook] Found member_id in metadata: ${memberId}`);
        }
        const accountId = metadata.account_id;

        // If member_id not in metadata, try to find by email or phone
        if (!memberId && accountId) {
          try {
            // First try to find by email (normalize email)
            if (customerEmail) {
              const normalizedEmail = customerEmail.trim().toLowerCase();
              console.log(`[Webhook] Looking up member by email: "${normalizedEmail}" for account: ${accountId}`);
              const memberByEmail = await memberRepository.findByEmail(normalizedEmail, accountId);
              if (memberByEmail) {
                memberId = memberByEmail.member_id;
                console.log(`[Webhook] ✓ Found member by email: ${memberByEmail.full_name} (${memberByEmail.member_id})`);
              } else {
                console.log(`[Webhook] ✗ No member found for email: ${normalizedEmail}`);
              }
            }

            // If not found by email, try by phone (normalize phone number)
            if (!memberId && customerPhone) {
              const normalizePhone = (phoneNum: string): string => {
                let normalized = phoneNum.replace(/[\s\-+()]/g, '');
                // If starts with 233 (country code), replace with 0
                if (normalized.startsWith('233') && normalized.length === 12) {
                  normalized = '0' + normalized.substring(3);
                }
                return normalized;
              };

              const normalizedPhone = normalizePhone(customerPhone);
              console.log(`[Webhook] Looking up member by phone: "${normalizedPhone}" for account: ${accountId}`);
              const memberByPhone = await memberRepository.findByPhone(normalizedPhone, accountId);
              if (memberByPhone) {
                memberId = memberByPhone.member_id;
                console.log(`[Webhook] ✓ Found member by phone: ${memberByPhone.full_name} (${memberByPhone.member_id})`);
              } else {
                console.log(`[Webhook] ✗ No member found for phone: ${normalizedPhone}`);
              }
            }
          } catch (error) {
            console.error('Error looking up member in webhook:', error);
            // Continue with anonymous if lookup fails
          }
        } else if (memberId) {
          console.log(`[Webhook] ✓ Using member_id from metadata: ${memberId}`);
        } else {
          console.log(`[Webhook] ⚠ No member_id in metadata, will try email/phone lookup`);
        }

        // Check if contribution already exists with this reference
        let existingContribution = null;
        try {
          const allContributions = await contributionService.getContributionsByAccount(metadata.account_id);
          existingContribution = allContributions.find(c => c.payment_reference === reference);
        } catch (error) {
          console.error('Error checking for existing contribution in webhook:', error);
        }

        // Create or update contribution
        try {
          const contributorName = memberId 
            ? metadata.name || 'Member'
            : metadata.name || 'Anonymous';

          if (existingContribution && memberId) {
            // Update existing contribution to link to member
            console.log(`[Webhook] Updating existing contribution ${existingContribution.contribution_id} to link to member ${memberId}`);
            await contributionService.updateContribution(existingContribution.contribution_id, {
              member_id: memberId,
            });
          } else if (!existingContribution) {
            // Create new contribution
            await contributionService.createContribution({
              account_id: metadata.account_id,
              fund_id: metadata.fund_id,
              member_id: memberId, // Link to member if found, otherwise null (anonymous)
              channel: 'online',
              payment_method: 'Paystack',
              amount: data.amount / 100,
              date_received: new Date(data.paid_at || Date.now()).toISOString(),
              received_by_user_id: null,
              comment: `Payment via Paystack - ${contributorName}${customerEmail ? ` (${customerEmail})` : ''}`,
              payment_reference: reference,
              status: 'confirmed',
            });
          }
        } catch (error) {
          console.error('Error creating/updating contribution from webhook:', error);
          // Don't fail webhook - log error but return success
        }
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Webhook processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      };
    }
  },

  /**
   * Link anonymous contributions to a member (retroactive linking)
   */
  async linkAnonymousContributions(accountId: string, memberId: string): Promise<{
    success: boolean;
    linked?: number;
    error?: string;
  }> {
    try {
      // Get member to find their email/phone
      const member = await memberRepository.findById(memberId);
      if (!member || member.account_id !== accountId) {
        return {
          success: false,
          error: 'Member not found or does not belong to account',
        };
      }

      // Get all anonymous contributions for this account
      console.log(`[Link] Starting auto-link for member ${memberId} (${member.full_name}) in account ${accountId}`);
      const allContributions = await contributionService.getContributionsByAccount(accountId);
      console.log(`[Link] Found ${allContributions.length} total contributions`);
      const anonymousContributions = allContributions.filter(c => !c.member_id && c.channel === 'online' && c.payment_method === 'Paystack');
      console.log(`[Link] Found ${anonymousContributions.length} anonymous Paystack contributions`);

      let linked = 0;
      const normalizePhone = (phoneNum: string): string => {
        let normalized = phoneNum.replace(/[\s\-+()]/g, '');
        if (normalized.startsWith('233') && normalized.length === 12) {
          normalized = '0' + normalized.substring(3);
        }
        return normalized;
      };

      const memberEmail = member.email?.trim().toLowerCase();
      const memberPhone = member.phone ? normalizePhone(member.phone) : null;

      console.log(`[Link] Member email: ${memberEmail || 'none'}, phone: ${memberPhone || 'none'}`);

      // Try to match by email or phone from payment comment or payment reference
      for (const contribution of anonymousContributions) {
        const comment = (contribution.comment || '').toLowerCase();
        const paymentRef = contribution.payment_reference || '';
        
        let shouldLink = false;
        let linkReason = '';

        // Check if comment contains member's email
        if (memberEmail && comment.includes(memberEmail)) {
          shouldLink = true;
          linkReason = 'email in comment';
        }

        // Check if comment contains member's phone (normalized)
        if (!shouldLink && memberPhone) {
          const commentNormalized = normalizePhone(comment);
          if (commentNormalized.includes(memberPhone) || memberPhone.includes(commentNormalized)) {
            shouldLink = true;
            linkReason = 'phone in comment';
          }
        }

        // Also try to verify payment reference with Paystack to get customer email
        if (!shouldLink && paymentRef && memberEmail) {
          try {
            const verifyResult = await this.verifyPayment(paymentRef);
            if (verifyResult.success && verifyResult.data) {
              // Check if payment email matches member email
              // Note: We'd need to store email in payment metadata or fetch from Paystack
              // For now, rely on comment matching
            }
          } catch (error) {
            // Ignore verification errors during linking
          }
        }

        if (shouldLink) {
          try {
            await contributionService.updateContribution(contribution.contribution_id, {
              member_id: memberId,
            });
            linked++;
            console.log(`[Link] ✓ Linked contribution ${contribution.contribution_id} (${contribution.amount}) to member ${memberId} by ${linkReason}`);
          } catch (error) {
            console.error(`[Link] ✗ Failed to link contribution ${contribution.contribution_id}:`, error);
          }
        } else {
          console.log(`[Link] ✗ No match for contribution ${contribution.contribution_id}, comment: "${contribution.comment}"`);
        }
      }

      console.log(`[Link] Auto-link complete: ${linked} contributions linked`);

      return {
        success: true,
        linked,
      };
    } catch (error) {
      console.error('Error linking contributions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to link contributions',
      };
    }
  },
};
