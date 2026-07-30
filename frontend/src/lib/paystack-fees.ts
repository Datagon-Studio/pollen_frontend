/** Combined platform and payment-processing fee for online contributions. */
export const PAYMENT_FEE_RATE = 0.025;

export function calculatePaymentAmounts(desiredAmount: number): {
  contributionAmount: number;
  feeAmount: number;
  chargedAmount: number;
} {
  if (!Number.isFinite(desiredAmount) || desiredAmount <= 0) {
    return {
      contributionAmount: 0,
      feeAmount: 0,
      chargedAmount: 0,
    };
  }

  const feeAmount = Math.round(desiredAmount * PAYMENT_FEE_RATE * 100) / 100;
  const chargedAmount = Math.round((desiredAmount + feeAmount) * 100) / 100;

  return {
    contributionAmount: desiredAmount,
    feeAmount,
    chargedAmount,
  };
}
