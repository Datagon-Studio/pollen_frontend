import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Fund } from "@/services/fund.api";
import { paymentApi, InitializePaymentInput } from "@/services/payment.api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet } from "lucide-react";

interface PaystackPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fund: Fund | null;
  accountId: string;
  onSuccess?: () => void;
}

export function PaystackPaymentModal({
  open,
  onOpenChange,
  fund,
  accountId,
  onSuccess,
}: PaystackPaymentModalProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    if (open && fund) {
      // Reset form when modal opens
      setEmail("");
      setName("");
      setAmount(fund.default_amount?.toString() || "");
    }
  }, [open, fund]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fund) return;

    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setInitializing(true);

      const paymentData: InitializePaymentInput = {
        account_id: accountId,
        fund_id: fund.fund_id,
        amount: amountNum,
        email: email.trim(),
        name: name.trim() || "Anonymous Donor",
      };

      const result = await paymentApi.initializePayment(paymentData);

      // Redirect to Paystack payment page
      window.location.href = result.authorization_url;
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to initialize payment",
        variant: "destructive",
      });
      setInitializing(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setEmail("");
      setName("");
      setAmount(fund?.default_amount?.toString() || "");
    }
    onOpenChange(isOpen);
  };

  if (!fund) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-amber" />
            Contribute to {fund.fund_name}
          </DialogTitle>
          <DialogDescription>
            Enter your payment details to proceed with your contribution
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={initializing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name (Optional)</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={initializing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (GHS) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder={fund.default_amount?.toString() || "0.00"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={initializing}
            />
            {fund.default_amount && (
              <p className="text-xs text-muted-foreground">
                Suggested: ${fund.default_amount.toFixed(2)}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={initializing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={initializing} className="flex-1">
              {initializing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Proceed to Payment"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
