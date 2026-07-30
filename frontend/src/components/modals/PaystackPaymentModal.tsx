import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CurrencyInput, getCurrencySymbol } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Fund } from "@/services/fund.api";
import { paymentApi, InitializePaymentInput } from "@/services/payment.api";
import { memberApi, Member } from "@/services/member.api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet } from "lucide-react";

interface PaystackPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fund: Fund | null;
  accountId: string;
  memberId?: string | null;
  memberName?: string | null;
  memberPhone?: string | null;
  onSuccess?: () => void;
}

export function PaystackPaymentModal({
  open,
  onOpenChange,
  fund,
  accountId,
  memberId,
  memberName,
  memberPhone,
  onSuccess,
}: PaystackPaymentModalProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [initializing, setInitializing] = useState(false);
  const [loadingMember, setLoadingMember] = useState(false);

  // Load member details when modal opens
  useEffect(() => {
    if (open && fund) {
      // Auto-fill form with member details if available
      if (memberName) {
        setName(memberName);
      }
      if (memberPhone) {
        setPhone(memberPhone);
      }
      // Set default amount
      setAmount(fund.default_amount?.toString() || "");
      
      // Try to fetch email if memberId is available (for authenticated users)
      if (memberId) {
        setLoadingMember(true);
        memberApi.getById(memberId)
          .then((response) => {
            if (response.success && response.data && response.data.email) {
              setEmail(response.data.email);
            }
          })
          .catch((error) => {
            // Silently fail - email will remain empty and user can fill it manually
            console.log("Could not fetch member email (may require authentication):", error);
          })
          .finally(() => {
            setLoadingMember(false);
          });
      } else {
        // Reset form when modal opens without member
        setEmail("");
        setName("");
        setPhone("");
        setAmount(fund.default_amount?.toString() || "");
      }
    }
  }, [open, fund, memberId, memberName, memberPhone]);

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

    if (fund.default_amount && amountNum < fund.default_amount) {
      toast({
        title: "Amount too low",
        description: `The minimum contribution for ${fund.fund_name} is ${getCurrencySymbol("GHS")}${fund.default_amount.toFixed(2)}.`,
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
        phone: phone.trim() || undefined,
        member_id: memberId || undefined,
      };

      const result = await paymentApi.initializePayment(paymentData);

      // Store accountId in localStorage for callback redirect
      localStorage.setItem('payment_callback_accountId', accountId);

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
      setPhone("");
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
          {loadingMember && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading your details...</span>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address(for payment receipt) *</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={initializing || loadingMember}
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
              disabled={initializing || loadingMember}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="XXX XXX XXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={initializing || loadingMember}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <CurrencyInput
              id="amount"
              currencyCode="GHS"
              step="0.01"
              min={fund.default_amount || 0.01}
              placeholder={fund.default_amount?.toString() || "0.00"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={initializing}
            />
            {fund.default_amount && (
              <p className="text-xs text-muted-foreground">
                Minimum: {getCurrencySymbol("GHS")}{fund.default_amount.toFixed(2)}
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
