/**
 * Paystack Ghana local transaction fees (cards, mobile money, bank transfer).
 * @see https://support.paystack.com/en/articles/2130306
 * @see https://paystack.com/gh/pricing
 */
export const PAYSTACK_GH_FEE_RATE = 0.0195;

/**
 * Gross up a desired settlement amount so the merchant receives approximately
 * that amount after Paystack deducts its percentage fee.
 *
 * Official formula (percentage-only, no flat fee):
 *   Final Amount = (Price / (1 - Decimal Fee)) + 0.01
 */
export function calculateAmountWithPaystackFees(desiredAmount: number): {
  contributionAmount: number;
  chargedAmount: number;
  feeAmount: number;
} {
  if (!Number.isFinite(desiredAmount) || desiredAmount <= 0) {
    throw new Error('Desired amount must be a positive number');
  }

  const rawCharged = desiredAmount / (1 - PAYSTACK_GH_FEE_RATE) + 0.01;
  // Round to the nearest pesewa (GHS minor unit)
  const chargedAmount = Math.round(rawCharged * 100) / 100;
  const feeAmount = Math.round((chargedAmount - desiredAmount) * 100) / 100;

  return {
    contributionAmount: desiredAmount,
    chargedAmount,
    feeAmount,
  };
}
