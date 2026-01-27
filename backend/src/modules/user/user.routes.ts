/**
 * User Routes
 * 
 * Defines routes for the user module.
 */

import { Router } from 'express';
import { userController } from './user.controller.js';
import { authenticateToken } from '../../shared/middleware/auth.middleware.js';

export const userRoutes = Router();

// All user routes require authentication
userRoutes.use(authenticateToken);

// GET /api/v1/users/profile
userRoutes.get('/profile', async (req, res) => {
  try {
    await userController.getProfile(req, res);
  } catch (error) {
    console.error('Error in getProfile route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user profile',
    });
  }
});

// PUT /api/v1/users/profile
userRoutes.put('/profile', async (req, res) => {
  try {
    await userController.updateProfile(req, res);
  } catch (error) {
    console.error('Error in updateProfile route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user profile',
    });
  }
});

// GET /api/v1/users/account-role/:accountId
userRoutes.get('/account-role/:accountId', async (req, res) => {
  try {
    await userController.getAccountRole(req, res);
  } catch (error) {
    console.error('Error in getAccountRole route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch account role',
    });
  }
});


