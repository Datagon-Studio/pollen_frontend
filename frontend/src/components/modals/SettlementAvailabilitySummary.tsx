import { FundSettlementAvailability } from "@/services/fund-settlement.api";
import { getCurrencySymbol } from "@/lib/currencies";
import { Button } from "@/components/ui/button";

interface SettlementAvailabilitySummaryProps {
  availability: FundSettlementAvailability | null;
  loading: boolean;
  currencyCode: string;
  onUseMax?: () => void;
}

export function SettlementAvailabilitySummary({
  availability,
  loading,
  currencyCode,
  onUseMax,
}: SettlementAvailabilitySummaryProps) {
  const formatAmount = (amount: number) =>
    `${getCurrencySymbol(currencyCode)}${amount.toFixed(2)}`;

  if (loading) {
    return (
      <div className="rounded-md border border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
        Calculating available balance...
      </div>
    );
  }

  if (!availability) {
    return null;
  }

  const hasBalance = availability.availableAmount > 0;

  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-3 space-y-2 text-sm">
      <div className="flex justify-between text-muted-foreground">
        <span>Confirmed in fund</span>
        <span>{formatAmount(availability.collected)}</span>
      </div>
      {availability.feeAmount > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>Transaction fees (2%)</span>
          <span>{formatAmount(availability.feeAmount)}</span>
        </div>
      )}
      <div className="flex justify-between text-muted-foreground">
        <span>Already requested</span>
        <span>{formatAmount(availability.reservedAmount)}</span>
      </div>
      <div className="flex items-center justify-between font-medium text-foreground pt-1 border-t border-border">
        <span>Maximum requestable</span>
        <span>{formatAmount(availability.availableAmount)}</span>
      </div>
      {availability.feeAmount > 0 && (
        <p className="text-xs text-muted-foreground">
          Transaction fees were paid by contributors and are not taken from this fund.
        </p>
      )}
      {!hasBalance && (
        <p className="text-xs text-destructive">
          This fund has no remaining balance to settle.
        </p>
      )}
      {hasBalance && onUseMax && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-0 text-amber hover:text-amber-dark"
          onClick={onUseMax}
        >
          Use maximum
        </Button>
      )}
    </div>
  );
}
