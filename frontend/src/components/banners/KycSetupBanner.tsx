import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/hooks/useAccount";
import { useAuth } from "@/hooks/useAuth";
import { settlementApi } from "@/services/settlement.api";
import { Banknote, ShieldAlert, X } from "lucide-react";

const STORAGE_PREFIX = "pollen:banner:kyc-bank:v1";

function getStorageKey(accountId?: string) {
  return accountId ? `${STORAGE_PREFIX}:${accountId}` : `${STORAGE_PREFIX}:unknown`;
}

export function KycSetupBanner() {
  const { user } = useAuth();
  const { account, loading: accountLoading } = useAccount(user?.id);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [settlementReady, setSettlementReady] = useState<boolean | null>(null);

  const storageKey = useMemo(() => getStorageKey(account?.account_id), [account?.account_id]);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(storageKey) === "1");
    } catch {
      // Ignore storage access issues (private mode, blocked, etc.)
      setDismissed(false);
    }
  }, [storageKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadSettlement() {
      try {
        const settlements = await settlementApi.getMySettlementDetails();
        const active = settlements.find((s) => s.is_active);
        if (!cancelled) setSettlementReady(Boolean(active));
      } catch {
        // If we can't determine, keep the banner visible (safer).
        if (!cancelled) setSettlementReady(false);
      }
    }

    if (!accountLoading) {
      loadSettlement();
    }

    return () => {
      cancelled = true;
    };
  }, [accountLoading]);

  const needsKyc = account ? account.kyc_status !== "verified" : false;
  const needsSettlement = settlementReady === null ? false : !settlementReady;

  const shouldShow =
    !accountLoading && settlementReady !== null && !dismissed && (needsKyc || needsSettlement);

  if (!shouldShow) return null;

  return (
    <Alert className="relative mb-6 border-amber/30 bg-amber/5">
      <div className="flex gap-3">
        <div className="mt-0.5 flex items-center gap-2 text-amber-dark">
          <ShieldAlert className="h-5 w-5" />
          <Banknote className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <AlertTitle>Enable online member contributions</AlertTitle>
          <AlertDescription>
            <p className="text-muted-foreground">
              Please complete KYC and add your bank details in Settings to enable online member
              contributions. In the meantime, you can only record contributions manually.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/settings">Go to Settings</Link>
              </Button>
            </div>
          </AlertDescription>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          try {
            window.localStorage.setItem(storageKey, "1");
          } catch {
            // ignore
          }
        }}
        className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
}

