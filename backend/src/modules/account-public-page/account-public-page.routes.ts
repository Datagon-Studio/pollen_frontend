/**
 * Account Public Page Routes
 * 
 * Defines routes for the account-public-page module.
 */

import { Router } from 'express';
import { accountPublicPageController } from './account-public-page.controller.js';
import { authenticateToken } from '../../shared/middleware/auth.middleware.js';

export const accountPublicPageRoutes = Router();

// Public route - no auth required
// GET /api/v1/account-public-pages/public/:accountId - Get public page (no auth)
accountPublicPageRoutes.get('/public/:accountId', async (req, res) => {
  await accountPublicPageController.getPublicPage(req, res);
});

// All other account public page routes require authentication
accountPublicPageRoutes.use(authenticateToken);

// GET /api/v1/account-public-pages/me - Get current user's account public page
accountPublicPageRoutes.get('/me', async (req, res) => {
  await accountPublicPageController.getMyPublicPage(req, res);
});

// PUT /api/v1/account-public-pages/me - Update current user's account public page
accountPublicPageRoutes.put('/me', async (req, res) => {
  await accountPublicPageController.updateMyPublicPage(req, res);
});
