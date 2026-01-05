import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HandCoins, Search, Download, MoreHorizontal, Check, X, FolderOpen, Monitor, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecordContributionModal } from "@/components/modals/RecordContributionModal";

const funds = [
  { id: "all", fundName: "All Funds" },
  { id: "emergency", fundName: "Emergency Fund" },
  { id: "annual", fundName: "Annual Dues" },
  { id: "building", fundName: "Building Fund" },
  { id: "youth", fundName: "Youth Program" },
  { id: "scholarship", fundName: "Scholarship Fund" },
];

// Contribution model based on spec
interface Contribution {
  id: number;
  dateReceived: string;
  memberName: string;
  fundName: string;
  fundId: string;
  amount: string;
  channel: "offline" | "online";
  paymentMethod: string;
  status: "pending" | "confirmed";
  comment: string;
  paymentReference: string | null;
}

const contributions: Contribution[] = [
  { id: 1, dateReceived: "Jan 2, 2026", memberName: "Alice Johnson", fundName: "Emergency Fund", fundId: "emergency", amount: "$150.00", channel: "online", paymentMethod: "Bank Transfer", status: "confirmed", comment: "", paymentReference: "TXN-001234" },
  { id: 2, dateReceived: "Jan 2, 2026", memberName: "Bob Smith", fundName: "Annual Dues", fundId: "annual", amount: "$75.00", channel: "offline", paymentMethod: "Cash", status: "pending", comment: "Paid at meeting", paymentReference: null },
  { id: 3, dateReceived: "Jan 1, 2026", memberName: "Carol White", fundName: "Building Fund", fundId: "building", amount: "$200.00", channel: "online", paymentMethod: "Mobile Money", status: "confirmed", comment: "", paymentReference: "TXN-001235" },
  { id: 4, dateReceived: "Jan 1, 2026", memberName: "David Brown", fundName: "Emergency Fund", fundId: "emergency", amount: "$100.00", channel: "online", paymentMethod: "Bank Transfer", status: "confirmed", comment: "", paymentReference: "TXN-001236" },
  { id: 5, dateReceived: "Dec 30, 2025", memberName: "Eve Davis", fundName: "Annual Dues", fundId: "annual", amount: "$75.00", channel: "offline", paymentMethod: "Cash", status: "pending", comment: "Will confirm receipt", paymentReference: null },
  { id: 6, dateReceived: "Dec 29, 2025", memberName: "Frank Miller", fundName: "Youth Program", fundId: "youth", amount: "$50.00", channel: "offline", paymentMethod: "Cheque", status: "confirmed", comment: "Cheque #1234", paymentReference: null },
  { id: 7, dateReceived: "Dec 28, 2025", memberName: "Grace Lee", fundName: "Scholarship Fund", fundId: "scholarship", amount: "$100.00", channel: "online", paymentMethod: "Mobile Money", status: "confirmed", comment: "", paymentReference: "TXN-001237" },
  { id: 8, dateReceived: "Dec 27, 2025", memberName: "Henry Wilson", fundName: "Building Fund", fundId: "building", amount: "$200.00", channel: "online", paymentMethod: "Bank Transfer", status: "confirmed", comment: "", paymentReference: "TXN-001238" },
  { id: 9, dateReceived: "Dec 26, 2025", memberName: "Ivy Chen", fundName: "Emergency Fund", fundId: "emergency", amount: "$150.00", channel: "offline", paymentMethod: "Cash", status: "confirmed", comment: "Collected by treasurer", paymentReference: null },
  { id: 10, dateReceived: "Dec 25, 2025", memberName: "Jack Taylor", fundName: "Annual Dues", fundId: "annual", amount: "$75.00", channel: "online", paymentMethod: "Mobile Money", status: "confirmed", comment: "", paymentReference: "TXN-001239" },
];

const columns = [
  {
    key: "dateReceived",
    header: "Date Received",
    className: "text-muted-foreground",
  },
  {
    key: "memberName",
    header: "Member",
    render: (item: Contribution) => (
      <span className="font-medium text-foreground">{item.memberName}</span>
    ),
  },
  {
    key: "fundName",
    header: "Fund",
  },
  {
    key: "amount",
    header: "Amount",
    className: "text-right font-semibold",
  },
  {
    key: "comment",
    header: "Comment",
    render: (item: Contribution) => (
      <span className="text-sm text-muted-foreground">{item.comment || "—"}</span>
    ),
  },
  {
    key: "paymentMethod",
    header: "Method",
    render: (item: Contribution) => (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-secondary text-secondary-foreground">
        {item.paymentMethod}
      </span>
    ),
  },
  {
    key: "channel",
    header: "Channel",
    render: (item: Contribution) => (
      <div className="flex items-center gap-1.5">
        {item.channel === "online" ? (
          <>
            <Monitor className="h-3.5 w-3.5 text-success" />
            <span className="text-xs text-success">Online</span>
          </>
        ) : (
          <>
            <User className="h-3.5 w-3.5 text-amber" />
            <span className="text-xs text-amber">Offline</span>
          </>
        )}
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (item: Contribution) => <StatusBadge status={item.status as "pending" | "confirmed"} />,
  },
  {
    key: "actions",
    header: "",
    className: "w-12",
    render: (item: Contribution) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-card border-border">
          <DropdownMenuItem>View Details</DropdownMenuItem>
          {item.status === "pending" && (
            <>
              <DropdownMenuItem className="text-success">
                <Check className="h-4 w-4 mr-2" />
                Confirm
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <X className="h-4 w-4 mr-2" />
                Reject
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem>Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export default function Contributions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [fundFilter, setFundFilter] = useState("all");
  const [showRecordContribution, setShowRecordContribution] = useState(false);

  const filteredContributions = contributions.filter((c) => {
    const matchesSearch =
      c.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.fundName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "pending" && c.status === "pending") ||
      (activeTab === "confirmed" && c.status === "confirmed");
    const matchesFund = fundFilter === "all" || c.fundId === fundFilter;
    return matchesSearch && matchesTab && matchesFund;
  });

  const pendingCount = contributions.filter((c) => c.status === "pending").length;
  const confirmedCount = contributions.filter((c) => c.status === "confirmed").length;
  const pendingAmount = contributions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + parseFloat(c.amount.replace("$", "")), 0);

  return (
    <AppLayout>
      <PageHeader
        title="Contributions"
        description="Track and manage all member contributions"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" onClick={() => setShowRecordContribution(true)}>
              <HandCoins className="h-4 w-4 mr-2" />
              Record Contribution
            </Button>
          </div>
        }
      />

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <div className="bg-amber/5 border border-amber/30 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">
                {pendingCount} contributions awaiting confirmation
              </p>
              <p className="text-sm text-muted-foreground">
                Total pending: ${pendingAmount.toFixed(2)}
              </p>
            </div>
            <Button variant="outline" size="sm" className="border-amber text-amber hover:bg-amber/10">
              Review All
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList className="bg-secondary">
            <TabsTrigger value="all">
              All ({contributions.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:text-amber">
              Pending ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="confirmed">
              Confirmed ({confirmedCount})
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-3">
            {/* Fund Filter */}
            <Select value={fundFilter} onValueChange={setFundFilter}>
              <SelectTrigger className="w-[180px]">
                <FolderOpen className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by fund" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {funds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>
                    {fund.fundName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contributions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </Tabs>

      <DataTable
        columns={columns as any}
        data={filteredContributions as any}
        rowClassName={(item: any) =>
          item.status === "pending" ? "border-l-2 border-l-amber" : ""
        }
      />

      <RecordContributionModal open={showRecordContribution} onOpenChange={setShowRecordContribution} />
    </AppLayout>
  );
}
