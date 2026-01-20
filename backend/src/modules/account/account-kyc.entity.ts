/**
 * Account KYC Entity Types
 */

export type AccountType = 'individual' | 'business';

export interface AccountKYC {
  kyc_id: string;
  account_id: string;
  account_type: AccountType;
  official_name: string;
  business_registration_url: string | null;
  passport_photo_url: string | null;
  national_id_url: string;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountKYCInput {
  account_id: string;
  account_type: AccountType;
  official_name: string;
  business_registration_url?: string | null;
  passport_photo_url?: string | null;
  national_id_url: string;
}

export interface UpdateAccountKYCInput {
  account_type?: AccountType;
  official_name?: string;
  business_registration_url?: string | null;
  passport_photo_url?: string | null;
  national_id_url?: string;
}
