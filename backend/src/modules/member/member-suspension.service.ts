import { supabase } from '../../shared/supabase/client.js';
import { memberRepository } from './member.repository.js';

const SUSPENDED_MEMBERS_KEY = 'suspended_member_ids';

async function readIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('setting_value')
    .eq('setting_key', SUSPENDED_MEMBERS_KEY)
    .maybeSingle();

  if (error || !Array.isArray(data?.setting_value)) return [];
  return data.setting_value.filter((id): id is string => typeof id === 'string');
}

async function writeIds(ids: string[], updatedBy?: string): Promise<void> {
  const { error } = await supabase.from('platform_settings').upsert(
    {
      setting_key: SUSPENDED_MEMBERS_KEY,
      setting_value: ids,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy ?? null,
    },
    { onConflict: 'setting_key' }
  );
  if (error) {
    throw new Error(`Failed to save membership suspension: ${error.message}`);
  }
}

export const memberSuspensionService = {
  async suspendedIds(): Promise<Set<string>> {
    return new Set(await readIds());
  },

  async isSuspended(memberId: string): Promise<boolean> {
    const ids = await readIds();
    return ids.includes(memberId);
  },

  async setSuspended(memberId: string, suspended: boolean, updatedBy?: string): Promise<void> {
    const member = await memberRepository.findById(memberId);
    if (!member) {
      throw new Error('Member not found');
    }
    const ids = new Set(await readIds());
    if (suspended) ids.add(memberId);
    else ids.delete(memberId);
    await writeIds([...ids], updatedBy);
  },
};
