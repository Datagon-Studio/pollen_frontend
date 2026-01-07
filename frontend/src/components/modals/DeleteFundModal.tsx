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
import { fundApi, Fund } from "@/services";

interface DeleteFundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fund: Fund | null;
  onSuccess?: () => void;
}

export function DeleteFundModal({ open, onOpenChange, fund, onSuccess }: DeleteFundModalProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!fund) return;

    try {
      setDeleting(true);
      await fundApi.delete(fund.fund_id);

      toast({
        title: "Fund Deleted",
        description: `${fund.fund_name} has been deleted successfully.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete fund",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!fund) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Delete Fund</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{fund.fund_name}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete Fund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

