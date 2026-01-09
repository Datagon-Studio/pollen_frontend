/**
 * Member Entity Types
 * 
 * Defines TypeScript types only.
 * No Supabase, no business logic, no HTTP logic.
 */

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
  created_at: string;
  updated_at: string;
}

export interface CreateMemberInput {
  account_id: string;
  full_name: string;
  dob?: string | null;
  phone: string;
  phone_verified?: boolean;
  email?: string | null;
  email_verified?: boolean;
  membership_number?: string | null;
}

export interface UpdateMemberInput {
  full_name?: string;
  dob?: string | null;
  phone?: string;
  phone_verified?: boolean;
  email?: string | null;
  email_verified?: boolean;
  membership_number?: string | null;
}


