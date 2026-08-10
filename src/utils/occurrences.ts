import {
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
} from 'date-fns';
import type { BillingCycle, Category, ItemType, ItemWithCategory } from '@/types';
import { UNCATEGORIZED_CATEGORY_COLOR, resolveItemCategoryDisplay } from './categories';
import { formatISODate, getToday, parseLocalDate } from './dates';

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
 * Padded by one index each way as a safety margin. The padding is not
 * currently load-bearing — `addMonths`/`addYears` clamp only the day and
 * never roll the month, so the index-to-month map is already exact — but
 * the extra indices are filtered by the range check below and cost nothing.
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

export type OccurrenceKind = 'charge' | 'trial-end';

export interface Occurrence {
  /** `${item.id}:${isoDate}:${kind}` — stable React key */
  id: string;
  item: ItemWithCategory;
  /** local midnight */
  date: Date;
  isoDate: string;
  /** the charge amount; always 0 for a trial-end marker */
  amount: number;
  kind: OccurrenceKind;
  /** date is strictly before today */
  isPast: boolean;
  /** a charge that should have landed and was never superseded */
  isOverdue: boolean;
}

export interface ItemSchedule {
  anchor: Date;
  cycle: BillingCycle;
  /** no occurrence before this date */
  earliest: Date;
  /** no occurrence after this date, inclusive; null is open-ended */
  latest: Date | null;
  /** start of the suppressed window, or null when not paused */
  pausedFrom: Date | null;
  /** end of the suppressed window, exclusive; null means indefinite */
  pausedUntil: Date | null;
  trialEnd: Date | null;
}

/**
 * Stands in for `category_id === null` so "uncategorised" can be selected
 * and deselected like any other category. Without it, uncategorised items
 * silently vanish the moment any category filter is applied.
 */
export const UNCATEGORIZED_FILTER_ID = '__uncategorized__';

export interface OccurrenceFilters {
  itemType?: ItemType | 'all';
  /**
   * null means no category filter at all. A non-null array filters to
   * those ids; items with a null `category_id` match only when the array
   * contains UNCATEGORIZED_FILTER_ID.
   */
  categoryIds?: string[] | null;
  /** default true */
  includePaused?: boolean;
  /** default true */
  includeCancelled?: boolean;
  /** default false */
  includeArchived?: boolean;
}

function parseOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = parseLocalDate(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const laterOf = (a: Date, b: Date) => (a.getTime() >= b.getTime() ? a : b);
const earlierOf = (a: Date, b: Date) => (a.getTime() <= b.getTime() ? a : b);

/**
 * Collapses an item's lifecycle fields into the window its charges may
 * occupy. Returns null when the item carries no usable anchor.
 */
export function getItemSchedule(item: ItemWithCategory): ItemSchedule | null {
  const anchor = parseOrNull(item.next_billing_date);
  if (!anchor) return null;

  const trialEnd = parseOrNull(item.trial_end_date);
  let earliest = parseOrNull(item.start_date) ?? anchor;

  // A trial's first charge cannot land before the trial lapses.
  if (item.status === 'trial' && trialEnd) {
    earliest = laterOf(earliest, trialEnd);
  }

  const cancelled = parseOrNull(item.cancellation_date) ?? parseOrNull(item.cancelled_at);
  const archived = parseOrNull(item.archived_at);
  let latest: Date | null = cancelled;
  if (archived) latest = latest ? earlierOf(latest, archived) : archived;

  return {
    anchor,
    cycle: item.billing_cycle,
    earliest,
    latest,
    // paused_at can be stale on a resumed item, so it only gates while the
    // item is actually paused.
    pausedFrom: item.status === 'paused' ? parseOrNull(item.paused_at) : null,
    pausedUntil: item.status === 'paused' ? parseOrNull(item.paused_until) : null,
    trialEnd,
  };
}

function isScheduleOpen(schedule: ItemSchedule, date: Date): boolean {
  if (date.getTime() < schedule.earliest.getTime()) return false;
  if (schedule.latest && date.getTime() > schedule.latest.getTime()) return false;

  if (schedule.pausedFrom && date.getTime() >= schedule.pausedFrom.getTime()) {
    if (!schedule.pausedUntil) return false;
    if (date.getTime() < schedule.pausedUntil.getTime()) return false;
  }

  return true;
}

function inRange(date: Date, start: Date, end: Date): boolean {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function passesFilters(item: ItemWithCategory, filters: OccurrenceFilters): boolean {
  if (filters.itemType && filters.itemType !== 'all' && item.item_type !== filters.itemType) {
    return false;
  }

  if (filters.categoryIds) {
    const key = item.category_id ?? UNCATEGORIZED_FILTER_ID;
    if (!filters.categoryIds.includes(key)) return false;
  }

  if (item.status === 'paused' && filters.includePaused === false) return false;
  if (item.status === 'cancelled' && filters.includeCancelled === false) return false;
  if (item.status === 'archived' && filters.includeArchived !== true) return false;

  return true;
}

function buildOccurrence(
  item: ItemWithCategory,
  date: Date,
  kind: OccurrenceKind,
  today: Date,
): Occurrence {
  const isoDate = formatISODate(date);
  const isPast = date.getTime() < today.getTime();

  return {
    id: `${item.id}:${isoDate}:${kind}`,
    item,
    date,
    isoDate,
    amount: kind === 'charge' ? item.amount : 0,
    kind,
    isPast,
    isOverdue: kind === 'charge' && isPast && item.status === 'active',
  };
}

/**
 * Every occurrence landing inside [rangeStart, rangeEnd], sorted by date
 * then by descending amount. This is the only recurrence entry point —
 * lenses, totals, and the cash-flow strip all fold over its output.
 */
export function projectOccurrences(
  items: ItemWithCategory[],
  rangeStart: Date,
  rangeEnd: Date,
  filters: OccurrenceFilters = {},
): Occurrence[] {
  const today = getToday();
  const result: Occurrence[] = [];

  for (const item of items) {
    if (!passesFilters(item, filters)) continue;

    const schedule = getItemSchedule(item);
    if (!schedule) continue;

    if (
      item.status === 'trial' &&
      schedule.trialEnd &&
      inRange(schedule.trialEnd, rangeStart, rangeEnd)
    ) {
      result.push(buildOccurrence(item, schedule.trialEnd, 'trial-end', today));
    }

    const { lo, hi } = occurrenceIndexBounds(schedule.anchor, schedule.cycle, rangeStart, rangeEnd);
    for (let n = lo; n <= hi; n += 1) {
      const date = occurrenceAt(schedule.anchor, schedule.cycle, n);
      if (!inRange(date, rangeStart, rangeEnd)) continue;
      if (!isScheduleOpen(schedule, date)) continue;
      result.push(buildOccurrence(item, date, 'charge', today));
    }
  }

  return result.sort((a, b) => {
    const byDate = a.date.getTime() - b.date.getTime();
    if (byDate !== 0) return byDate;
    const byAmount = b.amount - a.amount;
    if (byAmount !== 0) return byAmount;
    return a.item.name.localeCompare(b.item.name);
  });
}

export interface DaySummary {
  total: number;
  /**
   * Charge-kind occurrences only — a trial-end marker carries `amount: 0`
   * and is not a charge, so it must not inflate this count (it would make
   * a trial-only day report "1 charge, $0.00").
   */
  chargeCount: number;
  /** category colour of the largest charge; null when the day is empty */
  accentColor: string | null;
  hasOverdue: boolean;
  hasTrialEnd: boolean;
}

export function groupByDay(occurrences: Occurrence[]): Map<string, Occurrence[]> {
  const grouped = new Map<string, Occurrence[]>();

  for (const occurrence of occurrences) {
    const bucket = grouped.get(occurrence.isoDate);
    if (bucket) bucket.push(occurrence);
    else grouped.set(occurrence.isoDate, [occurrence]);
  }

  return grouped;
}

export function sumOccurrences(occurrences: Occurrence[]): number {
  return occurrences.reduce((total, occurrence) => total + occurrence.amount, 0);
}

/**
 * Everything DayCell needs, so the component derives nothing itself.
 * The accent follows the largest charge — a single hue reads faster than
 * a blend, and the biggest charge is the one worth flagging.
 */
export function summariseDay(
  occurrences: Occurrence[],
  categoryLookup: ReadonlyMap<string, Category>,
): DaySummary {
  if (occurrences.length === 0) {
    return { total: 0, chargeCount: 0, accentColor: null, hasOverdue: false, hasTrialEnd: false };
  }

  const charges = occurrences.filter((occurrence) => occurrence.kind === 'charge');
  const largest = charges.reduce<Occurrence | null>(
    (best, occurrence) => (!best || occurrence.amount > best.amount ? occurrence : best),
    null,
  );

  return {
    total: sumOccurrences(occurrences),
    chargeCount: charges.length,
    accentColor: largest
      ? resolveItemCategoryDisplay(largest.item, categoryLookup).color
      : UNCATEGORIZED_CATEGORY_COLOR,
    hasOverdue: occurrences.some((occurrence) => occurrence.isOverdue),
    hasTrialEnd: occurrences.some((occurrence) => occurrence.kind === 'trial-end'),
  };
}
