import { FundSettlementAvailability } from "@/services/fund-settlement.api";
import { getCurrencyPrefix } from "@/lib/currencies";
import { Button } from "@/components/ui/button";

interface SettlementAvailabilitySummaryProps {
  availability: FundSettlementAvailability | null;
  loading: boolean;
  currencyCode: string;
  /** Amount the user is requesting; fee is deducted from this. */
  requestedAmount?: number;
  onUseMax?: () => void;
}

function roundMoney(amount: number): number {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

export function SettlementAvailabilitySummary({
  availability,
  loading,
  currencyCode,
  requestedAmount = 0,
  onUseMax,
}: SettlementAvailabilitySummaryProps) {
  const formatAmount = (amount: number) =>
    `${getCurrencyPrefix(currencyCode)}${amount.toFixed(2)}`;

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
  const feeRate =
    availability.feePercent != null && Number.isFinite(availability.feePercent)
      ? availability.feePercent / 100
      : 0;
  const hasRequest = requestedAmount > 0;
  const transactionFee = hasRequest ? roundMoney(requestedAmount * feeRate) : 0;
  const amountToSettle = hasRequest
    ? roundMoney(requestedAmount - transactionFee)
    : null;

  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-3 space-y-2 text-sm">
      <div className="flex justify-between text-muted-foreground">
        <span>Online payments</span>
        <span>{formatAmount(availability.onlineCollected)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Already settled</span>
        <span>{formatAmount(availability.reservedAmount)}</span>
      </div>
      {feeRate > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>
            Transaction fee
            {availability.feePercent != null ? ` (${availability.feePercent}%)` : ""}
          </span>
          <span>{formatAmount(transactionFee)}</span>
        </div>
      )}
      <div className="flex items-center justify-between font-medium text-foreground pt-1 border-t border-border">
        <span>Maximum withdrawable</span>
        <span>{formatAmount(availability.availableAmount)}</span>
      </div>
      {amountToSettle != null && feeRate > 0 && (
        <div className="flex justify-between font-medium text-foreground">
          <span>Amount to be settled</span>
          <span>{formatAmount(amountToSettle)}</span>
        </div>
      )}
      {feeRate > 0 && (
        <p className="text-xs text-muted-foreground">
          Transaction fees are deducted from the amount you request.
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
