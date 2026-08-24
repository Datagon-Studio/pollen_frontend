import { request } from './api-client';

export type AuditActionCategory =
  | 'AUTH'
  | 'MEMBER'
  | 'CONTRIBUTION'
  | 'FUND'
  | 'EXPENSE'
  | 'ACCOUNT'
  | 'PAYMENT'
  | 'SYSTEM';

export type AuditActionStatus = 'success' | 'failed' | 'error';

export interface AuditLog {
  audit_id: string;
  action_type: string;
  action_category: AuditActionCategory;
  user_id: string | null;
  account_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  action_details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  status: AuditActionStatus;
  error_message: string | null;
  created_at: string;
}

export const auditApi = {
  async getByAccount(
    accountId: string,
    options?: { limit?: number; category?: AuditActionCategory }
  ): Promise<AuditLog[]> {
    const params = new URLSearchParams({ accountId });
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.category) params.set('category', options.category);

    const response = await request<AuditLog[]>(`/audit-logs?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch activity logs');
    }

    return response.data;
  },
};
