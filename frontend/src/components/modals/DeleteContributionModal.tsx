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
import { contributionApi, ContributionWithDetails } from "@/services/contribution.api";

interface DeleteContributionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contribution: ContributionWithDetails | null;
  onSuccess?: () => void;
}

export function DeleteContributionModal({ open, onOpenChange, contribution, onSuccess }: DeleteContributionModalProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!contribution) return;

    try {
      setDeleting(true);
      const response = await contributionApi.delete(contribution.contribution_id);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete contribution');
      }

      toast({
        title: "Contribution Deleted",
        description: `Contribution of $${contribution.amount.toFixed(2)} has been deleted successfully.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete contribution",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!contribution) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Delete Contribution</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this contribution of ${contribution.amount.toFixed(2)} from {contribution.fund_name}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete Contribution"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
