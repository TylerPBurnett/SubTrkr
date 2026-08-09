import {
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
} from 'date-fns';
import type { BillingCycle } from '@/types';

/**
 * Runaway guard. A weekly item over a full year needs ~53 indices, so any
 * span past this means the bounds math went wrong rather than the data
 * being unusual.
 */
const MAX_INDICES_PER_ITEM = 400;

/**
 * Where occurrence `n` lands, always measured from the anchor.
 *
 * Never step from the previous result: a Jan 31 monthly anchor must yield
 * Feb 28 and then Mar 31. Iterating clamps to Feb 28 and then advances to
 * Mar 28, drifting permanently.
 */
export function occurrenceAt(anchor: Date, cycle: BillingCycle, n: number): Date {
  switch (cycle) {
    case 'weekly':
      return addWeeks(anchor, n);
    case 'monthly':
      return addMonths(anchor, n);
    case 'quarterly':
      return addMonths(anchor, n * 3);
    case 'yearly':
      return addYears(anchor, n);
    default:
      return anchor;
  }
}

/**
 * The smallest index span that can contain every occurrence inside the
 * range. Solved rather than searched, so cost tracks occurrences in range
 * instead of distance from the anchor — a 2005 anchor must not cost 250
 * iterations per item per render.
 *
 * Padded by one index each way to absorb month-end clamping.
 */
export function occurrenceIndexBounds(
  anchor: Date,
  cycle: BillingCycle,
  rangeStart: Date,
  rangeEnd: Date,
): { lo: number; hi: number } {
  let lo: number;
  let hi: number;

  switch (cycle) {
    case 'weekly':
      lo = Math.floor(differenceInCalendarDays(rangeStart, anchor) / 7) - 1;
      hi = Math.ceil(differenceInCalendarDays(rangeEnd, anchor) / 7) + 1;
      break;
    case 'monthly':
      lo = differenceInCalendarMonths(rangeStart, anchor) - 1;
      hi = differenceInCalendarMonths(rangeEnd, anchor) + 1;
      break;
    case 'quarterly':
      lo = Math.floor(differenceInCalendarMonths(rangeStart, anchor) / 3) - 1;
      hi = Math.ceil(differenceInCalendarMonths(rangeEnd, anchor) / 3) + 1;
      break;
    case 'yearly':
      lo = differenceInCalendarYears(rangeStart, anchor) - 1;
      hi = differenceInCalendarYears(rangeEnd, anchor) + 1;
      break;
    default:
      return { lo: 0, hi: -1 };
  }

  return { lo, hi: Math.min(hi, lo + MAX_INDICES_PER_ITEM) };
}
