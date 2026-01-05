import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Wallet, TrendingUp, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateFundModal } from "@/components/modals/CreateFundModal";
import { FundDetailsModal } from "@/components/modals/FundDetailsModal";

// Fund model based on spec
interface Fund {
  id: number;
  fundName: string;
  description: string;
  defaultAmount: number | null;
  isActive: boolean;
  collected: number;
  contributors: number;
}

// Contribution data for consistency
const contributionData = [
  { fundId: "emergency", amount: 150 },
  { fundId: "emergency", amount: 100 },
  { fundId: "emergency", amount: 150 },
  { fundId: "annual", amount: 75 },
  { fundId: "annual", amount: 75 },
  { fundId: "annual", amount: 75 },
  { fundId: "building", amount: 200 },
  { fundId: "building", amount: 200 },
  { fundId: "youth", amount: 50 },
  { fundId: "scholarship", amount: 100 },
  { fundId: "welfare", amount: 25 },
  { fundId: "welfare", amount: 25 },
  { fundId: "welfare", amount: 25 },
  { fundId: "upkeep", amount: 15 },
  { fundId: "upkeep", amount: 15 },
];

// Calculate fund totals from contributions
const calculateFundTotals = () => {
  const totals: Record<string, number> = {};
  contributionData.forEach((c) => {
    totals[c.fundId] = (totals[c.fundId] || 0) + c.amount;
  });
  return totals;
};

const fundTotals = calculateFundTotals();

const funds: Fund[] = [
  {
    id: 1,
    fundName: "Emergency Fund",
    description: "For unexpected group expenses and emergencies",
    defaultAmount: 100,
    isActive: true,
    collected: fundTotals["emergency"] || 0,
    contributors: 42,
  },
  {
    id: 2,
    fundName: "Annual Dues 2026",
    description: "Annual membership dues collection",
    defaultAmount: 75,
    isActive: true,
    collected: fundTotals["annual"] || 0,
    contributors: 48,
  },
  {
    id: 3,
    fundName: "Building Renovation",
    description: "Funds for community building improvements",
    defaultAmount: 200,
    isActive: true,
    collected: fundTotals["building"] || 0,
    contributors: 35,
  },
  {
    id: 4,
    fundName: "Youth Program",
    description: "Supporting youth activities and education",
    defaultAmount: 50,
    isActive: true,
    collected: fundTotals["youth"] || 0,
    contributors: 28,
  },
  {
    id: 5,
    fundName: "Holiday Event 2025",
    description: "Annual holiday celebration fund",
    defaultAmount: 25,
    isActive: false,
    collected: 1250,
    contributors: 50,
  },
  {
    id: 6,
    fundName: "Scholarship Fund",
    description: "Educational scholarships for members' children",
    defaultAmount: 100,
    isActive: true,
    collected: fundTotals["scholarship"] || 0,
    contributors: 22,
  },
  {
    id: 7,
    fundName: "Monthly Welfare",
    description: "Ongoing monthly welfare support for members in need",
    defaultAmount: 25,
    isActive: true,
    collected: fundTotals["welfare"] || 0,
    contributors: 45,
  },
  {
    id: 8,
    fundName: "Community Upkeep",
    description: "Recurring maintenance and upkeep of community spaces",
    defaultAmount: 15,
    isActive: true,
    collected: fundTotals["upkeep"] || 0,
    contributors: 38,
  },
];

// For FundDetailsModal compatibility
const mapFundToModalFormat = (fund: Fund) => ({
  id: fund.id,
  name: fund.fundName,
  status: fund.isActive ? "active" as const : "inactive" as const,
  suggestedAmount: fund.defaultAmount ? `$${fund.defaultAmount}` : null,
  collected: fund.collected,
  target: null,
  contributors: fund.contributors,
  description: fund.description,
  recurring: true, // All funds in new model don't have targets
});

function FundCard({ fund, onViewDetails }: { fund: Fund; onViewDetails: () => void }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-amber/10 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-amber" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">{fund.fundName}</h3>
            {fund.defaultAmount && (
              <p className="text-xs text-muted-foreground">Default: ${fund.defaultAmount}</p>
            )}
          </div>
        </div>
        <StatusBadge status={fund.isActive ? "active" : "inactive"} />
      </div>

      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {fund.description}
      </p>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Collected</span>
          <span className="font-medium text-foreground">
            ${fund.collected.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            {fund.contributors} contributors
          </div>
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
    </div>
  );
}

export default function Funds() {
  const [showCreateFund, setShowCreateFund] = useState(false);
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);

  const activeFunds = funds.filter((f) => f.isActive);
  const inactiveFunds = funds.filter((f) => !f.isActive);

  const totalCollected = useMemo(() => {
    return funds.reduce((sum, f) => sum + f.collected, 0);
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
          <p className="text-2xl font-semibold text-foreground">{activeFunds.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Collected</p>
          <p className="text-2xl font-semibold text-foreground">
            ${totalCollected.toLocaleString()}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Contributors</p>
          <p className="text-2xl font-semibold text-foreground">
            {funds.reduce((sum, f) => Math.max(sum, f.contributors), 0)}
          </p>
        </div>
      </div>

      {/* Active Funds */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Active Funds</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeFunds.map((fund) => (
            <FundCard key={fund.id} fund={fund} onViewDetails={() => setSelectedFund(fund)} />
          ))}
        </div>
      </div>

      {/* Inactive Funds */}
      {inactiveFunds.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Inactive Funds</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveFunds.map((fund) => (
              <FundCard key={fund.id} fund={fund} onViewDetails={() => setSelectedFund(fund)} />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateFundModal open={showCreateFund} onOpenChange={setShowCreateFund} />
      <FundDetailsModal 
        open={!!selectedFund} 
        onOpenChange={(open) => !open && setSelectedFund(null)} 
        fund={selectedFund ? mapFundToModalFormat(selectedFund) : null} 
      />
    </AppLayout>
  );
}
