import { apiClient } from './api-client';

export interface Member {
  id: string;
  account_id: string;
  full_name: string;
  dob: string | null;
  phone: string;
  phone_verified: boolean;
  email: string | null;
  email_verified: boolean;
  membership_number: string | null;
  total_contributed: number;
  created_at: string;
  updated_at: string;
}

export type CreateMemberInput = Omit<Member, 'id' | 'created_at' | 'updated_at' | 'total_contributed'>;
export type UpdateMemberInput = Partial<Omit<CreateMemberInput, 'account_id'>>;

export interface MemberStats {
  total: number;
  active: number;
  inactive: number;
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

  async update(id: string, data: UpdateMemberInput) {
    return apiClient.put<Member>(`/members/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete(`/members/${id}`);
  },

  async verifyPhone(id: string) {
    return apiClient.post<Member>(`/members/${id}/verify-phone`);
  },

  async verifyEmail(id: string) {
    return apiClient.post<Member>(`/members/${id}/verify-email`);
  },
};

export function isMemberActive(member: Member): boolean {
  return member.phone_verified || member.email_verified;
}

