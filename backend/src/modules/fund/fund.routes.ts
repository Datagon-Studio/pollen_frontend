/**
 * Fund Routes
 * 
 * Defines routes for the fund module.
 */

import { Router, Request, Response } from 'express';
import { fundRoutes } from './fund.controller.js';
import { authenticateToken } from '../../shared/middleware/auth.middleware.js';
import { fundService } from './fund.service.js';

export const fundRoutesWithAuth = Router();

// Public routes (no auth required) - must be before auth middleware
// GET /api/v1/funds/public/:accountId - Get public active funds for an account
fundRoutesWithAuth.get('/public/:accountId', async (req: Request, res: Response) => {
  try {
    const accountId = req.params.accountId;
    const funds = await fundService.getPublicActiveFundsByAccount(accountId);
    res.status(200).json({
      success: true,
      data: funds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch public funds';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// GET /api/v1/funds/:id - Get a specific fund by ID (public access)
// IMPORTANT: This route must come before the auth middleware to allow public access
// Note: This will match any path, but we check for reserved paths first
fundRoutesWithAuth.get('/:id', async (req: Request, res: Response) => {
  const fundId = req.params.id;
  
  // Skip if this matches a reserved route path - these are handled by other routes
  if (fundId === 'public' || fundId === 'active' || fundId === 'stats') {
    // This shouldn't happen if routes are ordered correctly, but just in case
    return res.status(404).json({
      success: false,
      error: 'Route not found',
    });
  }
  
  try {
    console.log('[Public Fund Route] Fetching fund:', fundId);
    const fund = await fundService.getFund(fundId);
    if (!fund) {
      console.log('[Public Fund Route] Fund not found in database:', fundId);
      return res.status(404).json({
        success: false,
        error: 'Fund not found',
      });
    }
    
    console.log('[Public Fund Route] Fund found:', fund.fund_id);
    res.status(200).json({
      success: true,
      data: fund,
    });
  } catch (error) {
    console.error('[Public Fund Route] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch fund';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// All other fund routes require authentication
fundRoutesWithAuth.use(authenticateToken);
fundRoutesWithAuth.use('/', fundRoutes);


