import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Column, SortDirection } from "@/components/ui/data-table";
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
import { HandCoins, Search, Download, MoreHorizontal, Check, X, FolderOpen, Monitor, User, Trash2 } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecordContributionModal } from "@/components/modals/RecordContributionModal";
import { EditContributionModal } from "@/components/modals/EditContributionModal";
import { DeleteContributionModal } from "@/components/modals/DeleteContributionModal";
import { contributionApi, ContributionWithDetails } from "@/services/contribution.api";
import { fundApi, Fund } from "@/services";
import { useAccount } from "@/hooks/useAccount";
import { configApi } from "@/services/config.api";
import { useToast } from "@/hooks/use-toast";

// Simple cache with TTL
const cache = {
  contributions: null as ContributionWithDetails[] | null,
  contributionsTimestamp: 0,
  funds: null as Fund[] | null,
  fundsTimestamp: 0,
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
};

interface ContributionRow {
  contribution_id: string;
  dateReceived: string;
  dateValue: Date;
  memberName: string;
  fundName: string;
  fundId: string;
  amount: string;
  amountValue: number;
  channel: "offline" | "online";
  paymentMethod: string | null;
  status: "pending" | "confirmed" | "failed" | "reversed" | "pledge";
  comment: string;
  paymentReference: string | null;
}

// Columns will be defined inside component to access handlers

export default function Contributions() {
  const { account } = useAccount();
  const { toast } = useToast();
  const [contributions, setContributions] = useState<ContributionWithDetails[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [fundFilter, setFundFilter] = useState("all");
  const [showRecordContribution, setShowRecordContribution] = useState(false);
  const [editingContribution, setEditingContribution] = useState<ContributionWithDetails | null>(null);
  const [deletingContribution, setDeletingContribution] = useState<ContributionWithDetails | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>("dateReceived");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const abortControllerRef = useRef<AbortController | null>(null);
  const [currencyCode, setCurrencyCode] = useState<string>("GHS");

  const formatAmount = useCallback((amount: number) => {
    const prefix = currencyCode === "GHS" ? "GH₵" : `${currencyCode} `;
    return `${prefix}${amount.toFixed(2)}`;
  }, [currencyCode]);

  // Load contributions with caching
  const loadContributions = useCallback(async (forceRefresh = false) => {
    if (!account?.account_id) return;
    
    const now = Date.now();
    const cacheKey = activeTab === "pending" ? "pending" : "all";
    
    // Use cache if valid and not forcing refresh
    if (!forceRefresh && cache.contributions && (now - cache.contributionsTimestamp) < cache.CACHE_TTL) {
      setContributions(cache.contributions);
      setLoading(false);
      return;
    }
    
    try {
      if (!forceRefresh) setLoading(true);
      
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      const response = activeTab === "pending" 
        ? await contributionApi.getPending(account.account_id)
        : await contributionApi.getByAccount(account.account_id);
      
      if (response.success && response.data) {
        setContributions(response.data);
        cache.contributions = response.data;
        cache.contributionsTimestamp = now;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      toast({
        title: "Error",
        description: "Failed to load contributions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [account?.account_id, activeTab, toast]);

  // Load funds with caching
  const loadFunds = useCallback(async (forceRefresh = false) => {
    if (!account?.account_id) {
      setFunds([]);
      return;
    }
    
    const now = Date.now();
    
    // Use cache if valid and not forcing refresh
    if (!forceRefresh && cache.funds && (now - cache.fundsTimestamp) < cache.CACHE_TTL) {
      setFunds(cache.funds);
      return;
    }
    
    try {
      const data = await fundApi.getAll();
      if (Array.isArray(data)) {
        setFunds(data);
        cache.funds = data;
        cache.fundsTimestamp = now;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load funds";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [account?.account_id, toast]);

  useEffect(() => {
    if (account?.account_id) {
      loadContributions();
      // Load currency config once for this account
      configApi.getMyConfig()
        .then((cfg) => setCurrencyCode(cfg.currency_code || "GHS"))
        .catch(() => setCurrencyCode("GHS"));
    }
  }, [account?.account_id, activeTab, loadContributions]);

  useEffect(() => {
    if (account?.account_id) {
      loadFunds();
    }
  }, [account?.account_id, loadFunds]);

  // Optimistic update handlers
  const handleConfirm = useCallback(async (id: string) => {
    const contribution = contributions.find(c => c.contribution_id === id);
    if (!contribution) return;

    // Optimistic update
    const previousContributions = [...contributions];
    setContributions(prev => prev.map(c => 
      c.contribution_id === id ? { ...c, status: 'confirmed' as const } : c
    ));

    try {
      const response = await contributionApi.confirm(id);
      if (response.success) {
        // Invalidate cache and refresh silently
        cache.contributions = null;
        loadContributions(true);
      } else {
        // Rollback on error
        setContributions(previousContributions);
        throw new Error(response.error || "Failed to confirm contribution");
      }
    } catch (error) {
      // Rollback on error
      setContributions(previousContributions);
      const errorMessage = error instanceof Error ? error.message : "Failed to confirm contribution";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [contributions, loadContributions, toast]);

  const handleReject = useCallback(async (id: string) => {
    const contribution = contributions.find(c => c.contribution_id === id);
    if (!contribution) return;

    // Optimistic update
    const previousContributions = [...contributions];
    setContributions(prev => prev.map(c => 
      c.contribution_id === id ? { ...c, status: 'failed' as const } : c
    ));

    try {
      const response = await contributionApi.reject(id);
      if (response.success) {
        // Invalidate cache and refresh silently
        cache.contributions = null;
        loadContributions(true);
      } else {
        // Rollback on error
        setContributions(previousContributions);
        throw new Error(response.error || "Failed to reject contribution");
      }
    } catch (error) {
      // Rollback on error
      setContributions(previousContributions);
      const errorMessage = error instanceof Error ? error.message : "Failed to reject contribution";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [contributions, loadContributions, toast]);

  const handleViewDetails = useCallback((id: string) => {
    const contribution = contributions.find(c => c.contribution_id === id);
    if (contribution) {
      toast({
        title: "Contribution Details",
        description: (
          <div className="space-y-1 text-sm">
            <p><strong>Member:</strong> {contribution.member_name || "Anonymous"}</p>
            <p><strong>Fund:</strong> {contribution.fund_name}</p>
            <p><strong>Amount:</strong> {formatAmount(contribution.amount)}</p>
            <p><strong>Payment Method:</strong> {contribution.payment_method || contribution.channel}</p>
            <p><strong>Date:</strong> {format(new Date(contribution.date_received), "PPP")}</p>
            {contribution.comment && <p><strong>Comment:</strong> {contribution.comment}</p>}
            {contribution.payment_reference && <p><strong>Reference:</strong> {contribution.payment_reference}</p>}
          </div>
        ),
      });
    }
  }, [contributions, toast]);

  const handleEdit = useCallback((id: string) => {
    const contribution = contributions.find(c => c.contribution_id === id);
    if (contribution) {
      setEditingContribution(contribution);
    }
  }, [contributions]);

  const handleDelete = useCallback((id: string) => {
    const contribution = contributions.find(c => c.contribution_id === id);
    if (contribution) {
      setDeletingContribution(contribution);
    }
  }, [contributions]);

  const handleSort = (column: string, direction: SortDirection) => {
    setSortColumn(direction ? column : null);
    setSortDirection(direction);
  };

  // Define columns inside component to access handlers
  const columns = useMemo(() => [
    {
      key: "dateReceived",
      header: "Date Received",
      className: "text-muted-foreground",
      sortable: true,
    },
    {
      key: "memberName",
      header: "Member",
      sortable: true,
      render: (item: ContributionRow) => (
        <span className="font-medium text-foreground">{item.memberName}</span>
      ),
    },
    {
      key: "fundName",
      header: "Fund",
      sortable: true,
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right font-semibold",
      sortable: true,
    },
    {
      key: "comment",
      header: "Comment",
      sortable: false,
      render: (item: ContributionRow) => (
        <span className="text-sm text-muted-foreground">{item.comment || "—"}</span>
      ),
    },
    {
      key: "channel",
      header: "Payment Method",
      sortable: false,
      render: (item: ContributionRow) => (
        <div className="flex items-center gap-1.5">
          {item.paymentMethod ? (
            <span className="text-xs font-medium text-foreground">{item.paymentMethod}</span>
          ) : item.channel === "online" ? (
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
      sortable: true,
      render: (item: ContributionRow) => {
        const badgeStatus =
          item.status === "confirmed"
            ? "confirmed"
            : item.status === "pending" || item.status === "pledge"
              ? "pending"
              : "rejected";
        return <StatusBadge status={badgeStatus} />;
      },
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (item: ContributionRow) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            <DropdownMenuItem onClick={() => handleViewDetails(item.contribution_id)}>
              View Details
            </DropdownMenuItem>
            {item.status === "pending" && (
              <>
                <DropdownMenuItem 
                  className="text-success"
                  onClick={() => handleConfirm(item.contribution_id)}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Confirm
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => handleReject(item.contribution_id)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={() => handleEdit(item.contribution_id)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => handleDelete(item.contribution_id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [handleViewDetails, handleConfirm, handleReject, handleEdit, handleDelete]);

  const contributionRows: ContributionRow[] = useMemo(() => {
    if (!contributions || contributions.length === 0) return [];
    
    return contributions.map((c) => {
      const dateValue = c.date_received ? new Date(c.date_received) : new Date();
      return {
        contribution_id: c.contribution_id,
        dateReceived: format(dateValue, "MMM d, yyyy"),
        dateValue: dateValue,
        memberName: c.member_name || "Anonymous",
        fundName: c.fund_name || "",
        fundId: c.fund_id,
        amount: formatAmount(c.amount),
        amountValue: c.amount || 0,
        channel: c.channel,
        paymentMethod: c.payment_method,
        status: c.status,
        comment: c.comment || "",
        paymentReference: c.payment_reference,
      };
    });
  }, [contributions, formatAmount]);

  const filteredContributions = useMemo(() => {
    if (!contributionRows || contributionRows.length === 0) return [];
    
    const filtered = contributionRows.filter((c) => {
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

    // Apply sorting
    if (sortColumn && sortDirection && filtered.length > 0) {
      return [...filtered].sort((a, b) => {
        let comparison = 0;
        try {
          switch (sortColumn) {
            case "dateReceived":
              comparison = a.dateValue.getTime() - b.dateValue.getTime();
              break;
            case "memberName":
              comparison = (a.memberName || "").localeCompare(b.memberName || "");
              break;
            case "fundName":
              comparison = (a.fundName || "").localeCompare(b.fundName || "");
              break;
            case "amount":
              comparison = (a.amountValue || 0) - (b.amountValue || 0);
              break;
            case "status":
              comparison = (a.status || "").localeCompare(b.status || "");
              break;
            default:
              return 0;
          }
        } catch (error) {
          console.error("Error sorting contributions:", error);
          return 0;
        }
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [contributionRows, searchQuery, activeTab, fundFilter, sortColumn, sortDirection]);

  const pendingCount = contributions.filter((c) => c.status === "pending").length;
  const confirmedCount = contributions.filter((c) => c.status === "confirmed").length;
  const pendingAmount = contributions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + c.amount, 0);

  const fundOptions = [
    { id: "all", fundName: "All Funds" },
    ...funds.map((f) => ({ id: f.fund_id, fundName: f.fund_name })),
  ];

  const handleExportToExcel = () => {
    try {
      const exportData = filteredContributions.map((contribution) => ({
        "Date Received": contribution.dateReceived,
        Member: contribution.memberName,
        Fund: contribution.fundName,
        Amount: contribution.amount,
        Comment: contribution.comment || "—",
        "Payment Method": contribution.paymentMethod || contribution.channel,
        Status: contribution.status,
        "Payment Reference": contribution.paymentReference || "—",
      }));

      if (exportData.length === 0) {
        throw new Error("No contributions to export");
      }

      const headers = Object.keys(exportData[0]);
      const escapeValue = (value: unknown) => {
        const str = String(value ?? "");
        const escaped = str.replace(/"/g, '""');
        return `"${escaped}"`;
      };

      const csvRows = [
        headers.join(","),
        ...exportData.map((row) =>
          headers.map((header) => escapeValue((row as any)[header])).join(",")
        ),
      ];

      const csvContent = csvRows.join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `contributions_${format(new Date(), "yyyy-MM-dd")}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} contributions`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description:
          error instanceof Error ? error.message : "Failed to export contributions",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Contributions"
        description="Track and manage all member contributions"
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportToExcel}
              disabled={filteredContributions.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
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
                Total pending: {formatAmount(pendingAmount)}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-amber text-amber hover:bg-amber/10"
              onClick={() => setActiveTab("pending")}
            >
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
                <SelectValue placeholder={funds.length > 0 ? "Filter by fund" : "Loading funds..."} />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {fundOptions.length > 0 ? (
                  fundOptions.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.fundName}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-funds" disabled>
                    No funds available
                  </SelectItem>
                )}
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

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading contributions...</div>
      ) : (
        <DataTable
          columns={columns as any}
          data={filteredContributions as any}
          rowClassName={(item: any) =>
            item.status === "pending" ? "border-l-2 border-l-amber" : ""
          }
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      )}

      <RecordContributionModal 
        open={showRecordContribution} 
        onOpenChange={setShowRecordContribution}
        onSuccess={() => {
          cache.contributions = null; // Invalidate cache
          loadContributions(true);
          loadFunds(true);
        }}
      />

      <EditContributionModal
        open={!!editingContribution}
        onOpenChange={(open) => !open && setEditingContribution(null)}
        contribution={editingContribution}
        onSuccess={() => {
          cache.contributions = null; // Invalidate cache
          loadContributions(true);
          setEditingContribution(null);
        }}
      />

      <DeleteContributionModal
        open={!!deletingContribution}
        onOpenChange={(open) => !open && setDeletingContribution(null)}
        contribution={deletingContribution}
        onSuccess={() => {
          cache.contributions = null; // Invalidate cache
          loadContributions(true);
          setDeletingContribution(null);
        }}
      />
    </AppLayout>
  );
}
