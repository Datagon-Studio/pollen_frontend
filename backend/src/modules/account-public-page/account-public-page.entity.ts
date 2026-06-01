/**
 * Account Public Page Entity Types
 * 
 * Defines TypeScript types only.
 * No Supabase, no business logic, no HTTP logic.
 */

export interface AccountPublicPage {
  public_page_id: string;
  account_id: string;
  url_slug: string | null;
  display_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  is_published: boolean;
  use_custom_theme: boolean;
  custom_primary_color: string | null;
  custom_secondary_light_color: string | null;
  custom_background_light_color: string | null;
  custom_secondary_dark_color: string | null;
  custom_background_dark_color: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountPublicPageInput {
  account_id: string;
  url_slug?: string | null;
  display_name?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  is_published?: boolean;
  use_custom_theme?: boolean;
  custom_primary_color?: string | null;
  custom_secondary_light_color?: string | null;
  custom_background_light_color?: string | null;
  custom_secondary_dark_color?: string | null;
  custom_background_dark_color?: string | null;
}

export interface UpdateAccountPublicPageInput {
  url_slug?: string | null;
  display_name?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  is_published?: boolean;
  use_custom_theme?: boolean;
  custom_primary_color?: string | null;
  custom_secondary_light_color?: string | null;
  custom_background_light_color?: string | null;
  custom_secondary_dark_color?: string | null;
  custom_background_dark_color?: string | null;
}
