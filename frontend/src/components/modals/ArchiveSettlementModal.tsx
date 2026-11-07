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
import { fundSettlementApi, FundSettlement } from "@/services/fund-settlement.api";

interface ArchiveSettlementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlement: FundSettlement | null;
  onSuccess?: () => void;
}

export function ArchiveSettlementModal({
  open,
  onOpenChange,
  settlement,
  onSuccess,
}: ArchiveSettlementModalProps) {
  const { toast } = useToast();
  const [archiving, setArchiving] = useState(false);

  const handleArchive = async () => {
    if (!settlement) return;

    try {
      setArchiving(true);
      await fundSettlementApi.archive(settlement.settlement_id);

      toast({
        title: "Settlement Archived",
        description: `${settlement.fund_name} settlement has been archived. It can still be restored later.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to archive settlement",
        variant: "destructive",
      });
    } finally {
      setArchiving(false);
    }
  };

  if (!settlement) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Archive Settlement</DialogTitle>
          <DialogDescription>
            Settlements cannot be deleted. Archiving "{settlement.fund_name}" hides it from the
            default list. You can restore it later from the Archived tab.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={archiving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleArchive} disabled={archiving}>
            {archiving ? "Archiving..." : "Archive Settlement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
