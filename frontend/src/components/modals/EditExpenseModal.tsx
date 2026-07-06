import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { expenseApi, Expense, UpdateExpenseInput } from "@/services";
import { expenseCategoryApi, ExpenseCategory } from "@/services/expense-category.api";
import { configApi } from "@/services/config.api";

interface EditExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  onSuccess?: () => void;
}

export function EditExpenseModal({ open, onOpenChange, expense, onSuccess }: EditExpenseModalProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    expenseName: "",
    expenseCategory: "",
    date: new Date(),
    amount: "",
    notes: "",
    memberVisible: true,
  });
  const [currencyCode, setCurrencyCode] = useState<string>("GHS");

  useEffect(() => {
    if (open) {
      configApi
        .getMyConfig()
        .then((cfg) => setCurrencyCode(cfg.currency_code || "GHS"))
        .catch(() => setCurrencyCode("GHS"));
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  useEffect(() => {
    if (expense && open) {
      setFormData({
        expenseName: expense.expense_name || "",
        expenseCategory: expense.expense_category || "",
        date: new Date(expense.date),
        amount: expense.amount.toString(),
        notes: expense.notes || "",
        memberVisible: expense.member_visible,
      });
    }
  }, [expense, open]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await expenseCategoryApi.getAll();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load expense categories:", error);
      toast({
        title: "Error",
        description: "Failed to load expense categories",
        variant: "destructive",
      });
    } finally {
      setLoadingCategories(false);
    }
  };

  // Categories are already sorted alphabetically from the API

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!expense) return;
    
    if (!formData.expenseName.trim() || !formData.expenseCategory || !formData.amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const input: UpdateExpenseInput = {
        expense_name: formData.expenseName.trim(),
        expense_category: formData.expenseCategory,
        date: format(formData.date, "yyyy-MM-dd"),
        amount: amount,
        notes: formData.notes.trim() || null,
        member_visible: formData.memberVisible,
      };

      await expenseApi.update(expense.expense_id, input);

      toast({
        title: "Expense Updated",
        description: `Expense has been updated successfully.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update expense",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Expense Name */}
            <div className="space-y-2">
              <Label htmlFor="expenseName">Expense Name *</Label>
              <Input
                id="expenseName"
                placeholder="What was the expense for?"
                value={formData.expenseName}
                onChange={(e) => setFormData({ ...formData, expenseName: e.target.value })}
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {format(formData.date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => date && setFormData({ ...formData, date })}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Expense Category *</Label>
              {loadingCategories ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select value={formData.expenseCategory} onValueChange={(v) => setFormData({ ...formData, expenseCategory: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border max-h-[300px]">
                    {categories.map((cat) => (
                      <SelectItem key={cat.category_id} value={cat.category_name}>
                        {cat.category_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <CurrencyInput
                id="amount"
                currencyCode={currencyCode}
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional details about this expense..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="resize-none"
                rows={2}
              />
            </div>

            {/* Member Visible */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="member-visible">Visible to Members</Label>
                <p className="text-xs text-muted-foreground">Show this expense on public page</p>
              </div>
              <Switch
                id="member-visible"
                checked={formData.memberVisible}
                onCheckedChange={(checked) => setFormData({ ...formData, memberVisible: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


