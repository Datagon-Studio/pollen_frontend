/**
 * Fund Routes
 * 
 * Defines routes for the fund module.
 */

import { Router } from 'express';
import { fundRoutes } from './fund.controller.js';
import { authenticateToken } from '../../shared/middleware/auth.middleware.js';

export const fundRoutesWithAuth = Router();

// All fund routes require authentication
fundRoutesWithAuth.use(authenticateToken);
fundRoutesWithAuth.use('/', fundRoutes);


