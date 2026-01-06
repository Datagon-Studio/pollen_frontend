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
userRoutes.get('/profile', (req, res) => {
  userController.getProfile(req, res);
});

// PUT /api/v1/users/profile
userRoutes.put('/profile', (req, res) => {
  userController.updateProfile(req, res);
});

