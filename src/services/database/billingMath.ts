import type { BillingCycle } from '@/types';

function assertNeverBillingCycle(value: never): never {
  throw new Error(`Unsupported billing cycle: ${value}`);
}

export function toMonthlyAmount(
  amount: number,
  billingCycle: BillingCycle,
): number {
  switch (billingCycle) {
    case 'weekly':
      return (amount * 52) / 12;
    case 'monthly':
      return amount;
    case 'quarterly':
      return amount / 3;
    case 'yearly':
      return amount / 12;
    default:
      return assertNeverBillingCycle(billingCycle);
  }
}

export function toYearlyAmount(
  amount: number,
  billingCycle: BillingCycle,
): number {
  switch (billingCycle) {
    case 'weekly':
      return amount * 52;
    case 'monthly':
      return amount * 12;
    case 'quarterly':
      return amount * 4;
    case 'yearly':
      return amount;
    default:
      return assertNeverBillingCycle(billingCycle);
  }
}
