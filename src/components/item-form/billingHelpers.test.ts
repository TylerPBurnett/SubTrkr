import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { parseLocalDate } from '@/utils/dates';
import { getAnchoredNextBillingDate } from './billingHelpers';

/**
 * Fixed reference date for deterministic tests. All "advance past today"
 * logic uses this instead of the real clock.
 */
const REF = parseLocalDate('2026-04-09');
const REF_STR = '2026-04-09';

describe('getAnchoredNextBillingDate — Phase 0 regression guard', () => {
  /**
   * THE critical regression test. The Phase 0 bug was: changing billing cycle
   * in the form recalculated next_billing_date from `today` instead of from
   * `start_date`. This shifted billing cadence away from the item's recurrence
   * anchor. The fix was to always prefer start_date when it's available.
   */
  test('uses start_date as anchor, NOT today, when start_date is provided', () => {
    const startDate = '2025-01-15';

    const monthly = getAnchoredNextBillingDate(startDate, 'monthly', REF_STR, REF);
    const quarterly = getAnchoredNextBillingDate(startDate, 'quarterly', REF_STR, REF);
    const yearly = getAnchoredNextBillingDate(startDate, 'yearly', REF_STR, REF);

    // Day-of-month must match the anchor (15th), not the reference date (9th)
    assert.equal(monthly, '2026-04-15');
    assert.equal(quarterly, '2026-04-15');
    assert.equal(yearly, '2027-01-15');
  });

  test('falls back to today string when anchor is null', () => {
    const result = getAnchoredNextBillingDate(null, 'monthly', REF_STR, REF);

    // With null anchor, falls back to REF_STR ("2026-04-09") as the anchor.
    // Monthly from Apr 9 past Apr 9 → May 9.
    assert.equal(result, '2026-05-09');
  });

  test('falls back to today string when anchor is undefined', () => {
    const result = getAnchoredNextBillingDate(undefined, 'monthly', REF_STR, REF);

    assert.equal(result, '2026-05-09');
  });

  test('changing billing cycle preserves the start_date anchor day', () => {
    const startDate = '2025-06-22';

    const monthly = getAnchoredNextBillingDate(startDate, 'monthly', REF_STR, REF);
    const quarterly = getAnchoredNextBillingDate(startDate, 'quarterly', REF_STR, REF);
    const yearly = getAnchoredNextBillingDate(startDate, 'yearly', REF_STR, REF);

    // All three land on the 22nd — the anchor day never drifts
    assert.equal(monthly, '2026-04-22');
    assert.equal(quarterly, '2026-06-22');
    assert.equal(yearly, '2026-06-22');
  });

  test('result is always strictly after the reference date', () => {
    const ancientStart = '2020-03-10';

    const result = getAnchoredNextBillingDate(ancientStart, 'monthly', REF_STR, REF);

    // Mar 10 advances monthly → Apr 10 is the first date after Apr 9
    assert.equal(result, '2026-04-10');
    assert.ok(result > REF_STR);
  });

  test('weekly cycle anchors to the same weekday', () => {
    const startDate = '2025-01-06'; // a Monday
    const result = getAnchoredNextBillingDate(startDate, 'weekly', REF_STR, REF);

    // Apr 9 is a Thursday. Next Monday after Apr 9 is Apr 13.
    assert.equal(result, '2026-04-13');
    const resultDate = parseLocalDate(result);
    assert.equal(resultDate.getDay(), 1, 'should land on Monday');
  });

  /**
   * Cycle-specific output tests with exact expected values. These catch an
   * implementation that always advances monthly regardless of the cycle arg.
   */
  test('quarterly advances by 3 months, not 1', () => {
    // Anchor Feb 10, ref Apr 9 → Feb is past, May 10 is next quarter boundary
    const result = getAnchoredNextBillingDate('2025-02-10', 'quarterly', REF_STR, REF);

    assert.equal(result, '2026-05-10');
  });

  test('yearly advances by 12 months, not 1 or 3', () => {
    // Anchor Mar 20, ref Apr 9 → Mar 2026 is past, next is Mar 2027
    const result = getAnchoredNextBillingDate('2025-03-20', 'yearly', REF_STR, REF);

    assert.equal(result, '2027-03-20');
  });

  test('monthly is at most 31 days past the reference date', () => {
    const result = getAnchoredNextBillingDate('2025-01-15', 'monthly', REF_STR, REF);

    assert.equal(result, '2026-04-15');
    const diffDays = Math.round(
      (parseLocalDate(result).getTime() - REF.getTime()) / 86_400_000,
    );
    assert.ok(diffDays >= 1 && diffDays <= 31, `expected 1-31 days, got ${diffDays}`);
  });
});
