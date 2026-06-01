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
        use_custom_theme: input.use_custom_theme ?? false,
        custom_primary_color: input.custom_primary_color ?? null,
        custom_secondary_light_color: input.custom_secondary_light_color ?? null,
        custom_background_light_color: input.custom_background_light_color ?? null,
        custom_text_color: input.custom_text_color ?? null,
        custom_secondary_dark_color: input.custom_secondary_dark_color ?? null,
        custom_background_dark_color: input.custom_background_dark_color ?? null,
        custom_text_color_dark: input.custom_text_color_dark ?? null,
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
    if (input.use_custom_theme !== undefined) {
      updateData.use_custom_theme = input.use_custom_theme;
    }
    if (input.custom_primary_color !== undefined) {
      updateData.custom_primary_color = input.custom_primary_color;
    }
    if (input.custom_secondary_light_color !== undefined) {
      updateData.custom_secondary_light_color = input.custom_secondary_light_color;
    }
    if (input.custom_background_light_color !== undefined) {
      updateData.custom_background_light_color = input.custom_background_light_color;
    }
    if (input.custom_secondary_dark_color !== undefined) {
      updateData.custom_secondary_dark_color = input.custom_secondary_dark_color;
    }
    if (input.custom_background_dark_color !== undefined) {
      updateData.custom_background_dark_color = input.custom_background_dark_color;
    }
    if (input.custom_text_color !== undefined) {
      updateData.custom_text_color = input.custom_text_color;
    }
    if (input.custom_text_color_dark !== undefined) {
      updateData.custom_text_color_dark = input.custom_text_color_dark;
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
