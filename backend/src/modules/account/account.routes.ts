/**
 * Account Routes
 * 
 * Defines routes for the account module.
 */

import { Router } from 'express';
import { accountController } from './account.controller.js';
import { authenticateToken } from '../../shared/middleware/auth.middleware.js';

export const accountRoutes = Router();

// Public routes (no auth required)

// GET /api/v1/accounts/list-ids - List all account IDs (for testing)
accountRoutes.get('/list-ids', async (req, res) => {
  try {
    const { supabase } = await import('../../shared/supabase/client.js');
    const { data, error } = await supabase
      .from('accounts')
      .select('account_id, account_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: `Failed to fetch accounts: ${error.message}`,
      });
    }
    
    res.status(200).json({
      success: true,
      data: data || [],
      message: 'Use one of these account_id values in your OTP request',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch accounts';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// GET /api/v1/accounts/public/:accountId - Get public account info
accountRoutes.get('/public/:accountId', async (req, res) => {
  await accountController.getPublicAccount(req, res);
});

// All other account routes require authentication
accountRoutes.use(authenticateToken);

// GET /api/v1/accounts/me - Get current user's account
accountRoutes.get('/me', async (req, res) => {
  await accountController.getMyAccount(req, res);
});

// PUT /api/v1/accounts/me - Update current user's account
accountRoutes.put('/me', async (req, res) => {
  await accountController.updateMyAccount(req, res);
});
