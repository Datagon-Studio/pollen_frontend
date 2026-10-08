import { managerRepository } from './manager.repository.js';

type ManagedAccount = Awaited<
  ReturnType<typeof managerRepository.findManagedAccounts>
>[number];

function accountNameMap(accounts: ManagedAccount[]): Map<string, string> {
  return new Map(
    accounts.map((account) => [
      account.account_id,
      account.account_name?.trim() || 'Unnamed account',
    ])
  );
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthStartUtc(monthOffset: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1));
}

export const managerService = {
  async getManagedAccounts(userId: string) {
    return managerRepository.findManagedAccounts(userId);
  },

  async getDashboard(userId: string) {
    const accounts = await managerRepository.findManagedAccounts(userId);
    const accountIds = accounts.map((account) => account.account_id);
    const [contributions, expenses, funds, members] = await Promise.all([
      managerRepository.findContributions(accountIds),
      managerRepository.findExpenses(accountIds),
      managerRepository.findFunds(accountIds),
      managerRepository.findMembers(accountIds),
    ]);

    const confirmed = contributions.filter((row: any) => row.status === 'confirmed');
    const pending = contributions.filter((row: any) => row.status === 'pending');
    const currentMonth = monthKey(new Date());
    const thisMonth = confirmed.filter((row: any) => {
      const value = row.date_received || row.created_at;
      return value && monthKey(new Date(value)) === currentMonth;
    });
    const newMembers = members.filter(
      (row: any) => row.created_at && monthKey(new Date(row.created_at)) === currentMonth
    );
    const overallCollected = confirmed.reduce(
      (sum: number, row: any) => sum + Number(row.amount || 0),
      0
    );
    const totalExpenses = expenses.reduce(
      (sum: number, row: any) => sum + Number(row.amount || 0),
      0
    );

    const monthlyCollections = Array.from({ length: 12 }, (_, index) => {
      const date = monthStartUtc(index - 11);
      return {
        month: monthKey(date),
        amount: 0,
        count: 0,
      };
    });
    const monthlyByKey = new Map(monthlyCollections.map((row) => [row.month, row]));

    confirmed.forEach((row: any) => {
      const value = row.date_received || row.created_at;
      if (!value) return;
      const bucket = monthlyByKey.get(monthKey(new Date(value)));
      if (!bucket) return;
      bucket.amount += Number(row.amount || 0);
      bucket.count += 1;
    });

    return {
      totalAccounts: accounts.length,
      activeAccounts: accounts.filter((account) => account.status === 'active').length,
      overallCollected,
      totalBalance: overallCollected - totalExpenses,
      collectedThisMonth: thisMonth.reduce(
        (sum: number, row: any) => sum + Number(row.amount || 0),
        0
      ),
      monthContributions: thisMonth.length,
      pending: pending.reduce(
        (sum: number, row: any) => sum + Number(row.amount || 0),
        0
      ),
      pendingCount: pending.length,
      activeFunds: funds.filter((fund: any) => fund.is_active).length,
      totalFunds: funds.length,
      members: members.length,
      newMembersThisMonth: newMembers.length,
      monthlyCollections,
    };
  },

  async getMembers(userId: string) {
    const accounts = await managerRepository.findManagedAccounts(userId);
    const names = accountNameMap(accounts);
    const members = await managerRepository.findMembers(
      accounts.map((account) => account.account_id)
    );

    return members.map((member: any) => ({
      ...member,
      account_name: names.get(member.account_id) || 'Unknown account',
    }));
  },

  async getFunds(userId: string) {
    const accounts = await managerRepository.findManagedAccounts(userId);
    const accountIds = accounts.map((account) => account.account_id);
    const names = accountNameMap(accounts);
    const [funds, contributions] = await Promise.all([
      managerRepository.findFunds(accountIds),
      managerRepository.findContributions(accountIds),
    ]);

    const totals = new Map<string, number>();
    contributions
      .filter((row: any) => row.status === 'confirmed')
      .forEach((row: any) => {
        totals.set(
          row.fund_id,
          (totals.get(row.fund_id) || 0) + Number(row.amount || 0)
        );
      });

    return funds.map((fund: any) => ({
      ...fund,
      account_name: names.get(fund.account_id) || 'Unknown account',
      collected: totals.get(fund.fund_id) || 0,
    }));
  },

  async getContributions(userId: string) {
    const accounts = await managerRepository.findManagedAccounts(userId);
    const names = accountNameMap(accounts);
    const contributions = await managerRepository.findContributions(
      accounts.map((account) => account.account_id)
    );

    return contributions.map((row: any) => {
      const { members, funds, ...contribution } = row;
      return {
        ...contribution,
        account_name: names.get(row.account_id) || 'Unknown account',
        member_name: members?.full_name || 'Anonymous',
        fund_name: funds?.fund_name || 'Unknown fund',
      };
    });
  },

  async getSettlements(userId: string) {
    const accounts = await managerRepository.findManagedAccounts(userId);
    const names = accountNameMap(accounts);
    const settlements = await managerRepository.findSettlements(
      accounts.map((account) => account.account_id)
    );

    return settlements.map((row: any) => {
      const { funds, ...settlement } = row;
      return {
        ...settlement,
        account_name: names.get(row.account_id) || 'Unknown account',
        fund_name: funds?.fund_name || 'Unknown fund',
      };
    });
  },
};
