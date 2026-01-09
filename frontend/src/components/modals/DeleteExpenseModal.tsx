import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { expenseApi, Expense } from "@/services";

interface DeleteExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  onSuccess?: () => void;
}

export function DeleteExpenseModal({ open, onOpenChange, expense, onSuccess }: DeleteExpenseModalProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!expense) return;

    try {
      setDeleting(true);
      await expenseApi.delete(expense.expense_id);

      toast({
        title: "Expense Deleted",
        description: `${expense.expense_name} has been deleted successfully.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete expense",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Delete Expense</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{expense.expense_name}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


