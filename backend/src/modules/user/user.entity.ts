/**
 * User Entity Types
 * 
 * Defines TypeScript types only.
 * No Supabase, no business logic, no HTTP logic.
 */

export interface UserProfile {
  user_id: string;
  email: string;
  role: 'superadmin' | 'admin' | 'user';
  full_name: string | null;
  phone_number: string | null;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountRole {
  account_id: string;
  role: 'admin' | 'officer' | 'viewer';
}

export interface UpdateUserProfileInput {
  full_name?: string;
  phone_number?: string | null;
  profile_image_url?: string | null;
}



