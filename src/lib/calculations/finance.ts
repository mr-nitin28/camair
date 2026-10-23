/**
 * Pure calculation functions for Financial Engine & Ledger
 * Uses integer minor units (paise) to prevent IEEE-754 floating-point rounding errors.
 */

export interface PaymentItem {
  amountMinorUnits: number;
  status: 'verified' | 'initiated' | 'failed' | 'refunded';
}

export interface FeeBalanceMetrics {
  assignedMinorUnits: number;
  concessionMinorUnits: number;
  netPayableMinorUnits: number;
  verifiedPaidMinorUnits: number;
  pendingVerificationMinorUnits: number;
  outstandingBalanceMinorUnits: number;
  isFullyPaid: boolean;
  hasOverpayment: boolean;
  overpaidMinorUnits: number;
}

/**
 * Calculates fee balances using double-entry integer arithmetic.
 * 
 * Invariants:
 * - Output balances are never negative
 * - Only verified payments reduce the outstanding balance
 * - Floating point is strictly avoided in ledger math
 */
export function calculateFeeBalance(
  assignedMinorUnits: number,
  concessionMinorUnits: number = 0,
  payments: PaymentItem[] = []
): FeeBalanceMetrics {
  const assigned = Math.max(0, Math.floor(assignedMinorUnits || 0));
  const concession = Math.max(0, Math.floor(concessionMinorUnits || 0));
  const netPayable = Math.max(0, assigned - concession);

  let verifiedPaid = 0;
  let pendingVerification = 0;

  for (const payment of payments) {
    const amt = Math.max(0, Math.floor(payment.amountMinorUnits || 0));
    if (payment.status === 'verified') {
      verifiedPaid += amt;
    } else if (payment.status === 'initiated') {
      pendingVerification += amt;
    }
  }

  const outstanding = Math.max(0, netPayable - verifiedPaid);
  const isFullyPaid = verifiedPaid >= netPayable;
  const hasOverpayment = verifiedPaid > netPayable;
  const overpaid = hasOverpayment ? verifiedPaid - netPayable : 0;

  return {
    assignedMinorUnits: assigned,
    concessionMinorUnits: concession,
    netPayableMinorUnits: netPayable,
    verifiedPaidMinorUnits: verifiedPaid,
    pendingVerificationMinorUnits: pendingVerification,
    outstandingBalanceMinorUnits: outstanding,
    isFullyPaid,
    hasOverpayment,
    overpaidMinorUnits: overpaid,
  };
}

/**
 * Formats minor units (e.g., paise) into human-readable currency representation.
 * Example: 7500000 paise -> "₹75,000.00"
 */
export function formatMinorUnits(
  minorUnits: number,
  currency: string = 'INR',
  locale: string = 'en-IN'
): string {
  const major = (minorUnits || 0) / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
}
