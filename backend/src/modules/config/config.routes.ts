/**
 * Config Routes
 * 
 * Defines routes for the config module.
 */

import { Router } from 'express';
import { configController } from './config.controller.js';
import { authenticateToken } from '../../shared/middleware/auth.middleware.js';

export const configRoutes = Router();

// Public route - no auth required
// GET /api/v1/config/public/:accountId - Get public config (expense_visibility_level only)
configRoutes.get('/public/:accountId', async (req, res) => {
  await configController.getPublicConfig(req, res);
});

// All other config routes require authentication
configRoutes.use(authenticateToken);

// GET /api/v1/config/me - Get current user's account config
configRoutes.get('/me', async (req, res) => {
  await configController.getMyConfig(req, res);
});

// PUT /api/v1/config/me - Update current user's account config
configRoutes.put('/me', async (req, res) => {
  await configController.updateMyConfig(req, res);
});

// POST /api/v1/config/test-email - Send test email
configRoutes.post('/test-email', async (req, res) => {
  await configController.sendTestEmail(req, res);
});
