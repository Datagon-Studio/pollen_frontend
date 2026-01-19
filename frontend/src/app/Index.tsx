import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wallet,
  TrendingUp,
  CalendarDays,
  Clock,
  FolderOpen,
  Users,
  Plus,
  UserPlus,
  HandCoins,
} from "lucide-react";
import { AddMemberModal } from "@/components/modals/AddMemberModal";
import { CreateFundModal } from "@/components/modals/CreateFundModal";
import { RecordContributionModal } from "@/components/modals/RecordContributionModal";
import { useAccount } from "@/hooks/useAccount";
import { useLogoPreload } from "@/hooks/useLogoPreload";
import { fundApi, Fund } from "@/services";
import { contributionApi, ContributionWithDetails } from "@/services/contribution.api";
import { reportingApi, DashboardStats } from "@/services/reporting.api";
import { format } from "date-fns";

interface ContributionRow {
  member: string;
  fund: string;
  amount: string;
  date: string;
  status: "pending" | "confirmed" | "failed" | "reversed";
  fundId: string;
}

const columns = [
  { key: "member", header: "Member" },
  { key: "fund", header: "Fund" },
  { key: "amount", header: "Amount", className: "text-right font-medium" },
  { key: "date", header: "Date" },
  {
    key: "status",
    header: "Status",
    render: (item: ContributionRow) => (
      <StatusBadge status={item.status} />
    ),
  },
];

export default function Dashboard() {
  const [selectedFund, setSelectedFund] = useState("all");
  const [showAddMember, setShowAddMember] = useState(false);
  const [showCreateFund, setShowCreateFund] = useState(false);
  const [showRecordContribution, setShowRecordContribution] = useState(false);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [contributions, setContributions] = useState<ContributionWithDetails[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { account, getInitials, loading: accountLoading } = useAccount();
  const logoLoaded = useLogoPreload(account?.account_logo);

  useEffect(() => {
    if (account?.account_id) {
      loadFunds();
      loadContributions();
      loadStats();
    }
  }, [account?.account_id]);

  const loadFunds = async () => {
    try {
      // Get all funds for admin dashboard (not just active)
      const data = await fundApi.getAll();
      setFunds(data);
    } catch (error) {
      console.error("Failed to load funds:", error);
    }
  };

  const loadContributions = async () => {
    if (!account?.account_id) return;
    
    try {
      const response = await contributionApi.getByAccount(account.account_id);
      if (response.success && response.data) {
        setContributions(response.data);
      }
    } catch (error) {
      console.error("Failed to load contributions:", error);
    }
  };

  const loadStats = async () => {
    if (!account?.account_id) return;
    
    try {
      setLoading(true);
      const response = await reportingApi.getDashboard(account.account_id);
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter to only show active funds in the dropdown (admins can see all funds in stats)
  const activeFunds = useMemo(() => {
    return funds.filter(f => f.is_active);
  }, [funds]);

  const fundsWithAll = useMemo(() => {
    return [
      { fund_id: "all", fund_name: "All Funds" },
      ...activeFunds.map(f => ({ fund_id: f.fund_id, fund_name: f.fund_name }))
    ];
  }, [activeFunds]);

  const selectedFundName = fundsWithAll.find((f) => f.fund_id === selectedFund)?.fund_name || "All Funds";

  const recentContributions: ContributionRow[] = useMemo(() => {
    return contributions
      .sort((a, b) => new Date(b.date_received).getTime() - new Date(a.date_received).getTime())
      .slice(0, 10)
      .map(c => ({
        member: c.member_name || "Anonymous",
        fund: c.fund_name,
        amount: `$${c.amount.toFixed(2)}`,
        date: format(new Date(c.date_received), "MMM d, yyyy"),
        status: c.status,
        fundId: c.fund_id,
      }));
  }, [contributions]);

  const filteredContributions = selectedFund === "all"
    ? recentContributions
    : recentContributions.filter((c) => c.fundId === selectedFund);

  const displayStats = useMemo(() => {
    if (!stats) {
      return {
        balance: 0,
        month: 0,
        monthContributions: 0,
        pending: 0,
        pendingCount: 0,
        activeFunds: activeFunds.length,
        totalFunds: funds.length,
        members: 0,
        newMembers: 0,
      };
    }
    return {
      balance: stats.totalBalance,
      month: stats.thisMonth,
      monthContributions: stats.monthContributions,
      pending: stats.pending,
      pendingCount: stats.pendingCount,
      activeFunds: stats.activeFunds,
      totalFunds: stats.totalFunds,
      members: stats.members,
      newMembers: stats.newMembersThisMonth,
    };
  }, [stats, funds, activeFunds]);

  return (
    <AppLayout>
      {/* Header with Logo and Fund Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          {/* Custom Group Logo */}
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber to-gold flex items-center justify-center shrink-0 shadow-md overflow-hidden relative">
            {accountLoading ? (
              <div className="h-full w-full bg-amber/20 animate-pulse" />
            ) : account?.account_logo && logoLoaded ? (
              <img 
                src={account.account_logo} 
                alt="Account Logo" 
                className="h-full w-full object-cover"
              />
            ) : account?.account_logo ? (
              <div className="h-full w-full bg-amber/20 animate-pulse" />
            ) : (
              <span className="text-lg font-bold text-white">
                {account ? getInitials(account.account_name) : "CG"}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{selectedFundName}</h1>
            <p className="text-sm text-muted-foreground">Overview of your group's financial activity</p>
          </div>
        </div>

        {/* Fund Selector */}
        <Select value={selectedFund} onValueChange={setSelectedFund}>
          <SelectTrigger className="w-[200px]" aria-label="Select fund">
            <FolderOpen className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Select Fund" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {fundsWithAll.map((fund) => (
              <SelectItem key={fund.fund_id} value={fund.fund_id}>
                {fund.fund_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${selectedFund === "all" ? "xl:grid-cols-5" : "xl:grid-cols-4"} gap-4 mb-8`}>
        <StatCard
          title="Total Balance"
          value={loading ? "..." : `$${displayStats.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Wallet}
          accentBorder
        />
        <StatCard
          title="This Month"
          value={loading ? "..." : `$${displayStats.month.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={loading ? "..." : `${displayStats.monthContributions} contributions`}
          icon={CalendarDays}
          accentBorder
        />
        <StatCard
          title="Pending"
          value={loading ? "..." : `$${displayStats.pending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={loading ? "..." : `${displayStats.pendingCount} awaiting confirmation`}
          icon={Clock}
          accentBorder
        />
        {selectedFund === "all" && (
          <StatCard
            title="Active Funds"
            value={displayStats.activeFunds.toString()}
            subtitle={`of ${displayStats.totalFunds} total`}
            icon={FolderOpen}
            accentBorder
          />
        )}
        <StatCard
          title="Members"
          value={loading ? "..." : displayStats.members.toString()}
          subtitle={loading ? "..." : `${displayStats.newMembers} new this month`}
          icon={Users}
          accentBorder
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <button 
          onClick={() => setShowRecordContribution(true)}
          className="bg-card border border-border rounded-lg p-5 text-left hover:border-amber/50 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-md bg-amber/10 flex items-center justify-center group-hover:bg-amber/20 transition-colors">
              <HandCoins className="h-6 w-6 text-amber" />
            </div>
            <div>
              <p className="font-medium text-foreground">Record Contribution</p>
              <p className="text-sm text-muted-foreground">Log an offline payment</p>
            </div>
          </div>
        </button>
        <button 
          onClick={() => setShowAddMember(true)}
          className="bg-card border border-border rounded-lg p-5 text-left hover:border-amber/50 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-md bg-amber/10 flex items-center justify-center group-hover:bg-amber/20 transition-colors">
              <UserPlus className="h-6 w-6 text-amber" />
            </div>
            <div>
              <p className="font-medium text-foreground">Add Member</p>
              <p className="text-sm text-muted-foreground">Register a new member</p>
            </div>
          </div>
        </button>
        <button 
          onClick={() => setShowCreateFund(true)}
          className="bg-card border border-border rounded-lg p-5 text-left hover:border-amber/50 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-md bg-amber/10 flex items-center justify-center group-hover:bg-amber/20 transition-colors">
              <Plus className="h-6 w-6 text-amber" />
            </div>
            <div>
              <p className="font-medium text-foreground">Create Fund</p>
              <p className="text-sm text-muted-foreground">Set up a new fund</p>
            </div>
          </div>
        </button>
      </div>

      {/* Recent Contributions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Contributions</h2>
          <Button variant="ghost" size="sm" className="text-amber-dark hover:text-charcoal">
            View all
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={filteredContributions}
          rowClassName={(item) =>
            item.status === "pending" ? "border-l-2 border-l-amber" : ""
          }
        />
      </div>

      {/* Modals */}
      <AddMemberModal open={showAddMember} onOpenChange={setShowAddMember} />
      <CreateFundModal open={showCreateFund} onOpenChange={setShowCreateFund} />
      <RecordContributionModal 
        open={showRecordContribution} 
        onOpenChange={setShowRecordContribution}
        onSuccess={() => {
          loadContributions();
          loadStats();
        }}
      />
    </AppLayout>
  );
}
