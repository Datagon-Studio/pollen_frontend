import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { paymentApi } from "@/services/payment.api";
import { configApi } from "@/services/config.api";
import { accountPublicPageApi } from "@/services/account-public-page.api";
import { getThemeColors, getThemeStyles } from "@/lib/theme-utils";
import { useToast } from "@/hooks/use-toast";

function resolveAccountId(
  searchParams: URLSearchParams,
  verifiedAccountId?: string | null
): string | null {
  return (
    searchParams.get("accountId") ||
    searchParams.get("account_id") ||
    verifiedAccountId ||
    localStorage.getItem("payment_callback_accountId") ||
    sessionStorage.getItem("payment_callback_accountId")
  );
}

function redirectToGroup(accountId: string, navigate: ReturnType<typeof useNavigate>) {
  localStorage.removeItem("payment_callback_accountId");
  sessionStorage.removeItem("payment_callback_accountId");
  localStorage.setItem("payment_completed_reload", "true");
  navigate(`/group/${accountId}?tab=contributions`, { replace: true });
}

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying payment...");
  const [currencyCode, setCurrencyCode] = useState<string>("GHS");
  const [publicPage, setPublicPage] = useState<any>(null);
  const [redirectAccountId, setRedirectAccountId] = useState<string | null>(null);

  useEffect(() => {
    const accountId = resolveAccountId(searchParams);
    if (accountId) {
      accountPublicPageApi.getPublicPage(accountId)
        .then(setPublicPage)
        .catch(err => console.error("Error loading public page details:", err));
    }
  }, [searchParams]);

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
        const accountId = resolveAccountId(searchParams, result.account_id);
        setRedirectAccountId(accountId);

        if (result.status === "success") {
          let resolvedCurrency = "GHS";
          if (accountId) {
            try {
              const publicConfig = await configApi.getPublicConfig(accountId);
              resolvedCurrency = publicConfig.currency_code || "GHS";
              setCurrencyCode(resolvedCurrency);
            } catch {
              setCurrencyCode("GHS");
            }
          }

          const prefix = resolvedCurrency === "GHS" ? "GH₵" : `${resolvedCurrency} `;
          const formattedAmount = `${prefix}${result.amount.toFixed(2)}`;
          setStatus("success");

          if (!result.contribution_id) {
            setMessage(
              `Payment of ${formattedAmount} was received, but we could not record it against your account. Please contact the group admin with reference ${result.reference}.`
            );
            toast({
              title: "Payment received, but not recorded",
              description:
                result.recording_error ||
                "Your payment went through but could not be saved. Please contact the group admin.",
              variant: "destructive",
            });
          } else {
            setMessage(`Payment of ${formattedAmount} verified successfully!`);
            toast({
              title: "Payment Successful",
              description: `Your contribution of ${formattedAmount} has been confirmed.`,
            });
          }

          if (accountId) {
            setTimeout(() => {
              redirectToGroup(accountId, navigate);
            }, 2000);
          } else {
            setMessage(
              "Payment verified successfully, but we could not determine which group to return you to."
            );
          }
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

  const themeColors = getThemeColors(publicPage);
  const themeStyles = getThemeStyles(themeColors);

  const handleContinue = () => {
    if (redirectAccountId) {
      redirectToGroup(redirectAccountId, navigate);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 transition-colors duration-300">
      <style dangerouslySetInnerHTML={{ __html: themeStyles }} />
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
                {redirectAccountId ? (
                  <>
                    <p className="text-center text-sm text-muted-foreground">
                      Redirecting you back to your group...
                    </p>
                    <Button onClick={handleContinue} className="mt-2">
                      View My Contributions
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => navigate("/group")} className="mt-2">
                    Find Your Group
                  </Button>
                )}
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="h-12 w-12 text-destructive" />
                <p className="text-center font-medium text-destructive">{message}</p>
                <Button
                  onClick={() => {
                    const accountId = resolveAccountId(searchParams);
                    if (accountId) {
                      redirectToGroup(accountId, navigate);
                    } else {
                      navigate("/group");
                    }
                  }}
                  className="mt-4"
                >
                  {resolveAccountId(searchParams) ? "Back to Group" : "Go Back"}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
