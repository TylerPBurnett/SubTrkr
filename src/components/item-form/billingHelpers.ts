import type { BillingCycle } from '@/types';
import { getNextFutureBillingDate } from '@/utils/dates';

/**
 * Resolves the next billing date anchored to the item's start_date.
 * Falls back to `today` only when no anchor date is available.
 *
 * Phase 0 regression guard: this MUST prefer anchorDate over today
 * when anchorDate is provided. The original bug used today unconditionally,
 * which shifted billing cadence away from the item's recurrence anchor.
 *
 * @param referenceDate - Optional clock override for testability. Defaults to
 *   the real current date in production. Tests pass a fixed date to get
 *   deterministic results.
 */
export function getAnchoredNextBillingDate(
  anchorDate: string | null | undefined,
  billingCycle: BillingCycle,
  today: string,
  referenceDate?: Date,
): string {
  return getNextFutureBillingDate(
    anchorDate || today,
    billingCycle,
    referenceDate,
  );
}
