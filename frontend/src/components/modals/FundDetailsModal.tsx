import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { Wallet, TrendingUp, Users, Calendar, Loader2, Landmark, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { contributionApi, ContributionWithDetails } from "@/services/contribution.api";
import { fundSettlementApi, FundSettlement } from "@/services/fund-settlement.api";
import { settlementRequestApi, SettlementRequest } from "@/services/settlement-request.api";
import { format } from "date-fns";

interface Fund {
  id: string | number;
  name: string;
  status: "active" | "inactive";
  suggestedAmount: string;
  collected: number;
  target: number | null;
  contributors: number;
  description: string;
  recurring: boolean;
  isPublic?: boolean;
}

interface FundDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fund: Fund | null;
  currencyCode?: string;
  onEdit?: () => void;
}

// Recent contributions will be loaded from API if needed

export function FundDetailsModal({
  open,
  onOpenChange,
  fund,
  currencyCode = "GHS",
  onEdit,
}: FundDetailsModalProps) {
  const [contributions, setContributions] = useState<ContributionWithDetails[]>([]);
  const [settlements, setSettlements] = useState<FundSettlement[]>([]);
  const [disbursedRequests, setDisbursedRequests] = useState<SettlementRequest[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [contributionsLoaded, setContributionsLoaded] = useState(false);
  const [loadingSettlements, setLoadingSettlements] = useState(false);

  useEffect(() => {
    if (open && fund?.id) {
      setContributionsLoaded(false);
      loadContributions();
      loadSettlements();
    }
  }, [open, fund?.id]);

  const loadContributions = async () => {
    if (!fund?.id) return;
    
    try {
      setLoadingContributions(true);
      const response = await contributionApi.getByFund(String(fund.id));
      if (response.success && response.data) {
        setContributions(response.data);
      }
    } catch (error) {
      console.error("Failed to load contributions:", error);
    } finally {
      setLoadingContributions(false);
      setContributionsLoaded(true);
    }
  };

  const loadSettlements = async () => {
    if (!fund?.id) return;

    try {
      setLoadingSettlements(true);
      const [data, requests] = await Promise.all([
        fundSettlementApi.getByFund(String(fund.id)),
        settlementRequestApi.list().catch(() => [] as SettlementRequest[]),
      ]);
      setSettlements(data || []);
      setDisbursedRequests(
        requests.filter(
          (request) => request.fund_id === String(fund.id) && request.status === "disbursed"
        )
      );
    } catch (error) {
      console.error("Failed to load settlements:", error);
      setSettlements([]);
      setDisbursedRequests([]);
    } finally {
      setLoadingSettlements(false);
    }
  };

  if (!fund) return null;

  const progress = fund.target ? (fund.collected / fund.target) * 100 : null;
  const isComplete = progress !== null && progress >= 100;
  const confirmedContributions = contributions
    .filter(c => c.status === 'confirmed')
    .sort((a, b) => new Date(b.date_received).getTime() - new Date(a.date_received).getTime());
  const recentContributions = confirmedContributions.slice(0, 5);
  const contributorCount = new Set(
    confirmedContributions.map((contribution) => contribution.member_id).filter(Boolean)
  ).size;
  const settlementHistory = settlements
    .filter((s) => !s.is_archived)
    .sort((a, b) => new Date(b.settlement_date).getTime() - new Date(a.settlement_date).getTime())
    .slice(0, 5);
  const recordedDisbursed = settlements
    .filter((settlement) => !settlement.is_archived && settlement.status === "successful")
    .reduce((sum, settlement) => sum + Number(settlement.amount), 0);
  const requestedDisbursed = disbursedRequests.reduce(
    (sum, request) => sum + Number(request.amount),
    0
  );
  const totalDisbursed = recordedDisbursed + requestedDisbursed;
  const formatAmount = (amount: number) =>
    `${currencyCode} ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-md bg-amber/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-amber" />
              </div>
              <div>
                <DialogTitle className="text-xl">{fund.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  {fund.recurring && (
                    <span className="text-xs bg-gold/20 text-gold-dark px-2 py-0.5 rounded">
                      Recurring
                    </span>
                  )}
                  <StatusBadge status={fund.status} />
                  {fund.isPublic !== undefined && (
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded",
                      fund.isPublic 
                        ? "bg-blue/20 text-blue-dark" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {fund.isPublic ? "Public" : "Private"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Description */}
          <p className="text-sm text-muted-foreground">{fund.description}</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Collected</span>
              </div>
              <p className="text-xl font-semibold text-foreground">
                {formatAmount(fund.collected)}
              </p>
              {fund.target && (
                <p className="text-xs text-muted-foreground">
                  of {formatAmount(fund.target)} target
                </p>
              )}
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Banknote className="h-4 w-4" />
                <span className="text-xs">Disbursed</span>
              </div>
              <p className="text-xl font-semibold text-foreground">
                {loadingSettlements ? "—" : formatAmount(totalDisbursed)}
              </p>
              <p className="text-xs text-muted-foreground">paid out from this fund</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs">Contributors</span>
              </div>
              <p className="text-xl font-semibold text-foreground">
                {contributionsLoaded ? contributorCount : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {contributorCount === 1 ? "person" : "people"}
              </p>
            </div>
          </div>

          {/* Progress Bar (only for non-recurring) */}
          {progress !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-foreground">{progress.toFixed(1)}%</span>
              </div>
              <Progress
                value={Math.min(progress, 100)}
                className={cn(
                  "h-3",
                  isComplete ? "[&>div]:bg-success" : "[&>div]:bg-amber"
                )}
              />
            </div>
          )}

          {/* Suggested Amount */}
          <div className="flex items-center justify-between py-3 border-t border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Suggested Contribution</span>
            </div>
            <span className="font-medium text-foreground">{fund.suggestedAmount}</span>
          </div>

          {/* Recent Contributions */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Recent Contributions</h4>
            {loadingContributions || !contributionsLoaded ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {recentContributions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No contributions yet</p>
                ) : (
                  recentContributions.map((contribution) => (
                    <div key={contribution.contribution_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {contribution.member_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(contribution.date_received), "MMM d, yyyy")}
                        </p>
                      </div>
                      <span className="font-medium text-foreground">
                        {formatAmount(contribution.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Settlement History */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Landmark className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium text-foreground">Settlement History</h4>
            </div>
            {loadingSettlements ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {settlementHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No settlements recorded for this fund</p>
                ) : (
                  settlementHistory.map((settlement) => (
                    <div key={settlement.settlement_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {format(new Date(settlement.settlement_date), "MMM d, yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {settlement.reference || settlement.notes || "Manual settlement"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={settlement.status} />
                        <span className="font-medium text-foreground">
                          {formatAmount(Number(settlement.amount))}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => {
            onOpenChange(false);
            onEdit?.();
          }}>
            Edit Fund
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
