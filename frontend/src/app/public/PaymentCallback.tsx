import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { paymentApi } from "@/services/payment.api";
import { configApi } from "@/services/config.api";
import { useToast } from "@/hooks/use-toast";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying payment...");
  const [currencyCode, setCurrencyCode] = useState<string>("GHS");

  useEffect(() => {
    const reference = searchParams.get("reference");
    const trxref = searchParams.get("trxref");

    if (!reference && !trxref) {
      setStatus("error");
      setMessage("No payment reference found");
      return;
    }

    const verifyPayment = async () => {
      try {
        const paymentRef = reference || trxref || "";
        const result = await paymentApi.verifyPayment(paymentRef);

        if (result.status === "success") {
          // Try to load currency from stored account config (if available)
          const storedAccountId = localStorage.getItem('payment_callback_accountId');
          if (storedAccountId) {
            try {
              const publicConfig = await configApi.getPublicConfig(storedAccountId);
              setCurrencyCode(publicConfig.currency_code || 'GHS');
            } catch {
              setCurrencyCode('GHS');
            }
          }
          const prefix = currencyCode === "GHS" ? "GH₵" : `${currencyCode} `;
          setStatus("success");
          setMessage(`Payment of ${prefix}${result.amount.toFixed(2)} verified successfully!`);
          
          toast({
            title: "Payment Successful",
            description: `Your contribution of ${prefix}${result.amount.toFixed(2)} has been confirmed.`,
          });

          // Redirect after 3 seconds (give webhook time to process)
          setTimeout(() => {
            // Get accountId from localStorage (stored before redirecting to Paystack)
            const accountId = localStorage.getItem('payment_callback_accountId');
            if (accountId) {
              localStorage.removeItem('payment_callback_accountId');
              // Store flag to force reload contributions when page loads
              localStorage.setItem('payment_completed_reload', 'true');
              // Redirect to group page with contributions tab active
              navigate(`/group/${accountId}?tab=contributions`);
            } else {
              // Fallback: try to extract from URL or navigate to landing
              const currentPath = window.location.pathname;
              const accountIdMatch = currentPath.match(/\/group\/([^\/]+)/);
              if (accountIdMatch) {
                localStorage.setItem('payment_completed_reload', 'true');
                navigate(`/group/${accountIdMatch[1]}?tab=contributions`);
              } else {
                navigate("/group");
              }
            }
          }, 3000);
        } else {
          setStatus("error");
          setMessage("Payment verification failed");
        }
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Failed to verify payment");
        
        toast({
          title: "Payment Verification Failed",
          description: "We couldn't verify your payment. Please contact support if you were charged.",
          variant: "destructive",
        });
      }
    };

    verifyPayment();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            {status === "loading" && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-amber" />
                <p className="text-center text-muted-foreground">{message}</p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle2 className="h-12 w-12 text-success" />
                <p className="text-center font-medium text-foreground">{message}</p>
                <p className="text-center text-sm text-muted-foreground">
                  Redirecting you back...
                </p>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="h-12 w-12 text-destructive" />
                <p className="text-center font-medium text-destructive">{message}</p>
                <Button onClick={() => navigate("/group")} className="mt-4">
                  Go Back
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
