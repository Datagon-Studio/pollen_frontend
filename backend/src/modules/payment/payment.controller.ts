import { Router, Request, Response } from 'express';
import { sendSuccess, sendError, sendBadRequest } from '../../shared/utils/api-response.js';
import { paymentService } from './payment.service.js';

export const paymentRoutes = Router();

// Initialize Paystack payment
// POST /api/v1/payments/initialize
paymentRoutes.post('/initialize', async (req: Request, res: Response) => {
  try {
    const { account_id, fund_id, amount, email, name, phone, member_id } = req.body;

    if (!account_id || !fund_id || !amount || !email) {
      return sendBadRequest(res, 'Missing required fields: account_id, fund_id, amount, email');
    }

    if (amount <= 0) {
      return sendBadRequest(res, 'Amount must be greater than 0');
    }

    const result = await paymentService.initializePayment({
      account_id,
      fund_id,
      amount,
      email,
      name: name || 'Anonymous Donor',
      phone: phone || undefined,
      member_id: member_id || undefined,
    });

    if (!result.success) {
      return sendBadRequest(res, result.error || 'Failed to initialize payment');
    }

    sendSuccess(res, result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initialize payment';
    sendBadRequest(res, message);
  }
});

// Verify Paystack payment
// GET /api/v1/payments/verify/:reference
paymentRoutes.get('/verify/:reference', async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return sendBadRequest(res, 'Payment reference is required');
    }

    const result = await paymentService.verifyPayment(reference);

    if (!result.success) {
      return sendBadRequest(res, result.error || 'Failed to verify payment');
    }

    sendSuccess(res, result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify payment';
    sendBadRequest(res, message);
  }
});

// Paystack webhook handler
// POST /api/v1/payments/webhook
paymentRoutes.post('/webhook', async (req: Request, res: Response) => {
  try {
    const hash = req.headers['x-paystack-signature'] as string;
    
    if (!hash) {
      return sendError(res, 'Missing signature', 401);
    }

    const result = await paymentService.handleWebhook(req.body, hash);

    if (!result.success) {
      return sendError(res, result.error || 'Webhook processing failed', 400);
    }

    // Paystack expects a 200 response
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    sendError(res, message, 500);
  }
});

// Link anonymous contributions to member
// POST /api/v1/payments/link-contributions
paymentRoutes.post('/link-contributions', async (req: Request, res: Response) => {
  try {
    const { account_id, member_id } = req.body;

    if (!account_id || !member_id) {
      return sendBadRequest(res, 'Missing required fields: account_id, member_id');
    }

    const result = await paymentService.linkAnonymousContributions(account_id, member_id);

    if (!result.success) {
      return sendBadRequest(res, result.error || 'Failed to link contributions');
    }

    sendSuccess(res, { linked: result.linked || 0 }, `Linked ${result.linked || 0} contributions`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to link contributions';
    sendBadRequest(res, message);
  }
});
