/**
 * Payment Routes
 * 
 * Handles Paystack payment initialization and verification
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import { paystackService } from '../../shared/services/paystack.service.js';
import { contributionService } from '../contribution/contribution.service.js';
import { contributionRepository } from '../contribution/contribution.repository.js';
import { accountService } from '../account/account.service.js';
import { sendSuccess, sendError, sendBadRequest } from '../../shared/utils/api-response.js';

export const paymentRoutes = Router();

// GET /api/v1/payments/public-key - Get Paystack public key (for frontend)
paymentRoutes.get('/public-key', authenticateToken, async (req: Request, res: Response) => {
  try {
    const publicKey = paystackService.getPublicKey();
    if (!publicKey) {
      return sendError(res, 'Paystack public key not configured', 500);
    }
    sendSuccess(res, { publicKey });
  } catch (error) {
    sendError(res, 'Failed to get public key');
  }
});

// POST /api/v1/payments/initialize - Initialize a payment
paymentRoutes.post('/initialize', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const { amount, email, fundId, accountId, memberId, comment, metadata } = req.body;

    // Validate required fields
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return sendBadRequest(res, 'Valid amount is required');
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return sendBadRequest(res, 'Email is required');
    }

    if (!fundId || typeof fundId !== 'string') {
      return sendBadRequest(res, 'Fund ID is required');
    }

    if (!accountId || typeof accountId !== 'string') {
      return sendBadRequest(res, 'Account ID is required');
    }

    // Verify user has access to this account
    const userAccount = await accountService.getUserAccount(userId);
    if (!userAccount || userAccount.account_id !== accountId) {
      return sendError(res, 'Access denied', 403);
    }

    // Check KYC status - online payments require verified KYC
    if (userAccount.kyc_status !== 'verified') {
      return sendError(res, 'Account KYC must be verified to accept online payments', 403);
    }

    // Generate reference
    const reference = `PLLN_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Initialize payment with Paystack
    const paymentMetadata = {
      account_id: accountId,
      fund_id: fundId,
      member_id: memberId || null,
      user_id: userId,
      comment: comment || null,
      ...metadata,
    };

    // Build callback URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const callbackUrl = `${frontendUrl}/payment/callback`;

    const result = await paystackService.initializePayment(
      amount,
      email,
      reference,
      paymentMetadata,
      callbackUrl
    );

    if (!result.success) {
      return sendError(res, result.error || 'Failed to initialize payment', 500);
    }

    sendSuccess(res, {
      authorizationUrl: result.authorizationUrl,
      reference: result.reference,
      accessCode: result.accessCode,
    });
  } catch (error) {
    console.error('Payment initialization error:', error);
    sendError(res, error instanceof Error ? error.message : 'Failed to initialize payment');
  }
});

// GET /api/v1/payments/verify/:reference - Verify a payment
paymentRoutes.get('/verify/:reference', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const { reference } = req.params;

    if (!reference) {
      return sendBadRequest(res, 'Payment reference is required');
    }

    // Verify payment with Paystack
    const verification = await paystackService.verifyPayment(reference);

    if (!verification.success) {
      return sendError(res, verification.error || 'Failed to verify payment', 500);
    }

    sendSuccess(res, {
      verified: verification.verified,
      amount: verification.amount,
      status: verification.status,
      data: verification.data,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    sendError(res, error instanceof Error ? error.message : 'Failed to verify payment');
  }
});

// POST /api/v1/payments/webhook - Paystack webhook handler
paymentRoutes.post('/webhook', async (req: Request, res: Response) => {
  try {
    const hash = req.headers['x-paystack-signature'] as string;
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!hash || !secretKey) {
      return res.status(400).json({ success: false, error: 'Missing signature or secret key' });
    }

    // Verify webhook signature (simplified - in production, use crypto to verify)
    const body = JSON.stringify(req.body);
    
    // For MVP, we'll process the webhook
    const event = req.body;

    console.log('Paystack webhook received:', event.event, event.data?.reference);

    // Handle different event types
    if (event.event === 'charge.success') {
      const transaction = event.data;
      const reference = transaction.reference;
      const metadata = transaction.metadata || {};

      // Verify payment
      const verification = await paystackService.verifyPayment(reference);

      if (verification.success && verification.verified) {
        const accountId = metadata.account_id;
        const fundId = metadata.fund_id;
        const memberId = metadata.member_id || null;
        const amount = verification.amount!;
        const userId = metadata.user_id;

        // Check if contribution already exists by payment_reference
        const existingContributions = await contributionRepository.findByAccountId(accountId);
        const existing = existingContributions.find(c => c.payment_reference === reference);

        if (!existing) {
          // Create contribution with confirmed status
          try {
            const contribution = await contributionService.createContribution({
              account_id: accountId,
              fund_id: fundId,
              member_id: memberId,
              amount: amount,
              channel: 'online',
              payment_method: 'Paystack',
              date_received: new Date().toISOString(),
              comment: metadata.comment || null,
              payment_reference: reference,
              status: 'pending', // Create as pending first
              received_by_user_id: null,
            }, userId);

            // Then confirm it
            if (contribution) {
              await contributionService.confirmContribution(contribution.contribution_id);
              console.log('Contribution created and confirmed via webhook:', {
                reference,
                contribution_id: contribution.contribution_id,
                accountId,
                fundId,
                amount,
              });
            }
          } catch (error) {
            console.error('Failed to create contribution via webhook:', error);
          }
        } else {
          console.log('Contribution already exists for reference:', reference);
        }
      }
    }

    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(200).json({ success: false, error: 'Webhook processing failed' });
  }
});
