import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import {
  Plus,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  WalletCards,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useAccount } from "@/hooks/useAccount";
import { useToast } from "@/hooks/use-toast";
import { configApi } from "@/services/config.api";
import { managerApi, ManagerFund } from "@/services/manager.api";
import {
  SettlementRequest,
  SettlementRequestStatus,
  settlementRequestApi,
} from "@/services/settlement-request.api";
import { SettlementRequestModal } from "@/components/modals/SettlementRequestModal";
import { getCurrencySymbol } from "@/lib/currencies";

const statuses: Array<"all" | SettlementRequestStatus> = [
  "all",
  "pending",
  "approved",
  "rejected",
  "disbursed",
];

const statusLabels: Record<"all" | SettlementRequestStatus, string> = {
  all: "All",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  disbursed: "Disbursed",
};

export default function Settlements() {
  const { user } = useAuth();
  const { account } = useAccount(user?.id);
  const { toast } = useToast();
  const [requests, setRequests] = useState<SettlementRequest[]>([]);
  const [funds, setFunds] = useState<ManagerFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | SettlementRequestStatus>("all");
  const [search, setSearch] = useState("");
  const [currencyCode, setCurrencyCode] = useState("GHS");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [requestData, fundData] = await Promise.all([
        settlementRequestApi.list(),
        managerApi.getFunds(),
      ]);
      setRequests(requestData);
      setFunds(fundData);
    } catch (error) {
      toast({
        title: "Unable to load settlement requests",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!user?.id) return;
    loadData();
    configApi
      .getMyConfig()
      .then((config) => setCurrencyCode(config.currency_code || "GHS"))
      .catch(() => setCurrencyCode("GHS"));
  }, [loadData, user?.id]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === "all" || request.status === statusFilter;
      const matchesSearch =
        !query ||
        request.account_name.toLowerCase().includes(query) ||
        request.fund_name.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [requests, search, statusFilter]);

  const amountFor = (status: SettlementRequestStatus) =>
    requests
      .filter((request) => request.status === status)
      .reduce((sum, request) => sum + Number(request.amount), 0);

  const formatAmount = (amount: number) =>
    `${getCurrencySymbol(currencyCode)}${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const hasActiveFilters = statusFilter !== "all" || search.trim().length > 0;
  const clearFilters = () => {
    setStatusFilter("all");
    setSearch("");
  };

  return (
    <AppLayout>
      <PageHeader
        title="Settlement requests"
        description="Request payouts from Pollean and follow each admin review."
        actions={
          <Button
            size="sm"
            onClick={() => setShowRequestForm(true)}
            disabled={!account?.account_id}
          >
            <Plus className="h-4 w-4 mr-2" />
            Request settlement
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Pending"
          value={formatAmount(amountFor("pending"))}
          subtitle={`${requests.filter((item) => item.status === "pending").length} requests`}
          icon={Clock}
          accentBorder
        />
        <StatCard
          title="Approved"
          value={formatAmount(amountFor("approved"))}
          subtitle={`${requests.filter((item) => item.status === "approved").length} requests`}
          icon={CheckCircle2}
          accentBorder
        />
        <StatCard
          title="Rejected"
          value={requests.filter((item) => item.status === "rejected").length.toString()}
          subtitle="Requests not approved"
          icon={XCircle}
          accentBorder
        />
        <StatCard
          title="Disbursed"
          value={formatAmount(amountFor("disbursed"))}
          subtitle={`${requests.filter((item) => item.status === "disbursed").length} payouts`}
          icon={Send}
          accentBorder
        />
      </div>

      <div className="mb-5 rounded-xl border bg-card/70 p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Filter settlement requests by status"
          >
            {statuses.map((status) => (
              <Button
                key={status}
                size="sm"
                variant="ghost"
                onClick={() => setStatusFilter(status)}
                aria-pressed={statusFilter === status}
                className={`h-8 rounded-full border px-3 text-xs font-medium shadow-none transition-colors ${
                  statusFilter === status
                    ? "border-primary/40 bg-primary/15 text-foreground hover:bg-primary/20"
                    : "border-transparent text-muted-foreground hover:border-border hover:bg-background hover:text-foreground"
                }`}
              >
                {statusLabels[status]}
                <span
                  className={`ml-1.5 tabular-nums ${
                    statusFilter === status
                      ? "text-foreground/70"
                      : "text-muted-foreground/70"
                  }`}
                >
                  {status === "all"
                    ? requests.length
                    : requests.filter((request) => request.status === status).length}
                </span>
              </Button>
            ))}
          </div>
          <div className="relative w-full lg:w-80 lg:shrink-0">
            <label htmlFor="settlement-search" className="sr-only">
              Search settlement requests
            </label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="settlement-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search account or fund"
              className="h-9 rounded-lg bg-background pl-9 pr-3"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-3 font-medium">Requested</th>
                  <th className="text-left p-3 font-medium">Account</th>
                  <th className="text-left p-3 font-medium">Fund</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                  <th className="text-left p-3 font-medium">Payment destination</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((request) => (
                  <tr key={request.request_id} className="hover:bg-muted/20">
                    <td className="p-3 text-muted-foreground">
                      {format(new Date(request.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="p-3 font-medium">{request.account_name}</td>
                    <td className="p-3">{request.fund_name}</td>
                    <td className="p-3 text-right font-semibold">
                      {formatAmount(Number(request.amount))}
                    </td>
                    <td className="p-3">
                      <p>{request.destination_account_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.destination_bank_name || request.destination_provider} ·
                        {" "}{request.destination_account_number}
                      </p>
                    </td>
                    <td className="p-3">
                      <StatusBadge status={request.status} />
                      {request.admin_note && (
                        <p className="text-xs text-muted-foreground mt-1 max-w-56">
                          {request.admin_note}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {loading && (
          <div className="flex min-h-56 items-center justify-center p-10 text-sm text-muted-foreground">
            Loading settlement requests…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              {hasActiveFilters ? (
                <Search className="h-5 w-5" />
              ) : (
                <WalletCards className="h-5 w-5" />
              )}
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {hasActiveFilters
                ? "No matching settlement requests"
                : "No settlement requests yet"}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Try another account or fund name, or clear the current filters."
                : "Request a payout from an eligible fund. You can follow the admin review and payment status here."}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" className="mt-5" onClick={clearFilters}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Clear filters
              </Button>
            ) : (
              <Button
                size="sm"
                className="mt-5"
                onClick={() => setShowRequestForm(true)}
                disabled={!account?.account_id}
              >
                <Plus className="mr-2 h-4 w-4" />
                Request settlement
              </Button>
            )}
          </div>
        )}
      </div>

      {account && (
        <SettlementRequestModal
          open={showRequestForm}
          onOpenChange={setShowRequestForm}
          accountId={account.account_id}
          accountName={account.account_name || "Current account"}
          funds={funds}
          currencyCode={currencyCode}
          onSuccess={loadData}
        />
      )}
    </AppLayout>
  );
}
