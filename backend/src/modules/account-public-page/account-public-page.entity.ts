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
}

export interface UpdateAccountPublicPageInput {
  url_slug?: string | null;
  display_name?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  is_published?: boolean;
}
