/**
 * Account Routes
 * 
 * Defines routes for the account module.
 */

import { Router } from 'express';
import { accountController } from './account.controller.js';
import { authenticateToken } from '../../shared/middleware/auth.middleware.js';

export const accountRoutes = Router();

// Public route (no auth required)
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
