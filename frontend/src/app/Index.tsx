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
import { fundApi, Fund } from "@/services";

// TODO: Replace with actual contributions data when contributions API is ready
const recentContributions: any[] = [];

const columns = [
  { key: "member", header: "Member" },
  { key: "fund", header: "Fund" },
  { key: "amount", header: "Amount", className: "text-right font-medium" },
  { key: "date", header: "Date" },
  {
    key: "status",
    header: "Status",
    render: (item: typeof recentContributions[0]) => (
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
  const [loading, setLoading] = useState(true);
  const { account, getInitials } = useAccount();

  useEffect(() => {
    loadFunds();
  }, []);

  const loadFunds = async () => {
    try {
      setLoading(true);
      const data = await fundApi.getActive();
      setFunds(data);
    } catch (error) {
      console.error("Failed to load funds:", error);
    } finally {
      setLoading(false);
    }
  };

  const fundsWithAll = useMemo(() => {
    return [
      { fund_id: "all", fund_name: "All Funds" },
      ...funds.map(f => ({ fund_id: f.fund_id, fund_name: f.fund_name }))
    ];
  }, [funds]);

  const selectedFundName = fundsWithAll.find((f) => f.fund_id === selectedFund)?.fund_name || "All Funds";

  const filteredContributions = selectedFund === "all"
    ? recentContributions
    : recentContributions.filter((c) => c.fundId === selectedFund);

  // TODO: Replace with actual stats from API when contributions API is ready
  const stats = useMemo(() => {
    return {
      balance: 0,
      today: 0,
      month: 0,
      monthContributions: 0,
      pending: 0,
      pendingCount: 0,
      activeFunds: funds.filter(f => f.is_active).length,
      totalFunds: funds.length,
      members: 0,
      newMembers: 0,
    };
  }, [funds]);

  return (
    <AppLayout>
      {/* Header with Logo and Fund Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          {/* Custom Group Logo */}
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber to-gold flex items-center justify-center shrink-0 shadow-md overflow-hidden">
            {account?.account_logo ? (
              <img src={account.account_logo} alt="Account Logo" className="h-full w-full object-cover" />
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
          value={`$${stats.balance.toLocaleString()}`}
          icon={Wallet}
          accentBorder
          trend={{ value: "12%", positive: true }}
        />
        <StatCard
          title="This Month"
          value={`$${stats.month.toLocaleString()}`}
          subtitle={`${stats.monthContributions} contributions`}
          icon={CalendarDays}
          accentBorder
        />
        <StatCard
          title="Pending"
          value={`$${stats.pending.toLocaleString()}`}
          subtitle={`${stats.pendingCount} awaiting confirmation`}
          icon={Clock}
          accentBorder
        />
        {selectedFund === "all" && (
          <StatCard
            title="Active Funds"
            value={stats.activeFunds.toString()}
            subtitle={`of ${stats.totalFunds} total`}
            icon={FolderOpen}
            accentBorder
          />
        )}
        <StatCard
          title="Members"
          value={stats.members.toString()}
          subtitle={`${stats.newMembers} new this month`}
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
      <RecordContributionModal open={showRecordContribution} onOpenChange={setShowRecordContribution} />
    </AppLayout>
  );
}
