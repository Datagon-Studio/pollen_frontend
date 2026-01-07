/**
 * User Controller
 * 
 * Handles Express req and res.
 * Calls service methods.
 * Converts thrown errors into HTTP responses.
 * No Supabase usage here.
 */

import { Request, Response } from 'express';
import { userService } from './user.service.js';
import { UpdateUserProfileInput } from './user.entity.js';

export class UserController {
  /**
   * GET /api/v1/users/profile
   * Get current user's profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      // Get user_id from authenticated request (set by auth middleware)
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const profile = await userService.getUserProfile(userId);

      if (!profile) {
        res.status(404).json({
          success: false,
          error: 'User profile not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch user profile';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * PUT /api/v1/users/profile
   * Update current user's profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      // Get user_id from authenticated request (set by auth middleware)
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const input: UpdateUserProfileInput = {
        full_name: req.body.full_name,
      };

      const profile = await userService.updateUserProfile(userId, input);

      res.status(200).json({
        success: true,
        data: profile,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user profile';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }
}

export const userController = new UserController();


