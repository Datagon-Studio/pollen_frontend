import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ManagerFund } from "@/services/manager.api";
import {
  settlementRequestApi,
} from "@/services/settlement-request.api";
import type { SettlementDetails } from "@/services/settlement.api";

interface SettlementRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
  funds: ManagerFund[];
  currencyCode: string;
  onSuccess: () => void;
}

export function SettlementRequestModal({
  open,
  onOpenChange,
  accountId,
  accountName,
  funds,
  currencyCode,
  onSuccess,
}: SettlementRequestModalProps) {
  const { toast } = useToast();
  const [fundId, setFundId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [destination, setDestination] = useState<SettlementDetails | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [saving, setSaving] = useState(false);

  const accountFunds = useMemo(
    () => funds.filter((fund) => fund.account_id === accountId && fund.is_active),
    [accountId, funds]
  );

  useEffect(() => {
    if (!open || !accountId) return;
    let cancelled = false;
    setLoadingContext(true);
    settlementRequestApi
      .getContext(accountId)
      .then((context) => {
        if (!cancelled) setDestination(context.destination);
      })
      .catch((error) => {
        if (!cancelled) {
          setDestination(null);
          toast({
            title: "Unable to load payment details",
            description: error instanceof Error ? error.message : "Try again.",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingContext(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, open, toast]);

  const reset = () => {
    setFundId("");
    setAmount("");
    setNote("");
    setDestination(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const requestedAmount = Number(amount);
    if (!fundId || !Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      toast({
        title: "Fund and amount required",
        description: "Select a fund and enter an amount greater than zero.",
        variant: "destructive",
      });
      return;
    }
    if (!destination) {
      toast({
        title: "Payment details required",
        description: "Add active bank or mobile money details in Settings first.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await settlementRequestApi.create({
        account_id: accountId,
        fund_id: fundId,
        amount: requestedAmount,
        request_note: note.trim() || null,
      });
      toast({
        title: "Settlement request submitted",
        description: "Pollean admins can now review the request.",
      });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Request failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle>Request settlement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Requesting for</p>
            <p className="font-medium">{accountName}</p>
          </div>

          <div className="space-y-2">
            <Label>Fund</Label>
            <Select value={fundId} onValueChange={setFundId}>
              <SelectTrigger>
                <SelectValue placeholder="Select fund" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {accountFunds.map((fund) => (
                  <SelectItem key={fund.fund_id} value={fund.fund_id}>
                    {fund.fund_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="request-amount">Requested amount</Label>
            <CurrencyInput
              id="request-amount"
              currencyCode={currencyCode}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              min="0.01"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="request-note">Note</Label>
            <Textarea
              id="request-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional context for the admin reviewing this request"
              rows={3}
            />
          </div>

          <div className="rounded-md border p-3">
            <p className="text-sm font-medium mb-2">Payment details</p>
            {loadingContext ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : destination ? (
              <div className="text-sm space-y-1 text-muted-foreground">
                <p>{destination.settlement_type === "bank" ? "Bank account" : "Mobile money"}</p>
                <p className="text-foreground font-medium">{destination.account_name}</p>
                <p>{destination.account_number}</p>
                <p>{destination.bank_name || destination.provider}</p>
              </div>
            ) : (
              <p className="text-sm text-destructive">
                No active payment details. Add them in Settings before submitting.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || loadingContext || !destination}
            >
              {saving ? "Submitting..." : "Submit request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
