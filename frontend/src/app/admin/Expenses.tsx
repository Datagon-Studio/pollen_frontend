import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Search, Download, CalendarIcon, ArrowUpDown, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { RecordExpenseModal } from "@/components/modals/RecordExpenseModal";

const categoryColors: Record<string, string> = {
  "Operations": "bg-amber/10 text-amber-dark border-amber/30",
  "Events": "bg-gold/20 text-charcoal border-gold/40",
  "Maintenance": "bg-charcoal/10 text-charcoal border-charcoal/20",
  "Administration": "bg-secondary text-secondary-foreground border-border",
  "Utilities": "bg-muted text-muted-foreground border-border",
};

const categories = ["All", "Operations", "Events", "Maintenance", "Administration", "Utilities"];

// Expense model based on spec
interface Expense {
  id: number;
  expenseName: string;
  expenseCategory: string;
  date: string;
  dateValue: Date;
  amount: string;
  amountValue: number;
  notes: string;
  memberVisible: boolean;
}

const expenses: Expense[] = [
  { id: 1, expenseName: "Office supplies for monthly meeting", expenseCategory: "Operations", date: "Jan 2, 2026", dateValue: new Date(2026, 0, 2), amount: "$45.00", amountValue: 45, notes: "Printer paper, pens, folders", memberVisible: true },
  { id: 2, expenseName: "Electricity bill - December 2025", expenseCategory: "Utilities", date: "Jan 1, 2026", dateValue: new Date(2026, 0, 1), amount: "$285.00", amountValue: 285, notes: "", memberVisible: true },
  { id: 3, expenseName: "Catering for New Year celebration", expenseCategory: "Events", date: "Dec 30, 2025", dateValue: new Date(2025, 11, 30), amount: "$850.00", amountValue: 850, notes: "50 guests catered", memberVisible: true },
  { id: 4, expenseName: "Venue decoration supplies", expenseCategory: "Events", date: "Dec 28, 2025", dateValue: new Date(2025, 11, 28), amount: "$320.00", amountValue: 320, notes: "", memberVisible: true },
  { id: 5, expenseName: "HVAC system maintenance", expenseCategory: "Maintenance", date: "Dec 25, 2025", dateValue: new Date(2025, 11, 25), amount: "$175.00", amountValue: 175, notes: "Annual service", memberVisible: false },
  { id: 6, expenseName: "Accounting software subscription", expenseCategory: "Administration", date: "Dec 22, 2025", dateValue: new Date(2025, 11, 22), amount: "$49.99", amountValue: 49.99, notes: "Monthly subscription", memberVisible: false },
  { id: 7, expenseName: "Printing materials for newsletter", expenseCategory: "Operations", date: "Dec 20, 2025", dateValue: new Date(2025, 11, 20), amount: "$125.00", amountValue: 125, notes: "", memberVisible: true },
  { id: 8, expenseName: "Parking lot repairs", expenseCategory: "Maintenance", date: "Dec 18, 2025", dateValue: new Date(2025, 11, 18), amount: "$450.00", amountValue: 450, notes: "Pothole filling", memberVisible: true },
  { id: 9, expenseName: "Internet service - Q4 2025", expenseCategory: "Utilities", date: "Dec 15, 2025", dateValue: new Date(2025, 11, 15), amount: "$180.00", amountValue: 180, notes: "Quarterly payment", memberVisible: true },
  { id: 10, expenseName: "Youth program activity materials", expenseCategory: "Events", date: "Dec 12, 2025", dateValue: new Date(2025, 11, 12), amount: "$95.00", amountValue: 95, notes: "", memberVisible: true },
];

const columns = [
  {
    key: "date",
    header: "Date",
    className: "text-muted-foreground",
  },
  {
    key: "expenseName",
    header: "Expense Name",
    render: (item: Expense) => (
      <span className="text-foreground font-medium">{item.expenseName}</span>
    ),
  },
  {
    key: "expenseCategory",
    header: "Category",
    render: (item: Expense) => (
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border",
          categoryColors[item.expenseCategory] || "bg-secondary text-secondary-foreground"
        )}
      >
        {item.expenseCategory}
      </span>
    ),
  },
  {
    key: "notes",
    header: "Notes",
    render: (item: Expense) => (
      <span className="text-sm text-muted-foreground">{item.notes || "—"}</span>
    ),
  },
  {
    key: "memberVisible",
    header: "Visible",
    render: (item: Expense) => (
      <div className="flex items-center gap-1">
        {item.memberVisible ? (
          <Eye className="h-4 w-4 text-success" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    className: "text-right font-semibold",
  },
];

// Group expenses by category for summary
const getExpensesByCategory = (filteredExpenses: Expense[]) => {
  return filteredExpenses.reduce((acc, expense) => {
    if (!acc[expense.expenseCategory]) {
      acc[expense.expenseCategory] = { total: 0, count: 0 };
    }
    acc[expense.expenseCategory].total += expense.amountValue;
    acc[expense.expenseCategory].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);
};

export default function Expenses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "amount-high" | "amount-low">("newest");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [showRecordExpense, setShowRecordExpense] = useState(false);

  const filteredExpenses = expenses
    .filter((expense) => {
      const matchesSearch = expense.expenseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.notes.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "All" || expense.expenseCategory === categoryFilter;
      const matchesDateFrom = !dateFrom || expense.dateValue >= dateFrom;
      const matchesDateTo = !dateTo || expense.dateValue <= dateTo;
      return matchesSearch && matchesCategory && matchesDateFrom && matchesDateTo;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case "newest":
          return b.dateValue.getTime() - a.dateValue.getTime();
        case "oldest":
          return a.dateValue.getTime() - b.dateValue.getTime();
        case "amount-high":
          return b.amountValue - a.amountValue;
        case "amount-low":
          return a.amountValue - b.amountValue;
        default:
          return 0;
      }
    });

  const expensesByCategory = getExpensesByCategory(filteredExpenses);

  const totalExpenses = filteredExpenses.reduce(
    (sum, e) => sum + e.amountValue,
    0
  );

  const clearDateFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Expenses"
        description="Track and categorize group expenses"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" onClick={() => setShowRecordExpense(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </div>
        }
      />

      {/* Category Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {Object.entries(expensesByCategory).map(([category, data]) => (
          <div
            key={category}
            className="bg-card border border-border rounded-lg p-4"
          >
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border mb-2",
                categoryColors[category]
              )}
            >
              {category}
            </span>
            <p className="text-lg font-semibold text-foreground">
              ${data.total.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">{data.count} expenses</p>
          </div>
        ))}
      </div>

      {/* Summary Bar */}
      <div className="bg-card border border-border rounded-lg p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Expenses (Filtered)</p>
            <p className="text-2xl font-semibold text-foreground">${totalExpenses.toFixed(2)}</p>
          </div>

          {/* Top row filters */}
          <div className="flex flex-wrap gap-3">
            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as typeof sortOrder)}>
              <SelectTrigger className="w-[150px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="amount-high">Amount: High to Low</SelectItem>
                <SelectItem value="amount-low">Amount: Low to High</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[150px] justify-start">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dateFrom ? format(dateFrom, "MMM d") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[150px] justify-start">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dateTo ? format(dateTo, "MMM d") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={clearDateFilters}>
                Clear Dates
              </Button>
            )}
          </div>
        </div>

        {/* Bottom row - Search */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <DataTable columns={columns as any} data={filteredExpenses as any} />

      <RecordExpenseModal open={showRecordExpense} onOpenChange={setShowRecordExpense} />
    </AppLayout>
  );
}
