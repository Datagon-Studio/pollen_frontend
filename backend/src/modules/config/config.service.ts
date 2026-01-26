/**
 * Config Service
 * 
 * Contains all business rules.
 * Calls repository functions only.
 * Throws errors when rules fail.
 */

import { configRepository } from './config.repository.js';
import { Config, UpdateConfigInput } from './config.entity.js';

export class ConfigService {
  /**
   * Get config for an account
   */
  async getConfigByAccountId(accountId: string): Promise<Config | null> {
    if (!accountId) {
      throw new Error('Account ID is required');
    }

    let config = await configRepository.findByAccountId(accountId);
    
    // If config doesn't exist, create default one
    if (!config) {
      config = await configRepository.create({
        account_id: accountId,
      });
    }

    return config;
  }

  /**
   * Update config for an account
   */
  async updateConfig(accountId: string, input: UpdateConfigInput): Promise<Config> {
    if (!accountId) {
      throw new Error('Account ID is required');
    }

    // Business Rule: member_portal_enabled must always be true
    const updateData: UpdateConfigInput = {
      ...input,
      member_portal_enabled: true, // Always true, cannot be disabled
    };

    return configRepository.update(accountId, updateData);
  }
}

export const configService = new ConfigService();
