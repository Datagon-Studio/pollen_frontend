import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Plus, Search, Download, CalendarIcon, ArrowUpDown, Eye, EyeOff, Pencil, Trash2, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { RecordExpenseModal } from "@/components/modals/RecordExpenseModal";
import { EditExpenseModal } from "@/components/modals/EditExpenseModal";
import { DeleteExpenseModal } from "@/components/modals/DeleteExpenseModal";
import { expenseApi, Expense, ExpenseStats } from "@/services";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const categoryColors: Record<string, string> = {
  "Operations": "bg-amber/10 text-amber-dark border-amber/30",
  "Events": "bg-gold/20 text-charcoal border-gold/40",
  "Maintenance": "bg-charcoal/10 text-charcoal border-charcoal/20",
  "Administration": "bg-secondary text-secondary-foreground border-border",
  "Utilities": "bg-muted text-muted-foreground border-border",
};

// Helper function to format expense for display
const formatExpenseForDisplay = (expense: Expense) => {
  try {
    const dateValue = expense.date ? new Date(expense.date) : new Date();
    return {
      expense_id: expense.expense_id,
      expenseName: expense.expense_name,
      expenseCategory: expense.expense_category,
      date: format(dateValue, "MMM d, yyyy"),
      dateValue: dateValue,
      amount: `$${Number(expense.amount).toFixed(2)}`,
      amountValue: Number(expense.amount),
      notes: expense.notes || "",
      memberVisible: expense.member_visible,
    };
  } catch (error) {
    console.error("Error formatting expense:", error, expense);
    const fallbackDate = new Date();
    return {
      expense_id: expense.expense_id,
      expenseName: expense.expense_name,
      expenseCategory: expense.expense_category,
      date: format(fallbackDate, "MMM d, yyyy"),
      dateValue: fallbackDate,
      amount: `$${Number(expense.amount).toFixed(2)}`,
      amountValue: Number(expense.amount),
      notes: expense.notes || "",
      memberVisible: expense.member_visible,
    };
  }
};

type DisplayExpense = ReturnType<typeof formatExpenseForDisplay>;

const columns = [
  {
    key: "date",
    header: "Date",
    className: "text-muted-foreground",
  },
  {
    key: "expenseName",
    header: "Expense Name",
    render: (item: DisplayExpense) => (
      <span className="text-foreground font-medium">{item.expenseName}</span>
    ),
  },
  {
    key: "expenseCategory",
    header: "Category",
    render: (item: DisplayExpense) => (
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
    render: (item: DisplayExpense) => (
      <span className="text-sm text-muted-foreground">{item.notes || "—"}</span>
    ),
  },
  {
    key: "memberVisible",
    header: "Visible",
    render: (item: DisplayExpense) => (
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

export default function Expenses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "amount-high" | "amount-low">("newest");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [showRecordExpense, setShowRecordExpense] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [showDeleteExpense, setShowDeleteExpense] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadExpenses();
    loadStats();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await expenseApi.getAll();
      setExpenses(data || []);
    } catch (error) {
      console.error("Failed to load expenses:", error);
      setExpenses([]);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load expenses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await expenseApi.getStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load expense stats:", error);
      setStats(null);
    }
  };

  const handleExpenseCreated = () => {
    setShowRecordExpense(false);
    loadExpenses();
    loadStats();
  };

  const handleExpenseUpdated = () => {
    setShowEditExpense(false);
    setSelectedExpense(null);
    loadExpenses();
    loadStats();
  };

  const handleExpenseDeleted = () => {
    setShowDeleteExpense(false);
    setSelectedExpense(null);
    loadExpenses();
    loadStats();
  };

  const handleEdit = useCallback((expense: Expense) => {
    setSelectedExpense(expense);
    setShowEditExpense(true);
  }, []);

  const handleDelete = useCallback((expense: Expense) => {
    setSelectedExpense(expense);
    setShowDeleteExpense(true);
  }, []);


  const categories = useMemo(() => {
    const cats = stats?.categories || [];
    return ["All", ...cats];
  }, [stats]);

  // Create columns with handlers
  const columnsWithHandlers = useMemo(() => {
    return [
      ...columns,
      {
        key: "actions",
        header: "",
        className: "text-right",
        render: (item: DisplayExpense) => {
          const expense = expenses.find(e => e.expense_id === item.expense_id);
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                <DropdownMenuItem onClick={() => expense && handleEdit(expense)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Expense
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => expense && handleDelete(expense)} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Expense
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ];
  }, [expenses, handleEdit, handleDelete]);

  const expensesByCategory = useMemo(() => {
    return stats?.byCategory || {};
  }, [stats]);

  const filteredExpenses = useMemo(() => {
    if (!expenses || expenses.length === 0) {
      return [];
    }

    try {
      const formatted = expenses.map(formatExpenseForDisplay);
      
      return formatted
        .filter((expense) => {
          const matchesSearch = expense.expenseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            expense.notes.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesCategory = categoryFilter === "All" || expense.expenseCategory === categoryFilter;
          
          // Safe date comparison
          let matchesDateFrom = true;
          let matchesDateTo = true;
          if (dateFrom && expense.dateValue && !isNaN(expense.dateValue.getTime())) {
            matchesDateFrom = expense.dateValue >= dateFrom;
          }
          if (dateTo && expense.dateValue && !isNaN(expense.dateValue.getTime())) {
            matchesDateTo = expense.dateValue <= dateTo;
          }
          
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
    } catch (error) {
      console.error("Error filtering expenses:", error);
      return [];
    }
  }, [expenses, searchQuery, categoryFilter, dateFrom, dateTo, sortOrder]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amountValue, 0);
  }, [filteredExpenses]);

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
      {!loading && Object.keys(expensesByCategory).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {Object.entries(expensesByCategory).map(([category, data]) => (
            <div
              key={category}
              className="bg-card border border-border rounded-lg p-4"
            >
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border mb-2",
                  categoryColors[category] || "bg-secondary text-secondary-foreground"
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
      )}

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

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading expenses...</div>
      ) : filteredExpenses.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No expenses found. Add your first expense to get started.
        </div>
      ) : (
        <DataTable columns={columnsWithHandlers as any} data={filteredExpenses as any} />
      )}

      <RecordExpenseModal 
        open={showRecordExpense} 
        onOpenChange={setShowRecordExpense}
        onSuccess={handleExpenseCreated}
        existingCategories={stats?.categories || []}
      />
      <EditExpenseModal 
        open={showEditExpense} 
        onOpenChange={setShowEditExpense} 
        expense={selectedExpense}
        onSuccess={handleExpenseUpdated}
        existingCategories={stats?.categories || []}
      />
      <DeleteExpenseModal 
        open={showDeleteExpense} 
        onOpenChange={setShowDeleteExpense} 
        expense={selectedExpense}
        onSuccess={handleExpenseDeleted}
      />
    </AppLayout>
  );
}
