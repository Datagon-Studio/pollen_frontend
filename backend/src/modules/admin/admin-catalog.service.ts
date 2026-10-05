import { supabase } from '../../shared/supabase/client.js';
import { contributionRepository } from '../contribution/contribution.repository.js';
import { accountKYCService } from '../account/account-kyc.service.js';
import { accountRepository } from '../account/account.repository.js';
import type { AccountKYC } from '../account/account-kyc.entity.js';

export interface AdminMemberSummary {
  member_id: string;
  account_id: string;
  account_name: string | null;
  full_name: string;
  email: string | null;
  phone: string;
  phone_verified: boolean;
  email_verified: boolean;
  membership_number: string | null;
  is_active: boolean;
  also_in_count: number;
  contribution_count: number;
  contribution_total: number;
  created_at: string;
}

export interface AdminMemberOtherGroup {
  member_id: string;
  account_id: string;
  account_name: string | null;
  full_name: string;
}

export interface AdminMemberDetail extends AdminMemberSummary {
  dob: string | null;
  other_groups: AdminMemberOtherGroup[];
  contributions: AdminContributionRow[];
}

export interface AdminFundSummary {
  fund_id: string;
  account_id: string;
  account_name: string | null;
  fund_name: string;
  fund_goal: number | null;
  amount_collected: number;
  is_public: boolean;
  is_active: boolean;
  settlement_status: string | null;
  created_at: string;
}

export interface AdminFundDetail extends AdminFundSummary {
  description: string | null;
  default_amount: number | null;
  updated_at: string;
  contributions: AdminContributionRow[];
}

export interface AdminContributionRow {
  contribution_id: string;
  account_id: string;
  account_name: string | null;
  fund_id: string;
  fund_name: string | null;
  member_id: string | null;
  member_name: string | null;
  amount: number;
  channel: 'offline' | 'online';
  payment_method: string | null;
  payment_reference: string | null;
  status: string;
  date_received: string;
  comment: string | null;
  received_by_user_id: string | null;
  created_at: string;
}

export interface AdminContributionDetail extends AdminContributionRow {
  updated_at: string;
}

export interface MemberListFilters {
  accountId?: string;
  verified?: boolean;
  search?: string;
}

export interface FundListFilters {
  accountId?: string;
  isActive?: boolean;
  isPublic?: boolean;
  search?: string;
}

export interface ContributionListFilters {
  accountId?: string;
  fundId?: string;
  channel?: 'offline' | 'online';
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface AccountStaffMember {
  user_id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  account_role: string;
  linked_at: string;
}

export interface AdminAccountTeam {
  managers: AccountStaffMember[];
  officers: AccountStaffMember[];
}

export interface AdminAccountKyc {
  account_kyc_status: string;
  kyc: AccountKYC | null;
}

type MemberRow = {
  member_id: string;
  account_id: string;
  full_name: string;
  dob: string | null;
  phone: string;
  phone_verified: boolean;
  email: string | null;
  email_verified: boolean;
  membership_number: string | null;
  created_at: string;
};

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function memberIsActive(m: MemberRow): boolean {
  return m.phone_verified || m.email_verified;
}

function matchesIdentity(a: MemberRow, b: MemberRow): boolean {
  if (a.member_id === b.member_id || a.account_id === b.account_id) return false;

  const phoneMatch =
    a.phone_verified &&
    b.phone_verified &&
    normalizePhone(a.phone).length > 0 &&
    normalizePhone(a.phone) === normalizePhone(b.phone);

  const emailMatch =
    a.email_verified &&
    b.email_verified &&
    !!a.email &&
    !!b.email &&
    a.email.toLowerCase() === b.email.toLowerCase();

  return phoneMatch || emailMatch;
}

function findOtherGroups(member: MemberRow, allMembers: MemberRow[]): AdminMemberOtherGroup[] {
  return allMembers
    .filter((other) => matchesIdentity(member, other))
    .map((other) => ({
      member_id: other.member_id,
      account_id: other.account_id,
      account_name: null as string | null,
      full_name: other.full_name,
    }));
}

function mapContributionRow(c: Record<string, unknown>): AdminContributionRow {
  const members = c.members as { full_name?: string } | null;
  const funds = c.funds as { fund_name?: string } | null;
  const accounts = c.accounts as { account_name?: string } | null;
  return {
    contribution_id: c.contribution_id as string,
    account_id: c.account_id as string,
    account_name: accounts?.account_name ?? null,
    fund_id: c.fund_id as string,
    fund_name: funds?.fund_name ?? null,
    member_id: (c.member_id as string | null) ?? null,
    member_name: members?.full_name ?? (c.member_id ? null : 'Anonymous'),
    amount: Number(c.amount),
    channel: c.channel as 'offline' | 'online',
    payment_method: (c.payment_method as string | null) ?? null,
    payment_reference: (c.payment_reference as string | null) ?? null,
    status: c.status as string,
    date_received: c.date_received as string,
    comment: (c.comment as string | null) ?? null,
    received_by_user_id: (c.received_by_user_id as string | null) ?? null,
    created_at: c.created_at as string,
  };
}

export const adminCatalogService = {
  async listMembers(filters: MemberListFilters = {}): Promise<AdminMemberSummary[]> {
    const [membersRes, accountsRes, contributionsRes] = await Promise.all([
      supabase.from('members').select('*').order('created_at', { ascending: false }),
      supabase.from('accounts').select('account_id, account_name'),
      supabase.from('contributions').select('member_id, amount, status'),
    ]);

    if (membersRes.error) throw new Error(membersRes.error.message);
    if (accountsRes.error) throw new Error(accountsRes.error.message);
    if (contributionsRes.error) throw new Error(contributionsRes.error.message);

    const members = (membersRes.data || []) as MemberRow[];
    const accountNames = new Map(
      (accountsRes.data || []).map((a) => [a.account_id, a.account_name as string | null])
    );

    const contribStats = new Map<string, { count: number; total: number }>();
    for (const c of contributionsRes.data || []) {
      if (!c.member_id || c.status !== 'confirmed') continue;
      const cur = contribStats.get(c.member_id) || { count: 0, total: 0 };
      cur.count += 1;
      cur.total += Number(c.amount);
      contribStats.set(c.member_id, cur);
    }

    let results: AdminMemberSummary[] = members.map((m) => {
      const stats = contribStats.get(m.member_id) || { count: 0, total: 0 };
      const otherGroups = findOtherGroups(m, members);
      return {
        member_id: m.member_id,
        account_id: m.account_id,
        account_name: accountNames.get(m.account_id) ?? null,
        full_name: m.full_name,
        email: m.email,
        phone: m.phone,
        phone_verified: m.phone_verified,
        email_verified: m.email_verified,
        membership_number: m.membership_number,
        is_active: memberIsActive(m),
        also_in_count: otherGroups.length,
        contribution_count: stats.count,
        contribution_total: stats.total,
        created_at: m.created_at,
      };
    });

    if (filters.accountId) {
      results = results.filter((m) => m.account_id === filters.accountId);
    }
    if (filters.verified === true) {
      results = results.filter((m) => m.is_active);
    } else if (filters.verified === false) {
      results = results.filter((m) => !m.is_active);
    }
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      results = results.filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          (m.email?.toLowerCase().includes(q) ?? false) ||
          (m.account_name?.toLowerCase().includes(q) ?? false)
      );
    }

    return results;
  },

  async getMember(memberId: string, scope: 'account' | 'all' = 'account'): Promise<AdminMemberDetail | null> {
    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('member_id', memberId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!member) return null;

    const m = member as MemberRow;
    const [accountsRes, allMembersRes] = await Promise.all([
      supabase.from('accounts').select('account_id, account_name'),
      supabase.from('members').select('*'),
    ]);

    if (accountsRes.error) throw new Error(accountsRes.error.message);
    if (allMembersRes.error) throw new Error(allMembersRes.error.message);

    const accountNames = new Map(
      (accountsRes.data || []).map((a) => [a.account_id, a.account_name as string | null])
    );
    const allMembers = (allMembersRes.data || []) as MemberRow[];

    const otherGroups = findOtherGroups(m, allMembers).map((g) => ({
      ...g,
      account_name: accountNames.get(g.account_id) ?? null,
    }));

    const memberIds =
      scope === 'all'
        ? [m.member_id, ...otherGroups.map((g) => g.member_id)]
        : [m.member_id];

    const { data: contribRows, error: contribErr } = await supabase
      .from('contributions')
      .select(`
        *,
        members(full_name),
        funds(fund_name),
        accounts(account_name)
      `)
      .in('member_id', memberIds)
      .order('date_received', { ascending: false });

    if (contribErr) throw new Error(contribErr.message);

    const contributions = (contribRows || []).map((c) => mapContributionRow(c as Record<string, unknown>));
    const confirmed = contributions.filter((c) => c.status === 'confirmed');

    const summary: AdminMemberSummary = {
      member_id: m.member_id,
      account_id: m.account_id,
      account_name: accountNames.get(m.account_id) ?? null,
      full_name: m.full_name,
      email: m.email,
      phone: m.phone,
      phone_verified: m.phone_verified,
      email_verified: m.email_verified,
      membership_number: m.membership_number,
      is_active: memberIsActive(m),
      also_in_count: otherGroups.length,
      contribution_count: confirmed.filter((c) => c.account_id === m.account_id).length,
      contribution_total: confirmed
        .filter((c) => c.account_id === m.account_id)
        .reduce((s, c) => s + c.amount, 0),
      created_at: m.created_at,
    };

    return {
      ...summary,
      dob: m.dob,
      other_groups: otherGroups,
      contributions,
    };
  },

  async listFunds(filters: FundListFilters = {}): Promise<AdminFundSummary[]> {
    const [fundsRes, accountsRes, contributionsRes] = await Promise.all([
      supabase.from('funds').select('*').order('created_at', { ascending: false }),
      supabase.from('accounts').select('account_id, account_name'),
      supabase.from('contributions').select('fund_id, amount, status'),
    ]);

    if (fundsRes.error) throw new Error(fundsRes.error.message);
    if (accountsRes.error) throw new Error(accountsRes.error.message);
    if (contributionsRes.error) throw new Error(contributionsRes.error.message);

    const accountNames = new Map(
      (accountsRes.data || []).map((a) => [a.account_id, a.account_name as string | null])
    );

    const collected = new Map<string, number>();
    for (const c of contributionsRes.data || []) {
      if (c.status !== 'confirmed') continue;
      collected.set(c.fund_id, (collected.get(c.fund_id) || 0) + Number(c.amount));
    }

    let results: AdminFundSummary[] = (fundsRes.data || []).map((f) => ({
      fund_id: f.fund_id,
      account_id: f.account_id,
      account_name: accountNames.get(f.account_id) ?? null,
      fund_name: f.fund_name,
      fund_goal: f.fund_goal,
      amount_collected: collected.get(f.fund_id) || 0,
      is_public: f.is_public,
      is_active: f.is_active,
      settlement_status: null,
      created_at: f.created_at,
    }));

    if (filters.accountId) {
      results = results.filter((f) => f.account_id === filters.accountId);
    }
    if (filters.isActive === true) {
      results = results.filter((f) => f.is_active);
    } else if (filters.isActive === false) {
      results = results.filter((f) => !f.is_active);
    }
    if (filters.isPublic === true) {
      results = results.filter((f) => f.is_public);
    } else if (filters.isPublic === false) {
      results = results.filter((f) => !f.is_public);
    }
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      results = results.filter(
        (f) =>
          f.fund_name.toLowerCase().includes(q) ||
          (f.account_name?.toLowerCase().includes(q) ?? false)
      );
    }

    return results;
  },

  async getFund(fundId: string): Promise<AdminFundDetail | null> {
    const { data: fund, error } = await supabase
      .from('funds')
      .select('*')
      .eq('fund_id', fundId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!fund) return null;

    const { data: account } = await supabase
      .from('accounts')
      .select('account_name')
      .eq('account_id', fund.account_id)
      .maybeSingle();

    const amountCollected = await contributionRepository.getTotalByFund(fundId);

    const { data: contribRows, error: contribErr } = await supabase
      .from('contributions')
      .select(`
        *,
        members(full_name),
        funds(fund_name),
        accounts(account_name)
      `)
      .eq('fund_id', fundId)
      .order('date_received', { ascending: false })
      .limit(100);

    if (contribErr) throw new Error(contribErr.message);

    return {
      fund_id: fund.fund_id,
      account_id: fund.account_id,
      account_name: account?.account_name ?? null,
      fund_name: fund.fund_name,
      fund_goal: fund.fund_goal,
      amount_collected: amountCollected,
      is_public: fund.is_public,
      is_active: fund.is_active,
      settlement_status: null,
      created_at: fund.created_at,
      description: fund.description,
      default_amount: fund.default_amount,
      updated_at: fund.updated_at,
      contributions: (contribRows || []).map((c) =>
        mapContributionRow(c as Record<string, unknown>)
      ),
    };
  },

  async listContributions(filters: ContributionListFilters = {}): Promise<AdminContributionRow[]> {
    let query = supabase
      .from('contributions')
      .select(`
        *,
        members(full_name),
        funds(fund_name),
        accounts(account_name)
      `)
      .order('date_received', { ascending: false })
      .limit(500);

    if (filters.accountId) query = query.eq('account_id', filters.accountId);
    if (filters.fundId) query = query.eq('fund_id', filters.fundId);
    if (filters.channel) query = query.eq('channel', filters.channel);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.dateFrom) query = query.gte('date_received', filters.dateFrom);
    if (filters.dateTo) query = query.lte('date_received', filters.dateTo);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    let rows = (data || []).map((c) => mapContributionRow(c as Record<string, unknown>));

    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.member_name?.toLowerCase().includes(q) ?? false) ||
          (r.payment_reference?.toLowerCase().includes(q) ?? false) ||
          (r.account_name?.toLowerCase().includes(q) ?? false) ||
          (r.fund_name?.toLowerCase().includes(q) ?? false)
      );
    }

    return rows;
  },

  async getContribution(contributionId: string): Promise<AdminContributionDetail | null> {
    const { data, error } = await supabase
      .from('contributions')
      .select(`
        *,
        members(full_name),
        funds(fund_name),
        accounts(account_name)
      `)
      .eq('contribution_id', contributionId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const row = mapContributionRow(data as Record<string, unknown>);
    return {
      ...row,
      updated_at: (data as { updated_at: string }).updated_at,
    };
  },

  async getAccountTeam(accountId: string): Promise<AdminAccountTeam> {
    const { data, error } = await supabase
      .from('user_accounts')
      .select(`
        role,
        created_at,
        users (
          user_id,
          email,
          full_name,
          phone_number
        )
      `)
      .eq('account_id', accountId)
      .in('role', ['admin', 'officer'])
      // Oldest link first: the account's first admin is its creator (there is no
      // owner column — the signup trigger links the creator as the initial admin).
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    const managers: AccountStaffMember[] = [];
    const officers: AccountStaffMember[] = [];

    for (const row of data || []) {
      const users = row.users as
        | {
            user_id: string;
            email: string;
            full_name: string | null;
            phone_number: string | null;
          }
        | {
            user_id: string;
            email: string;
            full_name: string | null;
            phone_number: string | null;
          }[]
        | null;

      const user = Array.isArray(users) ? users[0] : users;
      if (!user) continue;

      const member: AccountStaffMember = {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        phone_number: user.phone_number,
        account_role: row.role as string,
        linked_at: row.created_at as string,
      };

      if (row.role === 'admin') managers.push(member);
      else if (row.role === 'officer') officers.push(member);
    }

    return { managers, officers };
  },

  async getAccountKyc(accountId: string): Promise<AdminAccountKyc | null> {
    const account = await accountRepository.findByAccountId(accountId);
    if (!account) return null;

    const kyc = await accountKYCService.getKYCByAccountId(accountId);
    return {
      account_kyc_status: account.kyc_status,
      kyc,
    };
  },
};
