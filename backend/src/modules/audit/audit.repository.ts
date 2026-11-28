import { supabase } from '../../shared/supabase/client.js';
import { fetchAllRows } from '../../shared/supabase/fetch-all.js';
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
    const rows = await fetchAllRows<AuditLog>((from, to) => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .order('audit_id', { ascending: false })
        .range(from, to);

      if (options?.accountId) {
        query = query.eq('account_id', options.accountId);
      }

      if (options?.category) {
        query = query.eq('action_category', options.category);
      }

      return query;
    }).catch((error: unknown) => {
      console.error('Error fetching audit logs:', error);
      return [] as AuditLog[];
    });

    if (options?.limit && options.limit > 0) {
      return rows.slice(0, options.limit);
    }

    return rows;
  },
};
