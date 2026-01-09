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
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

// For FundDetailsModal compatibility
const mapFundToModalFormat = (fund: Fund) => ({
  id: fund.fund_id,
  name: fund.fund_name,
  status: fund.is_active ? "active" as const : "inactive" as const,
  suggestedAmount: fund.default_amount ? `$${fund.default_amount}` : null,
  collected: 0, // TODO: Calculate from contributions when contributions API is ready
  target: null,
  contributors: 0, // TODO: Calculate from contributions when contributions API is ready
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
  fund: Fund; 
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
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadFunds();
  }, []);

  const loadFunds = async () => {
    try {
      setLoading(true);
      const data = await fundApi.getAll();
      setFunds(data);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load funds",
        variant: "destructive",
      });
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

  const handleEdit = (fund: Fund) => {
    setSelectedFund(fund);
    setShowEditFund(true);
  };

  const handleDelete = (fund: Fund) => {
    setSelectedFund(fund);
    setShowDeleteFund(true);
  };

  const activeFunds = funds.filter((f) => f.is_active);
  const inactiveFunds = funds.filter((f) => !f.is_active);

  const totalCollected = useMemo(() => {
    // TODO: Calculate from contributions when contributions API is ready
    return 0;
  }, []);

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
