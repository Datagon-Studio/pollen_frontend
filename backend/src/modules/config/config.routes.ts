/**
 * Config Routes
 * 
 * Defines routes for the config module.
 */

import { Router } from 'express';
import { configController } from './config.controller.js';
import { authenticateToken } from '../../shared/middleware/auth.middleware.js';

export const configRoutes = Router();

// All config routes require authentication
configRoutes.use(authenticateToken);

// GET /api/v1/config/me - Get current user's account config
configRoutes.get('/me', async (req, res) => {
  await configController.getMyConfig(req, res);
});

// PUT /api/v1/config/me - Update current user's account config
configRoutes.put('/me', async (req, res) => {
  await configController.updateMyConfig(req, res);
});
