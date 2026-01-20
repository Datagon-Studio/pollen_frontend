import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { paymentApi } from "@/services/payment.api";
import { contributionApi } from "@/services/contribution.api";
import { useAccount } from "@/hooks/useAccount";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { account } = useAccount();
  const { toast } = useToast();
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reference = searchParams.get("reference");
    
    if (!reference) {
      setStatus("failed");
      setError("No payment reference found");
      return;
    }

    verifyPayment(reference);
  }, [searchParams]);

  const verifyPayment = async (reference: string) => {
    try {
      // Verify payment with backend (this endpoint requires auth, but we'll handle errors)
      const verifyResponse = await paymentApi.verifyPayment(reference);
      
      if (!verifyResponse.success) {
        // If auth error, redirect to login with reference
        if (verifyResponse.error?.includes('Unauthorized')) {
          navigate(`/signin?redirect=/payment/callback&reference=${reference}`);
          return;
        }
        throw new Error(verifyResponse.error || "Failed to verify payment");
      }

      if (!verifyResponse.data?.verified) {
        setStatus("failed");
        setError("Payment verification failed");
        return;
      }

      // Get payment metadata from verification response
      const paymentData = verifyResponse.data.data;
      const metadata = paymentData.metadata || {};

      // Wait for account to be loaded if not available
      if (!account?.account_id) {
        // Wait a bit for account to load
        setTimeout(() => verifyPayment(reference), 1000);
        return;
      }

      // Create contribution with confirmed status
      if (metadata.account_id === account.account_id) {
        // Check if contribution already exists
        const existingContributions = await contributionApi.getByAccount(account.account_id);
        const existing = existingContributions.success && existingContributions.data
          ? existingContributions.data.find(c => c.payment_reference === reference)
          : null;

        if (existing) {
          // Contribution already exists
          setStatus("success");
          toast({
            title: "Payment Successful",
            description: `Contribution of $${verifyResponse.data.amount.toFixed(2)} was already recorded.`,
          });
          return;
        }

        const contributionResponse = await contributionApi.create({
          account_id: metadata.account_id,
          fund_id: metadata.fund_id,
          member_id: metadata.member_id || null,
          amount: verifyResponse.data.amount,
          channel: "online",
          payment_method: "Paystack",
          date_received: new Date().toISOString(),
          comment: metadata.comment || null,
          payment_reference: reference,
          status: "confirmed",
          received_by_user_id: null,
        });

        if (contributionResponse.success) {
          setStatus("success");
          toast({
            title: "Payment Successful",
            description: `Contribution of $${verifyResponse.data.amount.toFixed(2)} has been recorded.`,
          });
        } else {
          throw new Error(contributionResponse.error || "Failed to create contribution");
        }
      } else {
        throw new Error("Account mismatch");
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      setStatus("failed");
      setError(error instanceof Error ? error.message : "Payment verification failed");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Payment verification failed",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          {status === "verifying" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-amber mx-auto" />
              <h2 className="text-xl font-semibold">Verifying Payment...</h2>
              <p className="text-muted-foreground">Please wait while we confirm your payment</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 text-success mx-auto" />
              <h2 className="text-xl font-semibold text-success">Payment Successful!</h2>
              <p className="text-muted-foreground">Your contribution has been recorded successfully</p>
              <div className="flex gap-4 justify-center mt-6">
                <Button onClick={() => navigate("/admin/contributions")}>
                  View Contributions
                </Button>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Go to Dashboard
                </Button>
              </div>
            </>
          )}

          {status === "failed" && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-xl font-semibold text-destructive">Payment Failed</h2>
              <p className="text-muted-foreground">{error || "Payment could not be verified"}</p>
              <div className="flex gap-4 justify-center mt-6">
                <Button onClick={() => navigate("/admin/contributions")}>
                  Go to Contributions
                </Button>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Go to Dashboard
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
