import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { fundApi, Fund } from "@/services";
import { fundSettlementApi, FundSettlementAvailability, FundSettlementStatus } from "@/services/fund-settlement.api";
import { configApi } from "@/services/config.api";
import { getCurrencySymbol } from "@/lib/currencies";
import { SettlementAvailabilitySummary } from "@/components/modals/SettlementAvailabilitySummary";

interface RecordSettlementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const emptyForm = {
  fundId: "",
  amount: "",
  date: new Date(),
  status: "pending" as FundSettlementStatus,
  reference: "",
  notes: "",
};

export function RecordSettlementModal({ open, onOpenChange, onSuccess }: RecordSettlementModalProps) {
  const { toast } = useToast();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loadingFunds, setLoadingFunds] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [currencyCode, setCurrencyCode] = useState<string>("GHS");
  const [availability, setAvailability] = useState<FundSettlementAvailability | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  useEffect(() => {
    if (!open) return;

    configApi
      .getMyConfig()
      .then((cfg) => setCurrencyCode(cfg.currency_code || "GHS"))
      .catch(() => setCurrencyCode("GHS"));

    const loadFunds = async () => {
      try {
        setLoadingFunds(true);
        const data = await fundApi.getAll();
        setFunds(data || []);
      } catch (error) {
        console.error("Failed to load funds:", error);
        toast({
          title: "Error",
          description: "Failed to load funds",
          variant: "destructive",
        });
        setFunds([]);
      } finally {
        setLoadingFunds(false);
      }
    };

    loadFunds();
    setAvailability(null);
  }, [open, toast]);

  useEffect(() => {
    if (!open || !formData.fundId) {
      setAvailability(null);
      return;
    }

    let cancelled = false;
    const loadAvailability = async () => {
      try {
        setLoadingAvailability(true);
        const data = await fundSettlementApi.getAvailability(formData.fundId);
        if (!cancelled) setAvailability(data);
      } catch (error) {
        console.error("Failed to load settlement availability:", error);
        if (!cancelled) setAvailability(null);
      } finally {
        if (!cancelled) setLoadingAvailability(false);
      }
    };

    loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [open, formData.fundId]);

  const formatAmount = (amount: number) => {
    return `${getCurrencySymbol(currencyCode)}${amount.toFixed(2)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fundId || !formData.amount) {
      toast({
        title: "Validation Error",
        description: "Please select a fund and enter an amount.",
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

    if (availability && amount > availability.availableAmount) {
      toast({
        title: "Validation Error",
        description: `Amount cannot exceed the maximum requestable (${formatAmount(availability.availableAmount)}).`,
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const selectedFund = funds.find((f) => f.fund_id === formData.fundId);
      await fundSettlementApi.create({
        fund_id: formData.fundId,
        amount,
        settlement_date: format(formData.date, "yyyy-MM-dd"),
        status: formData.status,
        reference: formData.reference.trim() || null,
        notes: formData.notes.trim() || null,
      });

      toast({
        title: "Settlement Recorded",
        description: `${formatAmount(amount)} for ${selectedFund?.fund_name || "fund"} has been recorded as ${formData.status}.`,
      });

      setFormData(emptyForm);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record settlement",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setFormData(emptyForm);
      setAvailability(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Settlement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Fund *</Label>
              {loadingFunds ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select
                  value={formData.fundId}
                  onValueChange={(v) => setFormData({ ...formData, fundId: v, amount: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fund" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border max-h-[300px]">
                    {funds.map((fund) => (
                      <SelectItem key={fund.fund_id} value={fund.fund_id}>
                        {fund.fund_name}{!fund.is_active ? " (Inactive)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {formData.fundId && (
              <SettlementAvailabilitySummary
                availability={availability}
                loading={loadingAvailability}
                currencyCode={currencyCode}
                onUseMax={() =>
                  availability &&
                  setFormData({ ...formData, amount: availability.availableAmount.toFixed(2) })
                }
              />
            )}

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

            <div className="space-y-2">
              <Label htmlFor="settlement-amount">Amount *</Label>
              <CurrencyInput
                id="settlement-amount"
                currencyCode={currencyCode}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                max={availability?.availableAmount}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                disabled={!formData.fundId || availability?.availableAmount === 0}
              />
            </div>

            <div className="space-y-2">
              <Label>Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as FundSettlementStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="successful">Successful</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Use Pending for a payout request, or Successful if the payout is already done.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settlement-reference">Reference</Label>
              <Input
                id="settlement-reference"
                placeholder="Bank transfer, MoMo, or cheque reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settlement-notes">Notes</Label>
              <Textarea
                id="settlement-notes"
                placeholder="Additional details about this settlement..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || loadingFunds || loadingAvailability || availability?.availableAmount === 0}
            >
              {saving ? "Saving..." : "Record Settlement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
