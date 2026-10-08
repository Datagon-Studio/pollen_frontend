import { useState, useMemo, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Wallet, TrendingUp, ArrowRight, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateFundModal } from "@/components/modals/CreateFundModal";
import { EditFundModal } from "@/components/modals/EditFundModal";
import { DeleteFundModal } from "@/components/modals/DeleteFundModal";
import { FundDetailsModal } from "@/components/modals/FundDetailsModal";
import { configApi } from "@/services/config.api";
import { useAccount } from "@/hooks/useAccount";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { managerApi, ManagerFund } from "@/services/manager.api";

interface FundWithStats extends ManagerFund {
  totalCollected?: number;
  contributorCount?: number;
}

// For FundDetailsModal compatibility
const mapFundToModalFormat = (fund: FundWithStats, currencyCode: string) => {
  const prefix = currencyCode === "GHS" ? "GH₵" : `${currencyCode} `;
  return {
  id: fund.fund_id,
  name: fund.fund_name,
  status: fund.is_active ? "active" as const : "inactive" as const,
  suggestedAmount: fund.default_amount ? `${prefix}${fund.default_amount}` : null,
  collected: fund.totalCollected || 0,
  target: fund.fund_goal || null,
  contributors: fund.contributorCount || 0,
  description: fund.description || "",
  recurring: true,
  isPublic: fund.is_public,
  };
};

function FundCard({ 
  fund, 
  onViewDetails, 
  onEdit, 
  onDelete,
  currencyCode,
  canEdit,
}: { 
  fund: FundWithStats; 
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
  currencyCode: string;
  canEdit: boolean;
}) {
  const prefix = currencyCode === "GHS" ? "GH₵" : `${currencyCode} `;
  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="h-7 w-7 shrink-0 rounded-md bg-amber/10 flex items-center justify-center">
          <Wallet className="h-3.5 w-3.5 text-amber" />
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={fund.is_active ? "active" : "inactive"} />
          <span className={cn(
            "text-xs px-2 py-0.5 rounded",
            fund.is_public 
              ? "bg-blue/20 text-blue-dark" 
              : "bg-muted text-muted-foreground"
          )}>
            {fund.is_public ? "Public" : "Private"}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={onViewDetails}>
                <ArrowRight className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {canEdit && (
                <>
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Fund
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Fund
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-medium text-foreground">{fund.fund_name}</h3>
        {fund.default_amount && (
          <p className="mt-1 text-xs text-muted-foreground">
            Default: {prefix}
            {fund.default_amount}
          </p>
        )}
      </div>

      {(() => {
        // Extract numeric value from fund_goal (handles number, string, object/Decimal types)
        let fundGoal: number | null = null;
        if (fund.fund_goal != null) {
          if (typeof fund.fund_goal === 'number') {
            fundGoal = fund.fund_goal;
          } else if (typeof fund.fund_goal === 'string') {
            fundGoal = parseFloat(fund.fund_goal);
          } else if (typeof fund.fund_goal === 'object') {
            // Handle Decimal/object types from database
            const obj = fund.fund_goal as { valueOf?: () => unknown };
            fundGoal = obj.valueOf ? Number(obj.valueOf()) : Number(fund.fund_goal);
          }
        }
        
        // If no valid goal, don't show progress
        if (fundGoal == null || isNaN(fundGoal) || fundGoal <= 0) return null;
        
        const totalCollected = fund.totalCollected || 0;
        const progressValue = (totalCollected / fundGoal) * 100;
        
        return (
          <div className="mb-4">
            <Progress 
              value={Math.min(progressValue, 100)} 
              className="h-2 mb-1"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Goal</span>
              <span className="font-medium text-foreground">
                {prefix}
                {totalCollected.toLocaleString()} out of {prefix}
                {fundGoal.toLocaleString()}
              </span>
            </div>
          </div>
        );
      })()}

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          {prefix}{(fund.totalCollected || 0).toLocaleString()} collected
        </p>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-xs text-amber hover:text-amber-dark"
          onClick={onViewDetails}
        >
          View Details
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export default function Funds() {
  const [showCreateFund, setShowCreateFund] = useState(false);
  const [showEditFund, setShowEditFund] = useState(false);
  const [showDeleteFund, setShowDeleteFund] = useState(false);
  const [selectedFund, setSelectedFund] = useState<FundWithStats | null>(null);
  const [funds, setFunds] = useState<FundWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { account } = useAccount(user?.id);
  const { toast } = useToast();
  const [currencyCode, setCurrencyCode] = useState<string>("GHS");

  const loadFunds = useCallback(async () => {
    try {
      setLoading(true);
      const fundsData = await managerApi.getFunds();
      setFunds(
        fundsData.map((fund) => ({
          ...fund,
          totalCollected: fund.collected,
        }))
      );
    } catch (error) {
      console.error("Failed to load funds:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load funds",
        variant: "destructive",
      });
      setFunds([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user?.id) {
      loadFunds();
      configApi
        .getMyConfig()
        .then((cfg) => setCurrencyCode(cfg.currency_code || "GHS"))
        .catch(() => setCurrencyCode("GHS"));
    }
  }, [user?.id, account?.account_id, loadFunds]);

  const handleFundCreated = () => {
    setShowCreateFund(false);
    loadFunds();
  };

  const handleFundUpdated = () => {
    setShowEditFund(false);
    setSelectedFund(null);
    loadFunds();
  };

  const handleFundDeleted = () => {
    setShowDeleteFund(false);
    setSelectedFund(null);
    loadFunds();
  };

  const handleEdit = (fund: FundWithStats) => {
    setSelectedFund(fund);
    setShowEditFund(true);
  };

  const handleDelete = (fund: FundWithStats) => {
    setSelectedFund(fund);
    setShowDeleteFund(true);
  };

  const activeFunds = funds.filter((f) => f.is_active);
  const inactiveFunds = funds.filter((f) => !f.is_active);
  const activeFundsPagination = usePagination(activeFunds, 12, `active-${funds.length}`);
  const inactiveFundsPagination = usePagination(inactiveFunds, 12, `inactive-${funds.length}`);

  const totalCollected = useMemo(() => {
    return funds.reduce((sum, fund) => sum + (fund.totalCollected || 0), 0);
  }, [funds]);

  return (
    <AppLayout>
      <PageHeader
        title="Funds"
        description="Fund details and collection progress across all managed accounts"
        actions={
          <Button size="sm" onClick={() => setShowCreateFund(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Fund
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Active Funds</p>
          <p className="text-2xl font-semibold text-foreground">
            {loading ? "..." : activeFunds.length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Collected</p>
          <p className="text-2xl font-semibold text-foreground">
            {loading
              ? "..."
              : `${currencyCode === "GHS" ? "GH₵" : `${currencyCode} `}${totalCollected.toLocaleString()}`}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Funds</p>
          <p className="text-2xl font-semibold text-foreground">
            {loading ? "..." : funds.length}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading funds...</div>
      ) : (
        <>
          {/* Active Funds */}
          {activeFunds.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">Active Funds</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeFundsPagination.paginatedItems.map((fund) => (
                  <FundCard 
                    key={fund.fund_id} 
                    fund={fund} 
                    onViewDetails={() => setSelectedFund(fund)}
                    onEdit={() => handleEdit(fund)}
                    onDelete={() => handleDelete(fund)}
                    currencyCode={currencyCode}
                    canEdit={fund.account_id === account?.account_id}
                  />
                ))}
              </div>
              <TablePagination
                page={activeFundsPagination.page}
                totalPages={activeFundsPagination.totalPages}
                totalItems={activeFundsPagination.totalItems}
                rangeStart={activeFundsPagination.rangeStart}
                rangeEnd={activeFundsPagination.rangeEnd}
                onPageChange={activeFundsPagination.setPage}
              />
            </div>
          )}

          {/* Inactive Funds */}
          {inactiveFunds.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Inactive Funds</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveFundsPagination.paginatedItems.map((fund) => (
                  <FundCard 
                    key={fund.fund_id} 
                    fund={fund} 
                    onViewDetails={() => setSelectedFund(fund)}
                    onEdit={() => handleEdit(fund)}
                    onDelete={() => handleDelete(fund)}
                    currencyCode={currencyCode}
                    canEdit={fund.account_id === account?.account_id}
                  />
                ))}
              </div>
              <TablePagination
                page={inactiveFundsPagination.page}
                totalPages={inactiveFundsPagination.totalPages}
                totalItems={inactiveFundsPagination.totalItems}
                rangeStart={inactiveFundsPagination.rangeStart}
                rangeEnd={inactiveFundsPagination.rangeEnd}
                onPageChange={inactiveFundsPagination.setPage}
              />
            </div>
          )}

          {funds.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No funds found. Create your first fund to get started.
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <CreateFundModal open={showCreateFund} onOpenChange={setShowCreateFund} onSuccess={handleFundCreated} />
      <EditFundModal 
        open={showEditFund} 
        onOpenChange={setShowEditFund} 
        fund={selectedFund}
        onSuccess={handleFundUpdated}
      />
      <DeleteFundModal 
        open={showDeleteFund} 
        onOpenChange={setShowDeleteFund} 
        fund={selectedFund}
        onSuccess={handleFundDeleted}
      />
      <FundDetailsModal 
        open={!!selectedFund && !showEditFund && !showDeleteFund} 
        onOpenChange={(open) => !open && setSelectedFund(null)} 
        fund={selectedFund ? mapFundToModalFormat(selectedFund, currencyCode) : null}
        onEdit={() => selectedFund && handleEdit(selectedFund)}
      />
    </AppLayout>
  );
}
