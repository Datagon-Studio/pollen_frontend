/**
 * Contribution Routes
 * 
 * Defines routes for the contribution module.
 */

import { Router } from 'express';
import { contributionRoutes } from './contribution.controller.js';
import { authenticateToken } from '../../shared/middleware/auth.middleware.js';

export const contributionRoutesWithAuth = Router();

// Public route (no auth required) - must be before auth middleware
// Allow public users to view their own contributions by member_id
contributionRoutesWithAuth.get('/member/:memberId', contributionRoutes);

// All other contribution routes require authentication
contributionRoutesWithAuth.use(authenticateToken);
contributionRoutesWithAuth.use('/', contributionRoutes);
