import { Router, Request, Response } from 'express';
import { sendSuccess, sendError, sendBadRequest } from '../../shared/utils/api-response.js';
import { paymentService } from './payment.service.js';
import { paystackBankService } from './paystack-bank.service.js';

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

// Get list of banks (for bank account verification)
// GET /api/v1/payments/banks?country=GH
paymentRoutes.get('/banks', async (req: Request, res: Response) => {
  try {
    console.log('GET /banks endpoint called with country:', req.query.country);
    
    // Normalize country parameter - convert to uppercase and handle variations
    let countryParam = req.query.country as string;
    if (countryParam) {
      countryParam = countryParam.toUpperCase();
      // Handle country name variations
      if (countryParam === 'GHANA' || countryParam.startsWith('GH')) {
        countryParam = 'GH';
      } else if (countryParam === 'NIGERIA' || countryParam.startsWith('NG')) {
        countryParam = 'NG';
      }
    }
    
    const country = (countryParam as 'GH' | 'NG') || 'GH';
    console.log('Normalized country code:', country);
    console.log('Fetching banks for country:', country);
    const banks = await paystackBankService.getBanks(country);
    console.log('Banks fetched successfully:', banks.length);
    sendSuccess(res, banks);
  } catch (error) {
    console.error('Error in /banks endpoint:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch banks';
    sendError(res, message, 500);
  }
});

// Verify bank account number
// GET /api/v1/payments/verify-bank-account?account_number=xxx&bank_code=xxx
paymentRoutes.get('/verify-bank-account', async (req: Request, res: Response) => {
  try {
    const { account_number, bank_code } = req.query;

    if (!account_number || typeof account_number !== 'string') {
      return sendBadRequest(res, 'Account number is required');
    }

    if (!bank_code || typeof bank_code !== 'string') {
      return sendBadRequest(res, 'Bank code is required');
    }

    const result = await paystackBankService.resolveAccount(account_number, bank_code);
    sendSuccess(res, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify bank account';
    sendBadRequest(res, message);
  }
});
