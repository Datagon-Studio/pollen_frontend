import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Wallet, Receipt, CheckCircle2, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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

type ContributionRow = {
  id: number;
  date: string;
  fund: string;
  amount: string;
  status: string;
};

type ExpenseRow = {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: string;
};

export default function MemberPreview() {
  const [activeTab, setActiveTab] = useState("my-contributions");
  
  // Contribution filters
  const [contributionSearch, setContributionSearch] = useState("");
  const [contributionFundFilter, setContributionFundFilter] = useState("all");
  const [contributionStatusFilter, setContributionStatusFilter] = useState("all");
  
  // Expense filters
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");

  const totalContributed = myContributions.reduce(
    (sum, c) => sum + parseFloat(c.amount.replace("$", "")),
    0
  );

  // Get unique funds and categories for filters
  const uniqueFunds = useMemo(() => {
    const funds = new Set(myContributions.map(c => c.fund));
    return Array.from(funds);
  }, []);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(publicExpenses.map(e => e.category));
    return Array.from(categories);
  }, []);

  // Filter contributions
  const filteredContributions = useMemo(() => {
    return myContributions.filter((contribution) => {
      const matchesSearch = 
        contribution.fund.toLowerCase().includes(contributionSearch.toLowerCase()) ||
        contribution.amount.toLowerCase().includes(contributionSearch.toLowerCase());
      const matchesFund = contributionFundFilter === "all" || contribution.fund === contributionFundFilter;
      const matchesStatus = contributionStatusFilter === "all" || contribution.status === contributionStatusFilter;
      return matchesSearch && matchesFund && matchesStatus;
    });
  }, [contributionSearch, contributionFundFilter, contributionStatusFilter]);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return publicExpenses.filter((expense) => {
      const matchesSearch = 
        expense.description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        expense.category.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        expense.amount.toLowerCase().includes(expenseSearch.toLowerCase());
      const matchesCategory = expenseCategoryFilter === "all" || expense.category === expenseCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenseSearch, expenseCategoryFilter]);

  // Contribution table columns
  const contributionColumns = [
    {
      key: "date",
      header: "Date",
      className: "text-muted-foreground",
    },
    {
      key: "fund",
      header: "Fund",
      render: (item: ContributionRow) => (
        <span className="font-medium text-foreground">{item.fund}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right font-semibold",
      render: (item: ContributionRow) => (
        <span className="text-foreground">{item.amount}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: ContributionRow) => (
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          <span className="text-xs text-success capitalize">{item.status}</span>
        </div>
      ),
    },
  ];

  // Expense table columns
  const expenseColumns = [
    {
      key: "date",
      header: "Date",
      className: "text-muted-foreground",
    },
    {
      key: "category",
      header: "Category",
      render: (item: ExpenseRow) => (
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full",
            categoryColors[item.category] || "bg-secondary text-secondary-foreground"
          )}
        >
          {item.category}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (item: ExpenseRow) => (
        <span className="text-foreground">{item.description}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right font-semibold",
      render: (item: ExpenseRow) => (
        <span className="text-foreground">{item.amount}</span>
      ),
    },
  ];

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
            <TabsTrigger value="my-contributions" className="flex-1">
              <Receipt className="h-4 w-4 mr-2" />
              My Contributions
            </TabsTrigger>
            <TabsTrigger value="funds" className="flex-1">
              <Wallet className="h-4 w-4 mr-2" />
              Contribute
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex-1">
              <Receipt className="h-4 w-4 mr-2" />
              Expenses
            </TabsTrigger>
          </TabsList>

          {/* My Contributions Tab */}
          <TabsContent value="my-contributions">
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search contributions..."
                    value={contributionSearch}
                    onChange={(e) => setContributionSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={contributionFundFilter} onValueChange={setContributionFundFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by fund" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">All Funds</SelectItem>
                    {uniqueFunds.map((fund) => (
                      <SelectItem key={fund} value={fund}>
                        {fund}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={contributionStatusFilter} onValueChange={setContributionStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <DataTable
                columns={contributionColumns}
                data={filteredContributions as any}
                emptyMessage="No contributions found"
              />
            </div>
          </TabsContent>

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

          {/* Expenses Tab */}
          <TabsContent value="expenses">
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search expenses..."
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={expenseCategoryFilter} onValueChange={setExpenseCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <DataTable
                columns={expenseColumns}
                data={filteredExpenses as any}
                emptyMessage="No expenses found"
              />
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
