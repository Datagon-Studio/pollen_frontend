/**
 * Platform staff invite and roster for the system admin portal.
 * Role lives on public.users. Page-level access is not stored.
 */

import { supabase } from '../../shared/supabase/client.js';
import { postmarkService } from '../../shared/services/postmark.service.js';
import { auditService } from '../../shared/services/audit.service.js';
import type { StaffRole } from '../../shared/middleware/staff.middleware.js';
import { getAdminFrontendUrl } from '../../shared/utils/frontend-url.js';

const STAFF_ROLES: StaffRole[] = ['superadmin', 'ops', 'support'];

export class StaffInviteError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'StaffInviteError';
    this.statusCode = statusCode;
  }
}

export interface StaffRosterRow {
  user_id: string;
  email: string;
  full_name: string | null;
  role: StaffRole;
  created_at: string;
  last_sign_in_at: string | null;
}

export interface InvitedStaff extends StaffRosterRow {
  delivery: 'password-link' | 'sign-in-link' | 'password-set';
}

export interface InviteStaffInput {
  email: string;
  fullName?: string;
  role: StaffRole;
  signIn: 'email' | 'password';
  password?: string;
  autoConfirm?: boolean;
  actorUserId: string;
}

function isStaffRole(value: string): value is StaffRole {
  return STAFF_ROLES.includes(value as StaffRole);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function roleLabel(role: StaffRole): string {
  if (role === 'superadmin') return 'Super admin';
  if (role === 'ops') return 'Ops';
  return 'Support';
}

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const normalized = email.toLowerCase().trim();
  const { data: profile, error } = await supabase
    .from('users')
    .select('user_id')
    .ilike('email', normalized)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new StaffInviteError(`Could not look up ${normalized}`, 500);
  }
  if (profile?.user_id) return profile.user_id;

  const perPage = 200;
  for (let page = 1; page <= 20; page++) {
    const { data, error: listError } = await supabase.auth.admin.listUsers({ page, perPage });
    if (listError) {
      throw new StaffInviteError('Could not look up that email in auth', 500);
    }
    const match = data.users.find((user) => user.email?.toLowerCase().trim() === normalized);
    if (match?.id) return match.id;
    if (data.users.length < perPage) break;
  }
  return null;
}

async function countSuperAdmins(): Promise<number> {
  const { count, error } = await supabase
    .from('users')
    .select('user_id', { count: 'exact', head: true })
    .eq('role', 'superadmin');
  if (error) {
    throw new StaffInviteError('Could not check super admin count', 500);
  }
  return count ?? 0;
}

function mapRoleConstraint(error: { code?: string; message?: string }): never {
  if (error.code === '23514' || /users_role_check/i.test(error.message || '')) {
    throw new StaffInviteError(
      'The database does not allow ops or support yet. Apply backend/supabase/add_staff_roles.sql, then try again.',
      500
    );
  }
  throw new StaffInviteError(error.message || 'Could not update the staff role', 500);
}

async function setStaffRole(
  userId: string,
  role: StaffRole,
  fullName?: string
): Promise<{ email: string; full_name: string | null; previousRole: string | null }> {
  const { data: existing, error: readError } = await supabase
    .from('users')
    .select('user_id, email, full_name, role')
    .eq('user_id', userId)
    .maybeSingle();

  if (readError && readError.code !== 'PGRST116') {
    throw new StaffInviteError(readError.message, 500);
  }
  if (!existing) {
    throw new StaffInviteError('That person has no profile yet', 404);
  }

  const patch: { role: StaffRole; full_name?: string } = { role };
  if (fullName) patch.full_name = fullName;

  const { error } = await supabase.from('users').update(patch).eq('user_id', userId);
  if (error) mapRoleConstraint(error);

  return {
    email: existing.email,
    full_name: fullName || existing.full_name,
    previousRole: existing.role,
  };
}

async function sendSetPasswordEmail(email: string, fullName: string | null, role: StaffRole): Promise<void> {
  const portal = getAdminFrontendUrl();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${portal}/reset-password` },
  });
  if (error) {
    throw new StaffInviteError(`Login was created, but the password link failed: ${error.message}`, 502);
  }
  const hashedToken = data?.properties?.hashed_token;
  if (!hashedToken) {
    throw new StaffInviteError('Login was created, but the password link was empty', 502);
  }
  const params = new URLSearchParams({ token_hash: hashedToken, type: 'recovery' });
  const resetLink = `${portal}/reset-password?${params.toString()}`;
  const name = fullName?.trim() || email;
  const subject = 'You are invited to the Pollean admin portal';
  const text = [
    `Hello ${name},`,
    '',
    `You have been invited to the Pollean admin portal as ${roleLabel(role)}.`,
    'Set a password, then sign in.',
    '',
    resetLink,
    '',
    'This link expires in 1 hour. If it no longer works, ask a super admin to invite you again.',
  ].join('\n');
  const html = `<p>Hello ${escapeHtml(name)},</p>
<p>You have been invited to the Pollean admin portal as <strong>${escapeHtml(roleLabel(role))}</strong>.</p>
<p><a href="${escapeHtml(resetLink)}">Set your password</a>, then sign in.</p>
<p>This link expires in 1 hour. If it no longer works, ask a super admin to invite you again.</p>`;
  const result = await postmarkService.sendEmail(email, subject, html, text, 'staff-invite');
  if (!result.success) {
    throw new StaffInviteError(
      `Login was created, but the email could not be sent: ${result.error || 'unknown error'}. Invite them again to resend.`,
      502
    );
  }
}

async function sendAccessEmail(email: string, fullName: string | null, role: StaffRole): Promise<void> {
  const portal = getAdminFrontendUrl();
  const signIn = `${portal}/signin`;
  const name = fullName?.trim() || email;
  const subject = 'You now have Pollean admin portal access';
  const text = [
    `Hello ${name},`,
    '',
    `You can now sign in to the Pollean admin portal as ${roleLabel(role)}.`,
    'Use the password you already have.',
    '',
    signIn,
  ].join('\n');
  const html = `<p>Hello ${escapeHtml(name)},</p>
<p>You can now sign in to the Pollean admin portal as <strong>${escapeHtml(roleLabel(role))}</strong>. Use the password you already have.</p>
<p><a href="${escapeHtml(signIn)}">Open the admin portal</a></p>`;
  const result = await postmarkService.sendEmail(email, subject, html, text, 'staff-invite');
  if (!result.success) {
    throw new StaffInviteError(
      `Their role was updated, but the email could not be sent: ${result.error || 'unknown error'}.`,
      502
    );
  }
}

export const staffService = {
  async list(): Promise<StaffRosterRow[]> {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, email, full_name, role, created_at')
      .in('role', STAFF_ROLES)
      .order('created_at', { ascending: false });

    if (error) {
      throw new StaffInviteError(error.message, 500);
    }

    const rows = data ?? [];
    const signIns = await Promise.all(
      rows.map(async (row) => {
        const { data: authUser } = await supabase.auth.admin.getUserById(row.user_id);
        return authUser.user?.last_sign_in_at ?? null;
      })
    );

    return rows
      .filter((row) => isStaffRole(row.role))
      .map((row, index) => ({
        user_id: row.user_id,
        email: row.email,
        full_name: row.full_name,
        role: row.role as StaffRole,
        created_at: row.created_at,
        last_sign_in_at: signIns[index],
      }));
  },

  async invite(input: InviteStaffInput): Promise<InvitedStaff> {
    const email = input.email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new StaffInviteError('Enter a valid email address', 400);
    }
    if (!isStaffRole(input.role)) {
      throw new StaffInviteError('Choose ops, support, or super admin', 400);
    }
    if (input.signIn === 'password') {
      if (!input.password || input.password.length < 8) {
        throw new StaffInviteError('Use a password of at least 8 characters', 400);
      }
    }

    const fullName = input.fullName?.trim() || undefined;
    let userId = await findAuthUserIdByEmail(email);
    let created = false;

    if (userId) {
      const { data: existingProfile } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      if (existingProfile && isStaffRole(existingProfile.role)) {
        throw new StaffInviteError(
          existingProfile.role === input.role
            ? `That email already has portal access as ${roleLabel(input.role)}.`
            : `That email already has portal access as ${roleLabel(existingProfile.role)}. Change their role on the roster instead.`,
          409
        );
      }
    }

    if (!userId) {
      const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: input.signIn === 'password' ? input.password : undefined,
        email_confirm: input.signIn === 'password' ? input.autoConfirm !== false : true,
        user_metadata: {
          full_name: fullName ?? '',
          skip_account_creation: 'true',
        },
      });
      if (createError || !createdUser.user) {
        throw new StaffInviteError(
          createError?.message || 'Could not create the login',
          400
        );
      }
      userId = createdUser.user.id;
      created = true;
    } else if (input.signIn === 'password') {
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: input.password,
        email_confirm: input.autoConfirm !== false,
      });
      if (updateError) {
        throw new StaffInviteError(updateError.message, 400);
      }
    }

    const { data: profile } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!profile) {
      const { error: insertError } = await supabase.from('users').insert({
        user_id: userId,
        email,
        role: input.role,
        full_name: fullName ?? null,
      });
      if (insertError && insertError.code !== '23505') {
        mapRoleConstraint(insertError);
      }
    }

    const saved = await setStaffRole(userId, input.role, fullName);

    const delivery = input.signIn === 'password'
      ? 'password-set'
      : created
        ? 'password-link'
        : 'sign-in-link';

    if (delivery === 'password-link') {
      await sendSetPasswordEmail(email, saved.full_name, input.role);
    } else if (delivery === 'sign-in-link') {
      await sendAccessEmail(email, saved.full_name, input.role);
    }

    await auditService.log({
      actionType: 'staff_invited',
      actionCategory: 'SYSTEM',
      userId: input.actorUserId,
      entityType: 'user',
      entityId: userId,
      actionDetails: {
        email,
        role: input.role,
        signIn: input.signIn,
        created,
      },
    });

    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    return {
      user_id: userId,
      email,
      full_name: saved.full_name,
      role: input.role,
      created_at: new Date().toISOString(),
      last_sign_in_at: authUser.user?.last_sign_in_at ?? null,
      delivery,
    };
  },

  async changeRole(actorUserId: string, userId: string, role: StaffRole): Promise<void> {
    if (!isStaffRole(role)) {
      throw new StaffInviteError('Choose ops, support, or super admin', 400);
    }
    const { data: existing, error } = await supabase
      .from('users')
      .select('user_id, role, email')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new StaffInviteError(error.message, 500);
    if (!existing || !isStaffRole(existing.role)) {
      throw new StaffInviteError('That person is not on the staff roster', 404);
    }
    if (existing.role === 'superadmin' && role !== 'superadmin') {
      const remaining = await countSuperAdmins();
      if (remaining <= 1) {
        throw new StaffInviteError(
          'The portal needs at least one super admin. Promote someone else first.',
          409
        );
      }
    }
    await setStaffRole(userId, role);
    await auditService.log({
      actionType: 'staff_role_changed',
      actionCategory: 'SYSTEM',
      userId: actorUserId,
      entityType: 'user',
      entityId: userId,
      actionDetails: { email: existing.email, from: existing.role, to: role },
    });
  },

  async revoke(actorUserId: string, userId: string): Promise<void> {
    const { data: existing, error } = await supabase
      .from('users')
      .select('user_id, role, email')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new StaffInviteError(error.message, 500);
    if (!existing || !isStaffRole(existing.role)) {
      throw new StaffInviteError('That person is not on the staff roster', 404);
    }
    if (existing.role === 'superadmin') {
      const remaining = await countSuperAdmins();
      if (remaining <= 1) {
        throw new StaffInviteError(
          'Promote another super admin before revoking this one.',
          409
        );
      }
    }
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'user' })
      .eq('user_id', userId);
    if (updateError) {
      throw new StaffInviteError(updateError.message, 500);
    }
    await auditService.log({
      actionType: 'staff_revoked',
      actionCategory: 'SYSTEM',
      userId: actorUserId,
      entityType: 'user',
      entityId: userId,
      actionDetails: { email: existing.email, from: existing.role },
    });
  },
};
