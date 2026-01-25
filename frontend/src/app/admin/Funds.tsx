import { useState, useMemo, useEffect } from "react";
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
import { fundApi, Fund } from "@/services";
import { contributionApi, FundContributionStats } from "@/services/contribution.api";
import { useAccount } from "@/hooks/useAccount";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

interface FundWithStats extends Fund {
  totalCollected?: number;
  contributorCount?: number;
}

// For FundDetailsModal compatibility
const mapFundToModalFormat = (fund: FundWithStats) => ({
  id: fund.fund_id,
  name: fund.fund_name,
  status: fund.is_active ? "active" as const : "inactive" as const,
  suggestedAmount: fund.default_amount ? `$${fund.default_amount}` : null,
  collected: fund.totalCollected || 0,
  target: fund.fund_goal || null,
  contributors: fund.contributorCount || 0,
  description: fund.description || "",
  recurring: true,
  isPublic: fund.is_public,
});

function FundCard({ 
  fund, 
  onViewDetails, 
  onEdit, 
  onDelete 
}: { 
  fund: FundWithStats; 
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-amber/10 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-amber" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">{fund.fund_name}</h3>
            {fund.default_amount && (
              <p className="text-xs text-muted-foreground">Default: ${fund.default_amount}</p>
            )}
          </div>
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
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Fund
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Fund
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {fund.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {fund.description}
        </p>
      )}

      {fund.fund_goal && fund.fund_goal > 0 && (
        <div className="mb-4">
          <Progress 
            value={fund.totalCollected ? (fund.totalCollected / fund.fund_goal) * 100 : 0} 
            className="h-2 mb-1"
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Goal</span>
            <span className="font-medium text-foreground">
              GHS {fund.totalCollected?.toLocaleString() || "0"} out of GHS {fund.fund_goal.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
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
  const { account } = useAccount();
  const { toast } = useToast();

  useEffect(() => {
    if (account?.account_id) {
      loadFunds();
    }
  }, [account?.account_id]);

  const loadFunds = async () => {
    if (!account?.account_id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const fundsData = await fundApi.getAll();
      
      // Fetch stats for each fund (with error handling)
      const fundsWithStats = await Promise.all(
        fundsData.map(async (fund) => {
          try {
            const statsResponse = await contributionApi.getFundStats(fund.fund_id);
            if (statsResponse.success && statsResponse.data) {
              return {
                ...fund,
                totalCollected: statsResponse.data.totalCollected || 0,
                contributorCount: statsResponse.data.contributorCount || 0,
              };
            }
            return { ...fund, totalCollected: 0, contributorCount: 0 };
          } catch (error) {
            console.error(`Failed to load stats for fund ${fund.fund_id}:`, error);
            return { ...fund, totalCollected: 0, contributorCount: 0 };
          }
        })
      );
      
      setFunds(fundsWithStats);
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
  };

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

  const totalCollected = useMemo(() => {
    return funds.reduce((sum, fund) => sum + (fund.totalCollected || 0), 0);
  }, [funds]);

  return (
    <AppLayout>
      <PageHeader
        title="Funds"
        description="Manage contribution funds and track collection progress"
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
            {loading ? "..." : `$${totalCollected.toLocaleString()}`}
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
                {activeFunds.map((fund) => (
                  <FundCard 
                    key={fund.fund_id} 
                    fund={fund} 
                    onViewDetails={() => setSelectedFund(fund)}
                    onEdit={() => handleEdit(fund)}
                    onDelete={() => handleDelete(fund)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inactive Funds */}
          {inactiveFunds.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Inactive Funds</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveFunds.map((fund) => (
                  <FundCard 
                    key={fund.fund_id} 
                    fund={fund} 
                    onViewDetails={() => setSelectedFund(fund)}
                    onEdit={() => handleEdit(fund)}
                    onDelete={() => handleDelete(fund)}
                  />
                ))}
              </div>
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
        fund={selectedFund ? mapFundToModalFormat(selectedFund) : null} 
      />
    </AppLayout>
  );
}
