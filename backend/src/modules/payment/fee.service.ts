import { supabase } from '../../shared/supabase/client.js';

export const DEFAULT_TRANSACTION_FEE_RATE = 0.02;
const GLOBAL_FEE_KEY = 'transaction_fee_rate';

export type FeeSource = 'account' | 'global' | 'default';

export interface ResolvedFeeRate {
  rate: number;
  percent: number;
  source: FeeSource;
  overrideRate: number | null;
}

export interface AccountFeeOverride {
  account_id: string;
  account_name: string | null;
  rate: number;
  percent: number;
}

export interface PlatformFeesSnapshot {
  globalRate: number;
  globalPercent: number;
  overrides: AccountFeeOverride[];
}

function roundRate(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function toPercent(rate: number): number {
  return Math.round(rate * 10000) / 100;
}

function parseRate(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function assertValidRate(rate: number): number {
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new Error('Fee rate must be between 0% and 100%');
  }
  return roundRate(rate);
}

export const feeService = {
  async getGlobalRate(): Promise<number> {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', GLOBAL_FEE_KEY)
      .maybeSingle();

    if (error) {
      // Table may not exist yet — fall back to the historical default.
      console.warn('[fees] Failed to load global fee rate:', error.message);
      return DEFAULT_TRANSACTION_FEE_RATE;
    }

    const rate = parseRate(data?.setting_value);
    if (rate === null) return DEFAULT_TRANSACTION_FEE_RATE;
    return assertValidRate(rate);
  },

  async setGlobalRate(rate: number, updatedBy?: string): Promise<number> {
    const next = assertValidRate(rate);
    const { error } = await supabase.from('platform_settings').upsert(
      {
        setting_key: GLOBAL_FEE_KEY,
        setting_value: next,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy ?? null,
      },
      { onConflict: 'setting_key' }
    );
    if (error) {
      throw new Error(`Failed to save global fee rate: ${error.message}`);
    }
    return next;
  },

  async getAccountOverride(accountId: string): Promise<number | null> {
    const { data, error } = await supabase
      .from('config')
      .select('transaction_fee_rate')
      .eq('account_id', accountId)
      .maybeSingle();

    if (error) {
      console.warn('[fees] Failed to load account fee override:', error.message);
      return null;
    }

    const rate = parseRate(data?.transaction_fee_rate);
    return rate === null ? null : assertValidRate(rate);
  },

  async setAccountOverride(accountId: string, rate: number | null): Promise<number | null> {
    const next = rate === null ? null : assertValidRate(rate);
    const { data: existing, error: existingError } = await supabase
      .from('config')
      .select('config_id')
      .eq('account_id', accountId)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Failed to load account config: ${existingError.message}`);
    }

    if (!existing) {
      const { error } = await supabase.from('config').insert({
        account_id: accountId,
        transaction_fee_rate: next,
      });
      if (error) {
        throw new Error(`Failed to save account fee override: ${error.message}`);
      }
      return next;
    }

    const { error } = await supabase
      .from('config')
      .update({
        transaction_fee_rate: next,
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', accountId);

    if (error) {
      throw new Error(`Failed to save account fee override: ${error.message}`);
    }
    return next;
  },

  async resolveForAccount(accountId: string): Promise<ResolvedFeeRate> {
    const [overrideRate, globalRate] = await Promise.all([
      this.getAccountOverride(accountId),
      this.getGlobalRate(),
    ]);

    if (overrideRate !== null) {
      return {
        rate: overrideRate,
        percent: toPercent(overrideRate),
        source: 'account',
        overrideRate,
      };
    }

    return {
      rate: globalRate,
      percent: toPercent(globalRate),
      source: globalRate === DEFAULT_TRANSACTION_FEE_RATE ? 'default' : 'global',
      overrideRate: null,
    };
  },

  async getSnapshot(): Promise<PlatformFeesSnapshot> {
    const globalRate = await this.getGlobalRate();

    const { data, error } = await supabase
      .from('config')
      .select('account_id, transaction_fee_rate, accounts(account_name)')
      .not('transaction_fee_rate', 'is', null)
      .order('account_id');

    if (error) {
      throw new Error(`Failed to load account fee overrides: ${error.message}`);
    }

    const overrides: AccountFeeOverride[] = [];
    for (const row of data || []) {
      const rate = parseRate(row.transaction_fee_rate);
      if (rate === null) continue;
      const accounts = row.accounts as { account_name: string | null } | { account_name: string | null }[] | null;
      const accountName = Array.isArray(accounts)
        ? accounts[0]?.account_name ?? null
        : accounts?.account_name ?? null;
      overrides.push({
        account_id: row.account_id,
        account_name: accountName,
        rate: assertValidRate(rate),
        percent: toPercent(rate),
      });
    }

    overrides.sort((a, b) =>
      (a.account_name || a.account_id).localeCompare(b.account_name || b.account_id)
    );

    return {
      globalRate,
      globalPercent: toPercent(globalRate),
      overrides,
    };
  },
};
