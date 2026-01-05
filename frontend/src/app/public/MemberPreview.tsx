import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Receipt, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const funds = [
  { id: 1, name: "Emergency Fund", suggestedAmount: "$100/month", collected: 15420, target: 20000 },
  { id: 2, name: "Annual Dues 2026", suggestedAmount: "$75/month", collected: 3600, target: 3600 },
  { id: 3, name: "Building Renovation", suggestedAmount: "$200/month", collected: 8750, target: 50000 },
  { id: 4, name: "Scholarship Fund", suggestedAmount: "$100/quarter", collected: 6800, target: 10000 },
];

const publicExpenses = [
  { id: 1, date: "Jan 2, 2026", category: "Operations", description: "Office supplies for monthly meeting", amount: "$45.00" },
  { id: 2, date: "Jan 1, 2026", category: "Utilities", description: "Electricity bill - December 2025", amount: "$285.00" },
  { id: 3, date: "Dec 30, 2025", category: "Events", description: "Catering for New Year celebration", amount: "$850.00" },
  { id: 4, date: "Dec 28, 2025", category: "Events", description: "Venue decoration supplies", amount: "$320.00" },
  { id: 5, date: "Dec 25, 2025", category: "Maintenance", description: "HVAC system maintenance", amount: "$175.00" },
];

const myContributions = [
  { id: 1, date: "Jan 2, 2026", fund: "Emergency Fund", amount: "$150.00", status: "confirmed" },
  { id: 2, date: "Dec 15, 2025", fund: "Annual Dues 2026", amount: "$75.00", status: "confirmed" },
  { id: 3, date: "Dec 1, 2025", fund: "Building Renovation", amount: "$200.00", status: "confirmed" },
  { id: 4, date: "Nov 15, 2025", fund: "Emergency Fund", amount: "$100.00", status: "confirmed" },
];

const categoryColors: Record<string, string> = {
  "Operations": "bg-amber/10 text-amber-dark",
  "Events": "bg-gold/20 text-charcoal",
  "Utilities": "bg-muted text-muted-foreground",
  "Maintenance": "bg-charcoal/10 text-charcoal",
};

export default function MemberPreview() {
  const [activeTab, setActiveTab] = useState("funds");

  const totalContributed = myContributions.reduce(
    (sum, c) => sum + parseFloat(c.amount.replace("$", "")),
    0
  );

  return (
    <AppLayout>
      <PageHeader
        title="Member Preview"
        description="View the public page as an authenticated member would see it"
      />

      <div className="max-w-2xl mx-auto">
        {/* Member Header */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-xl bg-amber flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">PH</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Community Group</h1>
              <p className="text-muted-foreground">Welcome back, member!</p>
            </div>
          </div>

          {/* Authenticated user info */}
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber/10 flex items-center justify-center">
                <span className="text-sm font-medium text-amber-dark">AD</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">Admin User</p>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <p className="text-sm text-muted-foreground">admin@pollenhive.app • Verified</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Contributed</p>
                <p className="text-lg font-semibold text-foreground">${totalContributed.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary w-full mb-6">
            <TabsTrigger value="funds" className="flex-1">
              <Wallet className="h-4 w-4 mr-2" />
              Contribute
            </TabsTrigger>
            <TabsTrigger value="my-contributions" className="flex-1">
              <Receipt className="h-4 w-4 mr-2" />
              My Contributions
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex-1">
              <Receipt className="h-4 w-4 mr-2" />
              Expenses
            </TabsTrigger>
          </TabsList>

          {/* Funds Tab */}
          <TabsContent value="funds">
            <div className="space-y-3">
              {funds.map((fund) => {
                const progress = (fund.collected / fund.target) * 100;
                return (
                  <button
                    key={fund.id}
                    className="w-full bg-card border border-border rounded-lg p-5 text-left hover:border-amber/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Wallet className="h-5 w-5 text-amber" />
                        <span className="font-medium text-foreground">{fund.name}</span>
                      </div>
                      <span className="text-amber text-sm font-medium">Contribute →</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{fund.suggestedAmount}</p>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-amber h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      ${fund.collected.toLocaleString()} of ${fund.target.toLocaleString()} collected
                    </p>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          {/* My Contributions Tab */}
          <TabsContent value="my-contributions">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border bg-secondary/30">
                <p className="text-sm text-muted-foreground">Your contribution history</p>
              </div>
              <div className="divide-y divide-border">
                {myContributions.map((contribution) => (
                  <div key={contribution.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{contribution.fund}</p>
                      <p className="text-sm text-muted-foreground">{contribution.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{contribution.amount}</p>
                      <div className="flex items-center gap-1 justify-end">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        <span className="text-xs text-success capitalize">{contribution.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses">
            <div className="space-y-2">
              {publicExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="bg-card border border-border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full",
                        categoryColors[expense.category] || "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {expense.category}
                    </span>
                    <span className="font-semibold text-foreground">{expense.amount}</span>
                  </div>
                  <p className="text-foreground">{expense.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{expense.date}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Powered by PollenHive
        </p>
      </div>
    </AppLayout>
  );
}
