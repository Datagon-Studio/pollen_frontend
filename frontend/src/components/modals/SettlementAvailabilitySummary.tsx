import { FundSettlementAvailability } from "@/services/fund-settlement.api";
import { getCurrencyPrefix } from "@/lib/currencies";

interface SettlementAvailabilitySummaryProps {
  availability: FundSettlementAvailability | null;
  loading: boolean;
  currencyCode: string;
  /** Amount the user is requesting; the settlement fee is deducted from this. */
  requestedAmount?: number;
}

function roundMoney(amount: number): number {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

export function SettlementAvailabilitySummary({
  availability,
  loading,
  currencyCode,
  requestedAmount = 0,
}: SettlementAvailabilitySummaryProps) {
  const formatAmount = (amount: number) =>
    `${getCurrencyPrefix(currencyCode)}${amount.toFixed(2)}`;

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Calculating available balance...</p>
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
  const requested = Number.isFinite(requestedAmount) && requestedAmount > 0 ? requestedAmount : 0;
  const settlementFee = roundMoney(requested * feeRate);
  const amountToSettle = roundMoney(Math.max(0, requested - settlementFee));

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
      <div className="flex justify-between text-muted-foreground">
        <span>Maximum withdrawable</span>
        <span>{formatAmount(availability.availableAmount)}</span>
      </div>
      <div className="flex justify-between font-medium text-foreground pt-1 border-t border-border">
        <span>Requested amount</span>
        <span>{formatAmount(requested)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>
          Settlement fee
          {availability.feePercent != null ? ` (${availability.feePercent}%)` : ""}
        </span>
        <span>{formatAmount(settlementFee)}</span>
      </div>
      <div className="flex justify-between font-medium text-foreground">
        <span>Amount to be settled</span>
        <span>{formatAmount(amountToSettle)}</span>
      </div>
      {feeRate > 0 && (
        <p className="text-xs text-muted-foreground">
          Settlement fees are deducted from the amount you request.
        </p>
      )}
      {!hasBalance && (
        <p className="text-xs text-destructive">
          This fund has no remaining balance to settle.
        </p>
      )}
    </div>
  );
}
