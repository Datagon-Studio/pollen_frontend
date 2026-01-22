import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Fund } from "@/services/fund.api";
import { Wallet } from "lucide-react";

interface ContributeConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fund: Fund | null;
  onConfirm: () => void;
}

export function ContributeConfirmationModal({
  open,
  onOpenChange,
  fund,
  onConfirm,
}: ContributeConfirmationModalProps) {
  if (!fund) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-amber" />
            Confirm Contribution
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to contribute to <strong>{fund.fund_name}</strong>?
            {fund.description && (
              <div className="mt-2 text-sm text-muted-foreground">
                {fund.description}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Continue to Payment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
