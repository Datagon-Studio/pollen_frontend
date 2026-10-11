import { supabase } from '../../shared/supabase/client.js';
import { env } from '../../env.js';
import { auditService } from '../../shared/services/audit.service.js';
import { postmarkService } from '../../shared/services/postmark.service.js';
import { contributionRepository } from '../contribution/contribution.repository.js';
import { fundRepository } from '../fund/fund.repository.js';
import { fundSettlementService } from '../fund-settlement/fund-settlement.service.js';
import { settlementRepository } from '../settlement/settlement.repository.js';
import {
  CreateSettlementRequestInput,
  SettlementRequestDetailView,
  SettlementRequestHistoryRow,
  SettlementRequestHistoryView,
  SettlementRequestRow,
  SettlementRequestStatus,
  SettlementRequestView,
  UpdateSettlementRequestStatusInput,
} from './settlement-request.entity.js';
import { settlementRequestRepository } from './settlement-request.repository.js';

export class SettlementRequestError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const NEXT_STATUS: Record<SettlementRequestStatus, SettlementRequestStatus[]> = {
  pending: ['approved', 'rejected'],
  approved: ['disbursed', 'rejected'],
  rejected: [],
  disbursed: [],
};

async function adminAccountIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_accounts')
    .select('account_id, role')
    .eq('user_id', userId)
    .eq('role', 'admin');

  if (error) throw new Error(error.message);
  return (data || []).map((row) => row.account_id);
}

async function assertAccountManager(userId: string, accountId: string): Promise<void> {
  const { data, error } = await supabase
    .from('user_accounts')
    .select('role')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || data.role !== 'admin') {
    throw new SettlementRequestError(
      'Only a group manager can manage settlement requests for this account',
      403
    );
  }
}

async function namesById(
  table: 'accounts' | 'funds' | 'users',
  idColumn: string,
  ids: string[],
  columns: string
): Promise<Map<string, Record<string, string | null>>> {
  const map = new Map<string, Record<string, string | null>>();
  if (ids.length === 0) return map;

  const { data, error } = await supabase.from(table).select(columns).in(idColumn, ids);
  if (error) throw new Error(error.message);
  for (const row of data || []) {
    const record = row as unknown as Record<string, string | null>;
    const id = record[idColumn];
    if (id) map.set(id, record);
  }
  return map;
}

function toView(
  row: SettlementRequestRow,
  accounts: Map<string, Record<string, string | null>>,
  funds: Map<string, Record<string, string | null>>,
  users: Map<string, Record<string, string | null>>
): SettlementRequestView {
  const requester = users.get(row.requested_by_user_id);
  return {
    request_id: row.request_id,
    account_id: row.account_id,
    account_name: accounts.get(row.account_id)?.account_name || 'Unknown account',
    fund_id: row.fund_id,
    fund_name: funds.get(row.fund_id)?.fund_name || 'Unknown fund',
    requested_by_user_id: row.requested_by_user_id,
    requester_name: requester?.full_name ?? null,
    requester_email: requester?.email ?? null,
    amount: Number(row.amount),
    status: row.status,
    request_note: row.request_note,
    admin_note: row.admin_note,
    destination_type: row.destination_type,
    destination_account_name: row.destination_account_name,
    destination_account_number: row.destination_account_number,
    destination_bank_name: row.destination_bank_name,
    destination_bank_branch: row.destination_bank_branch,
    destination_provider: row.destination_provider,
    reviewed_by_user_id: row.reviewed_by_user_id,
    reviewed_at: row.reviewed_at,
    disbursed_at: row.disbursed_at,
    disbursement_reference: row.disbursement_reference,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function hydrate(rows: SettlementRequestRow[]): Promise<SettlementRequestView[]> {
  const accountIds = [...new Set(rows.map((row) => row.account_id))];
  const fundIds = [...new Set(rows.map((row) => row.fund_id))];
  const userIds = [...new Set(rows.map((row) => row.requested_by_user_id))];
  const [accounts, funds, users] = await Promise.all([
    namesById('accounts', 'account_id', accountIds, 'account_id, account_name'),
    namesById('funds', 'fund_id', fundIds, 'fund_id, fund_name'),
    namesById('users', 'user_id', userIds, 'user_id, full_name, email'),
  ]);
  return rows.map((row) => toView(row, accounts, funds, users));
}

async function hydrateHistory(
  rows: SettlementRequestHistoryRow[]
): Promise<SettlementRequestHistoryView[]> {
  const userIds = [...new Set(rows.map((row) => row.changed_by_user_id))];
  const users = await namesById('users', 'user_id', userIds, 'user_id, full_name, email');
  return rows.map((row) => ({
    history_id: row.history_id,
    previous_status: row.previous_status,
    new_status: row.new_status,
    changed_by_user_id: row.changed_by_user_id,
    changed_by_name: users.get(row.changed_by_user_id)?.full_name ?? null,
    note: row.note,
    created_at: row.created_at,
  }));
}

async function notifyCreated(view: SettlementRequestView): Promise<void> {
  const managerLink = `${env.FRONTEND_URL}/settlements`;
  const opsLink = `${env.ADMIN_FRONTEND_URL}/settlements/${view.request_id}`;
  const destination =
    view.destination_type === 'bank'
      ? view.destination_bank_name || 'Bank'
      : view.destination_provider || 'Mobile money';
  const subject = `Settlement request: ${view.account_name} · ${view.fund_name}`;
  const textFor = (link: string) =>
    [
      `${view.requester_name || view.requester_email || 'A group manager'} requested a settlement.`,
      `Account: ${view.account_name}`,
      `Fund: ${view.fund_name}`,
      `Amount: GHS ${view.amount.toFixed(2)}`,
      `Destination: ${destination}`,
      `Open: ${link}`,
    ].join('\n');

  const sends: Array<Promise<unknown>> = [];
  if (view.requester_email) {
    sends.push(
      postmarkService.sendEmail(
        view.requester_email,
        subject,
        `<p>${textFor(managerLink).replace(/\n/g, '<br>')}</p>`,
        textFor(managerLink),
        'settlement-request-created'
      )
    );
  }
  if (env.OPS_SETTLEMENT_EMAIL) {
    sends.push(
      postmarkService.sendEmail(
        env.OPS_SETTLEMENT_EMAIL,
        subject,
        `<p>${textFor(opsLink).replace(/\n/g, '<br>')}</p>`,
        textFor(opsLink),
        'settlement-request-created'
      )
    );
  }

  const results = await Promise.allSettled(sends);
  results.forEach((result) => {
    if (result.status === 'rejected') {
      console.error('Settlement request email failed:', result.reason);
    }
  });
}

export const settlementRequestService = {
  async listForManager(userId: string): Promise<SettlementRequestView[]> {
    const accountIds = await adminAccountIds(userId);
    const rows = await settlementRequestRepository.list({ accountIds });
    return hydrate(rows);
  },

  async getContext(userId: string, accountId: string) {
    await assertAccountManager(userId, accountId);
    const destination = await settlementRepository.findActiveByAccountId(accountId);
    return { destination };
  },

  async create(
    userId: string,
    input: CreateSettlementRequestInput
  ): Promise<SettlementRequestView> {
    if (!input.account_id || !input.fund_id) {
      throw new SettlementRequestError('Account and fund are required');
    }
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new SettlementRequestError('Amount must be greater than zero');
    }

    await assertAccountManager(userId, input.account_id);

    const fund = await fundRepository.findById(input.fund_id);
    if (!fund || fund.account_id !== input.account_id) {
      throw new SettlementRequestError('Fund not found for this account', 404);
    }

    const destination = await settlementRepository.findActiveByAccountId(input.account_id);
    if (!destination) {
      throw new SettlementRequestError(
        'Add active bank or mobile money details in Settings before requesting a settlement'
      );
    }

    const pending = await settlementRequestRepository.findPendingByFund(input.fund_id);
    if (pending) {
      throw new SettlementRequestError('This fund already has a pending settlement request');
    }

    const availability = await fundSettlementService.getAvailability(input.account_id, input.fund_id);
    if (amount > availability.availableAmount) {
      throw new SettlementRequestError(
        `Amount exceeds the maximum withdrawable for this fund (GHS ${availability.availableAmount.toFixed(2)})`
      );
    }

    const row = await settlementRequestRepository.create({
      account_id: input.account_id,
      fund_id: input.fund_id,
      requested_by_user_id: userId,
      amount,
      request_note: input.request_note?.trim() || null,
      destination_type: destination.settlement_type,
      destination_account_name: destination.account_name,
      destination_account_number: destination.account_number,
      destination_bank_name: destination.bank_name,
      destination_bank_branch: destination.bank_branch,
      destination_provider: destination.provider,
    });

    await settlementRequestRepository.addHistory({
      request_id: row.request_id,
      previous_status: null,
      new_status: 'pending',
      changed_by_user_id: userId,
      note: row.request_note,
    });

    await auditService.log({
      actionType: 'SETTLEMENT_REQUEST_CREATED',
      actionCategory: 'PAYMENT',
      userId,
      accountId: row.account_id,
      entityType: 'settlement_request',
      entityId: row.request_id,
      actionDetails: { fund_id: row.fund_id, amount },
    });

    const [view] = await hydrate([row]);
    void notifyCreated(view).catch((error) => {
      console.error('Settlement request email failed:', error);
    });
    return view;
  },

  async listForAdmin(filters: {
    accountId?: string;
    fundId?: string;
    status?: SettlementRequestStatus;
  }): Promise<SettlementRequestView[]> {
    const rows = await settlementRequestRepository.list(filters);
    return hydrate(rows);
  },

  async getForAdmin(requestId: string): Promise<SettlementRequestDetailView | null> {
    const row = await settlementRequestRepository.findById(requestId);
    if (!row) return null;
    const [view] = await hydrate([row]);
    const history = await hydrateHistory(
      await settlementRequestRepository.listHistory(requestId)
    );
    const [breakdown, fundDisbursed] = await Promise.all([
      contributionRepository.getConfirmedBreakdownByFund(row.fund_id),
      settlementRequestRepository.sumDisbursedForFund(row.fund_id),
    ]);
    const fundCollected = breakdown.total;
    return {
      ...view,
      history,
      fund_collected: fundCollected,
      fund_disbursed: fundDisbursed,
    };
  },

  async updateStatus(
    staffUserId: string,
    requestId: string,
    input: UpdateSettlementRequestStatusInput
  ): Promise<SettlementRequestView> {
    const existing = await settlementRequestRepository.findById(requestId);
    if (!existing) {
      throw new SettlementRequestError('Settlement request not found', 404);
    }

    const next = input.status;
    if (!NEXT_STATUS[existing.status].includes(next)) {
      throw new SettlementRequestError(
        `Cannot change a ${existing.status} request to ${next}`
      );
    }

    const note = input.note?.trim() || '';
    if (next === 'rejected' && !note) {
      throw new SettlementRequestError('A reason is required to reject a settlement request');
    }

    const now = new Date().toISOString();
    const updated = await settlementRequestRepository.updateStatus(requestId, {
      status: next,
      admin_note: note || existing.admin_note,
      ...(next === 'approved' || next === 'rejected'
        ? { reviewed_by_user_id: staffUserId, reviewed_at: now }
        : {}),
      ...(next === 'disbursed'
        ? {
            disbursed_at: now,
            disbursement_reference: input.disbursement_reference?.trim() || null,
          }
        : {}),
    });

    await settlementRequestRepository.addHistory({
      request_id: requestId,
      previous_status: existing.status,
      new_status: next,
      changed_by_user_id: staffUserId,
      note: note || null,
    });

    await auditService.log({
      actionType: 'SETTLEMENT_REQUEST_STATUS',
      actionCategory: 'PAYMENT',
      userId: staffUserId,
      accountId: existing.account_id,
      entityType: 'settlement_request',
      entityId: requestId,
      actionDetails: {
        from: existing.status,
        to: next,
        note: note || null,
        disbursement_reference: input.disbursement_reference?.trim() || null,
      },
    });

    const [view] = await hydrate([updated]);
    return view;
  },
};
