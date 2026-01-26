/**
 * Account Public Page Repository
 * 
 * Handles all Supabase queries.
 * No validation, no HTTP responses, no business logic.
 */

import { supabase } from '../../shared/supabase/client.js';
import { AccountPublicPage, CreateAccountPublicPageInput, UpdateAccountPublicPageInput } from './account-public-page.entity.js';

export const accountPublicPageRepository = {
  /**
   * Find public page by account_id
   */
  async findByAccountId(accountId: string): Promise<AccountPublicPage | null> {
    const { data, error } = await supabase
      .from('account_public_pages')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch account public page: ${error.message}`);
    }

    return data;
  },

  /**
   * Create a new public page
   */
  async create(input: CreateAccountPublicPageInput): Promise<AccountPublicPage> {
    const { data, error } = await supabase
      .from('account_public_pages')
      .insert({
        account_id: input.account_id,
        url_slug: input.url_slug ?? null,
        display_name: input.display_name ?? null,
        logo_url: input.logo_url ?? null,
        primary_color: input.primary_color ?? null,
        secondary_color: input.secondary_color ?? null,
        is_published: input.is_published ?? false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create account public page: ${error.message}`);
    }

    return data;
  },

  /**
   * Update public page
   */
  async update(accountId: string, input: UpdateAccountPublicPageInput): Promise<AccountPublicPage> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.url_slug !== undefined) {
      updateData.url_slug = input.url_slug;
    }
    if (input.display_name !== undefined) {
      updateData.display_name = input.display_name;
    }
    if (input.logo_url !== undefined) {
      updateData.logo_url = input.logo_url;
    }
    if (input.primary_color !== undefined) {
      updateData.primary_color = input.primary_color;
    }
    if (input.secondary_color !== undefined) {
      updateData.secondary_color = input.secondary_color;
    }
    if (input.is_published !== undefined) {
      updateData.is_published = input.is_published;
    }

    const { data, error } = await supabase
      .from('account_public_pages')
      .update(updateData)
      .eq('account_id', accountId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update account public page: ${error.message}`);
    }

    return data;
  },
};
