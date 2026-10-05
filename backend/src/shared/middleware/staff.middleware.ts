/**
 * Platform staff role checks for System Admin Portal APIs.
 * Staff roles: superadmin, ops, support (ops/support reserved for future DB migration).
 */

import { userService } from '../../modules/user/user.service.js';
import type { UserProfile } from '../../modules/user/user.entity.js';

export type StaffRole = 'superadmin' | 'ops' | 'support';

const STAFF_ROLES: StaffRole[] = ['superadmin', 'ops', 'support'];

export function isStaffRole(role: string | undefined | null): role is StaffRole {
  return !!role && STAFF_ROLES.includes(role as StaffRole);
}

export function canMutateCompliance(role: StaffRole): boolean {
  return role === 'superadmin' || role === 'ops';
}

export function canManagePlatform(role: StaffRole): boolean {
  return role === 'superadmin';
}

export async function assertAuthenticatedUser(userId: string | undefined): Promise<string> {
  if (!userId) {
    throw new StaffAccessError('Unauthorized', 401);
  }
  return userId;
}

export async function assertStaffUser(userId: string | undefined): Promise<UserProfile & { role: StaffRole }> {
  const id = await assertAuthenticatedUser(userId);
  const profile = await userService.getUserProfile(id);
  if (!profile || !isStaffRole(profile.role)) {
    throw new StaffAccessError(
      'Forbidden: Staff portal access required (superadmin, ops, or support)',
      403
    );
  }
  return profile as UserProfile & { role: StaffRole };
}

export async function assertComplianceStaff(userId: string | undefined): Promise<UserProfile & { role: StaffRole }> {
  const profile = await assertStaffUser(userId);
  if (!canMutateCompliance(profile.role)) {
    throw new StaffAccessError('Forbidden: Compliance staff access required (superadmin or ops)', 403);
  }
  return profile;
}

export async function assertPlatformAdmin(userId: string | undefined): Promise<UserProfile & { role: StaffRole }> {
  const profile = await assertStaffUser(userId);
  if (!canManagePlatform(profile.role)) {
    throw new StaffAccessError('Forbidden: Super admin access required', 403);
  }
  return profile;
}

export class StaffAccessError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function handleStaffError(error: unknown, res: import('express').Response): void {
  if (error instanceof StaffAccessError) {
    res.status(error.statusCode).json({ success: false, error: error.message });
    return;
  }
  const message = error instanceof Error ? error.message : 'Internal server error';
  res.status(500).json({ success: false, error: message });
}
