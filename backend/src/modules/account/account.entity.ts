/**
 * Account Entity Types
 * 
 * Defines TypeScript types and enums only.
 * No Supabase, no business logic, no HTTP logic.
 */

export enum KYCStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export interface Account {
  account_id: string;
  account_name: string | null;
  account_logo: string | null;
  foreground_color: string | null;
  background_color: string | null;
  kyc_status: KYCStatus;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountInput {
  account_name?: string | null;
  account_logo?: string | null;
  foreground_color?: string | null;
  background_color?: string | null;
}

export interface UpdateAccountInput {
  account_name?: string | null;
  account_logo?: string | null;
  foreground_color?: string | null;
  background_color?: string | null;
}
