import { supabase } from '../../shared/supabase/client.js';
import type { AuditLog } from '../../shared/services/audit.service.js';

export const auditRepository = {
  async findByAccountId(
    accountId: string,
    options?: { limit?: number; category?: string }
  ): Promise<AuditLog[]> {
    return this.findForAdmin({ ...options, accountId });
  },

  async findForAdmin(options?: {
    accountId?: string;
    limit?: number;
    category?: string;
  }): Promise<AuditLog[]> {
    const limit = Math.min(options?.limit ?? 50, 200);

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options?.accountId) {
      query = query.eq('account_id', options.accountId);
    }

    if (options?.category) {
      query = query.eq('action_category', options.category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }

    return (data || []) as AuditLog[];
  },
};
