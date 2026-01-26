import { request } from './api-client.js';

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

export interface UpdateAccountPublicPageInput {
  url_slug?: string | null;
  display_name?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  is_published?: boolean;
}

export const accountPublicPageApi = {
  /**
   * Get current user's account public page
   */
  async getMyPublicPage(): Promise<AccountPublicPage> {
    const response = await request<AccountPublicPage>('/account-public-pages/me', {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch public page');
    }

    return response.data;
  },

  /**
   * Update current user's account public page
   */
  async updateMyPublicPage(input: UpdateAccountPublicPageInput): Promise<AccountPublicPage> {
    const response = await request<AccountPublicPage>('/account-public-pages/me', {
      method: 'PUT',
      body: JSON.stringify(input),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update public page');
    }

    return response.data;
  },
};
