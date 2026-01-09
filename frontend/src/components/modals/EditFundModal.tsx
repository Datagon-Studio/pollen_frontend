import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { fundApi, Fund } from "@/services";

interface EditFundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fund: Fund | null;
  onSuccess?: () => void;
}

export function EditFundModal({ open, onOpenChange, fund, onSuccess }: EditFundModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fundName: "",
    description: "",
    defaultAmount: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (fund && open) {
      setFormData({
        fundName: fund.fund_name || "",
        description: fund.description || "",
        defaultAmount: fund.default_amount?.toString() || "",
        isActive: fund.is_active,
      });
    }
  }, [fund, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fund) return;
    
    if (!formData.fundName.trim()) {
      toast({
        title: "Validation Error",
        description: "Fund name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await fundApi.update(fund.fund_id, {
        fund_name: formData.fundName.trim(),
        description: formData.description.trim() || null,
        default_amount: formData.defaultAmount ? parseFloat(formData.defaultAmount) : null,
        is_active: formData.isActive,
      });

      toast({
        title: "Fund Updated",
        description: `${formData.fundName} has been updated successfully.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update fund",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!fund) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Edit Fund</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fund-name">Fund Name *</Label>
              <Input
                id="fund-name"
                placeholder="e.g., Emergency Fund"
                value={formData.fundName}
                onChange={(e) => setFormData({ ...formData, fundName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose of this fund..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="resize-none"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-amount">Default Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="default-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  value={formData.defaultAmount}
                  onChange={(e) => setFormData({ ...formData, defaultAmount: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Suggested contribution amount for this fund
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is-active">Active Fund</Label>
                <p className="text-xs text-muted-foreground">Only active funds appear on public page</p>
              </div>
              <Switch
                id="is-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
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
