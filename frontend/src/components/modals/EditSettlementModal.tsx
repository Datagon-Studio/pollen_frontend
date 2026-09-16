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
import { fundSettlementApi, FundSettlement } from "@/services/fund-settlement.api";
import { configApi } from "@/services/config.api";

interface EditSettlementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlement: FundSettlement | null;
  onSuccess?: () => void;
}

export function EditSettlementModal({
  open,
  onOpenChange,
  settlement,
  onSuccess,
}: EditSettlementModalProps) {
  const { toast } = useToast();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loadingFunds, setLoadingFunds] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fundId: "",
    amount: "",
    date: new Date(),
    reference: "",
    notes: "",
  });
  const [currencyCode, setCurrencyCode] = useState<string>("GHS");

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
  }, [open, toast]);

  useEffect(() => {
    if (settlement && open) {
      setFormData({
        fundId: settlement.fund_id,
        amount: String(settlement.amount),
        date: new Date(settlement.settlement_date),
        reference: settlement.reference || "",
        notes: settlement.notes || "",
      });
    }
  }, [settlement, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlement) return;

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

    try {
      setSaving(true);
      await fundSettlementApi.update(settlement.settlement_id, {
        fund_id: formData.fundId,
        amount,
        settlement_date: format(formData.date, "yyyy-MM-dd"),
        reference: formData.reference.trim() || null,
        notes: formData.notes.trim() || null,
      });

      toast({
        title: "Settlement Updated",
        description: "The pending settlement has been updated.",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update settlement",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!settlement) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Edit Settlement</DialogTitle>
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
                <Select value={formData.fundId} onValueChange={(v) => setFormData({ ...formData, fundId: v })}>
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
              <Label htmlFor="edit-settlement-amount">Amount *</Label>
              <CurrencyInput
                id="edit-settlement-amount"
                currencyCode={currencyCode}
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-settlement-reference">Reference</Label>
              <Input
                id="edit-settlement-reference"
                placeholder="Bank transfer, MoMo, or cheque reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-settlement-notes">Notes</Label>
              <Textarea
                id="edit-settlement-notes"
                placeholder="Additional details about this settlement..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || loadingFunds}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
