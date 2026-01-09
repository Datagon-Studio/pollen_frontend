/**
 * Member Routes
 * 
 * Defines routes for the member module.
 */

import { Router } from 'express';
import { memberRoutes } from './member.controller.js';
import { authenticateToken } from '../../shared/middleware/auth.middleware.js';

export const memberRoutesWithAuth = Router();

// All member routes require authentication
memberRoutesWithAuth.use(authenticateToken);
memberRoutesWithAuth.use('/', memberRoutes);


