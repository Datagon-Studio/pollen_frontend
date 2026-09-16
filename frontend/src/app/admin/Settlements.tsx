import { useState, useEffect, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Column, SortDirection } from "@/components/ui/data-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePagination } from "@/hooks/usePagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
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
import {
  Search,
  Download,
  Plus,
  MoreVertical,
  Check,
  X,
  Pencil,
  Archive,
  ArchiveRestore,
  FolderOpen,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecordSettlementModal } from "@/components/modals/RecordSettlementModal";
import { EditSettlementModal } from "@/components/modals/EditSettlementModal";
import { ArchiveSettlementModal } from "@/components/modals/ArchiveSettlementModal";
import { fundSettlementApi, FundSettlement, FundSettlementStatus } from "@/services/fund-settlement.api";
import { fundApi, Fund } from "@/services";
import { configApi } from "@/services/config.api";
import { useToast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@/lib/currencies";

interface SettlementRow {
  settlement_id: string;
  date: string;
  dateValue: Date;
  fundName: string;
  fundId: string;
  amount: string;
  amountValue: number;
  status: FundSettlementStatus;
  reference: string;
  notes: string;
  isArchived: boolean;
}

export default function Settlements() {
  const { toast } = useToast();
  const [settlements, setSettlements] = useState<FundSettlement[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [fundFilter, setFundFilter] = useState("all");
  const [showRecord, setShowRecord] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState<FundSettlement | null>(null);
  const [archivingSettlement, setArchivingSettlement] = useState<FundSettlement | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currencyCode, setCurrencyCode] = useState<string>("GHS");

  const formatAmount = useCallback((amount: number) => {
    return `${getCurrencySymbol(currencyCode)}${amount.toFixed(2)}`;
  }, [currencyCode]);

  const loadSettlements = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fundSettlementApi.getAll();
      setSettlements(data || []);
    } catch (error) {
      console.error("Failed to load settlements:", error);
      setSettlements([]);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load settlements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadFunds = useCallback(async () => {
    try {
      const data = await fundApi.getAll();
      setFunds(data || []);
    } catch (error) {
      console.error("Failed to load funds:", error);
      setFunds([]);
    }
  }, []);

  useEffect(() => {
    loadSettlements();
    loadFunds();
    configApi
      .getMyConfig()
      .then((cfg) => setCurrencyCode(cfg.currency_code || "GHS"))
      .catch(() => setCurrencyCode("GHS"));
  }, [loadSettlements, loadFunds]);

  const handleMarkSuccessful = useCallback(async (settlement: FundSettlement) => {
    try {
      await fundSettlementApi.markSuccessful(settlement.settlement_id);
      toast({
        title: "Settlement Successful",
        description: `${formatAmount(Number(settlement.amount))} for ${settlement.fund_name} has been marked successful.`,
      });
      await loadSettlements();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark settlement as successful",
        variant: "destructive",
      });
    }
  }, [formatAmount, loadSettlements, toast]);

  const handleCancel = useCallback(async (settlement: FundSettlement) => {
    try {
      await fundSettlementApi.cancel(settlement.settlement_id);
      toast({
        title: "Settlement Canceled",
        description: `${settlement.fund_name} settlement has been canceled.`,
      });
      await loadSettlements();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel settlement",
        variant: "destructive",
      });
    }
  }, [loadSettlements, toast]);

  const handleRestore = useCallback(async (settlement: FundSettlement) => {
    try {
      await fundSettlementApi.unarchive(settlement.settlement_id);
      toast({
        title: "Settlement Restored",
        description: `${settlement.fund_name} settlement is no longer archived.`,
      });
      await loadSettlements();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to restore settlement",
        variant: "destructive",
      });
    }
  }, [loadSettlements, toast]);

  const handleSort = (column: string, direction: SortDirection) => {
    setSortColumn(direction ? column : null);
    setSortDirection(direction);
  };

  const settlementRows: SettlementRow[] = useMemo(() => {
    return settlements.map((s) => {
      const dateValue = s.settlement_date ? new Date(s.settlement_date) : new Date();
      return {
        settlement_id: s.settlement_id,
        date: format(dateValue, "MMM d, yyyy"),
        dateValue,
        fundName: s.fund_name || "",
        fundId: s.fund_id,
        amount: formatAmount(Number(s.amount)),
        amountValue: Number(s.amount) || 0,
        status: s.status,
        reference: s.reference || "",
        notes: s.notes || "",
        isArchived: s.is_archived,
      };
    });
  }, [settlements, formatAmount]);

  const columns: Column<SettlementRow>[] = useMemo(() => [
    {
      key: "date",
      header: "Date",
      className: "text-muted-foreground",
      sortable: true,
    },
    {
      key: "fundName",
      header: "Fund",
      sortable: true,
      render: (item) => (
        <span className="font-medium text-foreground">{item.fundName}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right font-semibold",
      sortable: true,
    },
    {
      key: "reference",
      header: "Reference",
      sortable: false,
      render: (item) => (
        <span className="text-sm text-muted-foreground">{item.reference || "—"}</span>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      sortable: false,
      render: (item) => (
        <span className="text-sm text-muted-foreground">{item.notes || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => {
        const badgeStatus =
          item.status === "successful"
            ? "successful"
            : item.status === "canceled"
              ? "canceled"
              : "pending";
        return (
          <div className="flex items-center gap-2">
            <StatusBadge status={badgeStatus} />
            {item.isArchived && <StatusBadge status="inactive" label="Archived" />}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (item) => {
        const settlement = settlements.find((s) => s.settlement_id === item.settlement_id);
        if (!settlement) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              {!settlement.is_archived && settlement.status === "pending" && (
                <>
                  <DropdownMenuItem
                    className="text-success"
                    onClick={() => handleMarkSuccessful(settlement)}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mark Successful
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleCancel(settlement)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEditingSettlement(settlement)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                </>
              )}
              {settlement.is_archived ? (
                <DropdownMenuItem onClick={() => handleRestore(settlement)}>
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setArchivingSettlement(settlement)}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [settlements, handleMarkSuccessful, handleCancel, handleRestore]);

  const filteredSettlements = useMemo(() => {
    const filtered = settlementRows.filter((s) => {
      const matchesSearch =
        s.fundName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.notes.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFund = fundFilter === "all" || s.fundId === fundFilter;

      let matchesTab = true;
      if (activeTab === "all") {
        matchesTab = !s.isArchived;
      } else if (activeTab === "archived") {
        matchesTab = s.isArchived;
      } else {
        matchesTab = !s.isArchived && s.status === activeTab;
      }

      return matchesSearch && matchesFund && matchesTab;
    });

    if (sortColumn && sortDirection && filtered.length > 0) {
      return [...filtered].sort((a, b) => {
        let comparison = 0;
        switch (sortColumn) {
          case "date":
            comparison = a.dateValue.getTime() - b.dateValue.getTime();
            break;
          case "fundName":
            comparison = a.fundName.localeCompare(b.fundName);
            break;
          case "amount":
            comparison = a.amountValue - b.amountValue;
            break;
          case "status":
            comparison = a.status.localeCompare(b.status);
            break;
          default:
            return 0;
        }
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [settlementRows, searchQuery, activeTab, fundFilter, sortColumn, sortDirection]);

  const pagination = usePagination(
    filteredSettlements,
    12,
    `${activeTab}|${searchQuery}|${fundFilter}|${sortColumn}|${sortDirection}`
  );

  const activeSettlements = settlements.filter((s) => !s.is_archived);
  const pendingSettlements = activeSettlements.filter((s) => s.status === "pending");
  const successfulSettlements = activeSettlements.filter((s) => s.status === "successful");
  const canceledSettlements = activeSettlements.filter((s) => s.status === "canceled");
  const archivedSettlements = settlements.filter((s) => s.is_archived);

  const pendingAmount = pendingSettlements.reduce((sum, s) => sum + Number(s.amount), 0);
  const successfulAmount = successfulSettlements.reduce((sum, s) => sum + Number(s.amount), 0);

  const fundOptions = [
    { id: "all", fundName: "All Funds" },
    ...funds.map((f) => ({ id: f.fund_id, fundName: f.fund_name })),
  ];

  const handleExportToExcel = () => {
    try {
      const exportData = filteredSettlements.map((s) => ({
        Date: s.date,
        Fund: s.fundName,
        Amount: s.amount,
        Status: s.status,
        Reference: s.reference || "—",
        Notes: s.notes || "—",
        Archived: s.isArchived ? "Yes" : "No",
      }));

      if (exportData.length === 0) {
        throw new Error("No settlements to export");
      }

      const headers = Object.keys(exportData[0]);
      const escapeValue = (value: unknown) => {
        const str = String(value ?? "");
        return `"${str.replace(/"/g, '""')}"`;
      };

      const csvRows = [
        headers.join(","),
        ...exportData.map((row) =>
          headers.map((header) => escapeValue((row as Record<string, unknown>)[header])).join(",")
        ),
      ];

      const csvContent = csvRows.join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `settlements_${format(new Date(), "yyyy-MM-dd")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} settlements`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export settlements",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Settlements"
        description="Manually record fund payouts and track settlement status"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToExcel}
              disabled={filteredSettlements.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button size="sm" onClick={() => setShowRecord(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Record Settlement
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Successful"
          value={loading ? "..." : formatAmount(successfulAmount)}
          subtitle={`${successfulSettlements.length} completed payout${successfulSettlements.length === 1 ? "" : "s"}`}
          icon={CheckCircle2}
          accentBorder
        />
        <StatCard
          title="Pending"
          value={loading ? "..." : formatAmount(pendingAmount)}
          subtitle={`${pendingSettlements.length} awaiting payout`}
          icon={Clock}
          accentBorder
        />
        <StatCard
          title="Canceled"
          value={loading ? "..." : String(canceledSettlements.length)}
          subtitle="Canceled settlement requests"
          icon={X}
          accentBorder
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList className="bg-secondary flex-wrap h-auto">
            <TabsTrigger value="all">All ({activeSettlements.length})</TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:text-amber">
              Pending ({pendingSettlements.length})
            </TabsTrigger>
            <TabsTrigger value="successful">Successful ({successfulSettlements.length})</TabsTrigger>
            <TabsTrigger value="canceled">Canceled ({canceledSettlements.length})</TabsTrigger>
            <TabsTrigger value="archived">Archived ({archivedSettlements.length})</TabsTrigger>
          </TabsList>

          <div className="flex gap-3">
            <Select value={fundFilter} onValueChange={setFundFilter}>
              <SelectTrigger className="w-[180px]">
                <FolderOpen className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by fund" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {fundOptions.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>
                    {fund.fundName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search settlements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </Tabs>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading settlements...</div>
      ) : filteredSettlements.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {settlements.length === 0
            ? "No settlements yet. Record a payout against a fund to get started."
            : "No settlements match the current filters."}
        </div>
      ) : (
        <>
          <DataTable
            columns={columns as any}
            data={pagination.paginatedItems as any}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <TablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            onPageChange={pagination.setPage}
          />
        </>
      )}

      <RecordSettlementModal
        open={showRecord}
        onOpenChange={setShowRecord}
        onSuccess={() => {
          setShowRecord(false);
          loadSettlements();
        }}
      />
      <EditSettlementModal
        open={!!editingSettlement}
        onOpenChange={(open) => {
          if (!open) setEditingSettlement(null);
        }}
        settlement={editingSettlement}
        onSuccess={() => {
          setEditingSettlement(null);
          loadSettlements();
        }}
      />
      <ArchiveSettlementModal
        open={!!archivingSettlement}
        onOpenChange={(open) => {
          if (!open) setArchivingSettlement(null);
        }}
        settlement={archivingSettlement}
        onSuccess={() => {
          setArchivingSettlement(null);
          loadSettlements();
        }}
      />
    </AppLayout>
  );
}
