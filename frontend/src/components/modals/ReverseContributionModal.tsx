import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { contributionApi, ContributionWithDetails } from "@/services/contribution.api";

interface ReverseContributionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contribution: ContributionWithDetails | null;
  amountLabel: string;
  onSuccess?: () => void;
}

export function ReverseContributionModal({
  open,
  onOpenChange,
  contribution,
  amountLabel,
  onSuccess,
}: ReverseContributionModalProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setReason("");
  }, [open, contribution?.contribution_id]);

  const handleReverse = async () => {
    if (!contribution) return;
    const trimmed = reason.trim();
    if (!trimmed) return;

    try {
      setSubmitting(true);
      const response = await contributionApi.reverse(contribution.contribution_id, trimmed);

      if (!response.success) {
        throw new Error(response.error || "Failed to reverse contribution");
      }

      toast({
        title: "Contribution reversed",
        description: `${amountLabel} from ${contribution.member_name || contribution.fund_name} stays on the record and is no longer counted as collected.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reverse contribution",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!contribution) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Reverse contribution</DialogTitle>
          <DialogDescription>
            {amountLabel} from {contribution.member_name || "this member"} for {contribution.fund_name} will leave collected totals and stay on the record. This cannot be deleted afterward.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reversal-reason">Reason</Label>
          <Textarea
            id="reversal-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why is this contribution being reversed?"
            disabled={submitting}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleReverse} disabled={submitting || !reason.trim()}>
            {submitting ? "Reversing..." : "Reverse contribution"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
