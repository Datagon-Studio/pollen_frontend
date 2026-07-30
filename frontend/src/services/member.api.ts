import { apiClient } from './api-client';

export interface Member {
  member_id: string;
  account_id: string;
  full_name: string;
  dob: string | null;
  phone: string;
  phone_verified: boolean;
  email: string | null;
  email_verified: boolean;
  membership_number: string | null;
  total_contributed: number | null;
  created_at: string;
  updated_at: string;
}

export type CreateMemberInput = Omit<Member, 'member_id' | 'created_at' | 'updated_at' | 'total_contributed'> & {
  isCollector?: boolean;
};
export type UpdateMemberInput = Partial<Omit<CreateMemberInput, 'account_id'>>;

export interface MemberStats {
  total: number;
  active: number;
  inactive: number;
}

export interface BulkCreateMemberRow {
  full_name: string;
  phone: string;
  membership_number?: string | null;
}

export interface BulkCreateMemberResult {
  created: Member[];
  failed: Array<{ row: number; full_name: string; phone: string; error: string }>;
}

export interface BulkDeleteMemberResult {
  deleted: string[];
  failed: Array<{ member_id: string; full_name: string; error: string }>;
}

export const memberApi = {
  async getByAccount(accountId: string) {
    return apiClient.get<Member[]>(`/members?accountId=${accountId}`);
  },

  async getById(id: string) {
    return apiClient.get<Member>(`/members/${id}`);
  },

  async getStats(accountId: string) {
    return apiClient.get<MemberStats>(`/members/stats/${accountId}`);
  },

  async create(data: CreateMemberInput) {
    return apiClient.post<Member>('/members', data);
  },

  async bulkCreate(members: BulkCreateMemberRow[]) {
    return apiClient.post<BulkCreateMemberResult>('/members/bulk', { members });
  },

  async bulkDelete(memberIds: string[]) {
    return apiClient.post<BulkDeleteMemberResult>('/members/bulk-delete', {
      member_ids: memberIds,
    });
  },

  async update(id: string, data: UpdateMemberInput) {
    return apiClient.put<Member>(`/members/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete(`/members/${id}`);
  },

  async verifyPhone(id: string) {
    return apiClient.post<Member>(`/members/${id}/verify-phone`);
  },

  /**
   * Send OTP to member's phone
   */
  async sendPhoneOTP(id: string) {
    return apiClient.post(`/members/${id}/send-phone-otp`);
  },

  /**
   * Verify OTP code for member's phone
   */
  async verifyPhoneOTP(id: string, code: string) {
    return apiClient.post<Member>(`/members/${id}/verify-phone-otp`, { code });
  },

  /**
   * Send OTP to phone (public endpoint - for viewing contributions)
   */
  async sendOTP(phone: string, accountId: string) {
    return apiClient.post('/members/otp/send', { phone, accountId });
  },

  /**
   * Verify OTP code (public endpoint - for viewing contributions / first-time phone verify)
   */
  async verifyOTP(phone: string, code: string, accountId: string) {
    return apiClient.post<{ member_id: string; full_name: string; phone_verified?: boolean }>('/members/otp/verify', {
      phone,
      code,
      accountId,
    });
  },

  /**
   * Send OTP for phone verification during member creation (admin only)
   */
  async sendPhoneVerificationOTP(phone: string, accountId: string) {
    return apiClient.post('/members/verify-phone/send', { phone, accountId });
  },

  /**
   * Verify OTP for phone verification during member creation (admin only)
   */
  async verifyPhoneVerificationOTP(phone: string, code: string, accountId: string) {
    return apiClient.post('/members/verify-phone/verify', { phone, code, accountId });
  },

  /**
   * Send OTP for new member registration (public - for join page)
   */
  async sendRegistrationOTP(phone: string, accountId: string) {
    return apiClient.post('/members/register-otp/send', { phone, accountId });
  },

  /**
   * Verify OTP for new member registration (public - for join page)
   */
  async verifyRegistrationOTP(phone: string, code: string, accountId: string) {
    return apiClient.post('/members/register-otp/verify', { phone, code, accountId });
  },

  /**
   * Send email OTP for new member registration (public - for join page)
   */
  async sendRegistrationEmailOTP(email: string, accountId: string) {
    return apiClient.post('/members/register-email-otp/send', { email, accountId });
  },

  /**
   * Verify email OTP for new member registration (public - for join page)
   */
  async verifyRegistrationEmailOTP(email: string, code: string, accountId: string) {
    return apiClient.post('/members/register-email-otp/verify', { email, code, accountId });
  },

  /**
   * Send email OTP for new member registration (public - for join page)
   */
  async sendEmailRegistrationOTP(email: string, accountId: string) {
    return apiClient.post('/members/register-email-otp/send', { email, accountId });
  },

  /**
   * Verify email OTP for new member registration (public - for join page)
   */
  async verifyEmailRegistrationOTP(email: string, code: string, accountId: string) {
    return apiClient.post('/members/register-email-otp/verify', { email, code, accountId });
  },

  /**
   * Register new member (public - for join page)
   */
  async register(data: {
    accountId: string;
    full_name: string;
    phone: string;
    dob?: string | null;
    email?: string | null;
    membership_number?: string | null;
  }) {
    return apiClient.post<Member>('/members/register', data);
  },

  async verifyEmail(id: string) {
    return apiClient.post<Member>(`/members/${id}/verify-email`);
  },

  /**
   * Send verification email to member
   */
  async sendVerificationEmail(id: string, baseUrl?: string) {
    return apiClient.post(`/members/${id}/send-verification-email`, { baseUrl });
  },

  /**
   * Verify email via token (public)
   */
  async verifyEmailToken(token: string) {
    return apiClient.post<Member>('/members/verify-email-token', { token });
  },
};

export function isMemberActive(member: Member): boolean {
  return member.phone_verified || member.email_verified;
}

