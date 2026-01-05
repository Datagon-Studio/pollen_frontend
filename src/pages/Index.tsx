import { useState, useMemo } from "react";
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

const funds = [
  { id: "all", name: "All Funds" },
  { id: "emergency", name: "Emergency Fund" },
  { id: "annual", name: "Annual Dues" },
  { id: "building", name: "Building Fund" },
  { id: "youth", name: "Youth Program" },
  { id: "scholarship", name: "Scholarship Fund" },
];

// Fund-specific stats data
const fundStats = {
  all: { balance: 24580, today: 225, month: 4850, monthContributions: 32, pending: 1275, pendingCount: 8, activeFunds: 5, totalFunds: 7, members: 48, newMembers: 3 },
  emergency: { balance: 8200, today: 150, month: 1200, monthContributions: 12, pending: 350, pendingCount: 2, activeFunds: 1, totalFunds: 1, members: 42, newMembers: 1 },
  annual: { balance: 5600, today: 75, month: 900, monthContributions: 8, pending: 225, pendingCount: 3, activeFunds: 1, totalFunds: 1, members: 48, newMembers: 2 },
  building: { balance: 6800, today: 0, month: 1400, monthContributions: 6, pending: 400, pendingCount: 2, activeFunds: 1, totalFunds: 1, members: 35, newMembers: 0 },
  youth: { balance: 2100, today: 0, month: 650, monthContributions: 4, pending: 150, pendingCount: 1, activeFunds: 1, totalFunds: 1, members: 28, newMembers: 0 },
  scholarship: { balance: 1880, today: 0, month: 700, monthContributions: 2, pending: 150, pendingCount: 0, activeFunds: 1, totalFunds: 1, members: 22, newMembers: 0 },
};

const recentContributions = [
  { id: 1, member: "Alice Johnson", fund: "Emergency Fund", fundId: "emergency", amount: "$150.00", date: "Today, 2:30 PM", status: "confirmed" as const },
  { id: 2, member: "Bob Smith", fund: "Annual Dues", fundId: "annual", amount: "$75.00", date: "Today, 11:15 AM", status: "pending" as const },
  { id: 3, member: "Carol White", fund: "Building Fund", fundId: "building", amount: "$200.00", date: "Yesterday", status: "confirmed" as const },
  { id: 4, member: "David Brown", fund: "Emergency Fund", fundId: "emergency", amount: "$100.00", date: "Yesterday", status: "confirmed" as const },
  { id: 5, member: "Eve Davis", fund: "Annual Dues", fundId: "annual", amount: "$75.00", date: "Dec 30, 2025", status: "pending" as const },
];

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

  const selectedFundName = funds.find((f) => f.id === selectedFund)?.name || "All Funds";

  const filteredContributions = selectedFund === "all"
    ? recentContributions
    : recentContributions.filter((c) => c.fundId === selectedFund);

  const stats = useMemo(() => {
    return fundStats[selectedFund as keyof typeof fundStats] || fundStats.all;
  }, [selectedFund]);

  return (
    <AppLayout>
      {/* Header with Logo and Fund Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          {/* Custom Group Logo */}
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber to-gold flex items-center justify-center shrink-0 shadow-md">
            <span className="text-lg font-bold text-white">CG</span>
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
            {funds.map((fund) => (
              <SelectItem key={fund.id} value={fund.id}>
                {fund.name}
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
