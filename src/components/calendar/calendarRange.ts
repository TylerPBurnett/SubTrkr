import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';

export type CalendarLens = 'week' | 'month' | 'year';

export interface CalendarRange {
  /** the period the lens is about, inclusive */
  rangeStart: Date;
  rangeEnd: Date;
  /** what is actually drawn — week-padded, inclusive */
  gridStart: Date;
  gridEnd: Date;
}

/** Sunday-first, matching macOS Calendar's US default. */
const WEEK_OPTIONS = { weekStartsOn: 0 } as const;

export function getCalendarRange(lens: CalendarLens, anchor: Date): CalendarRange {
  if (lens === 'week') {
    const rangeStart = startOfWeek(anchor, WEEK_OPTIONS);
    const rangeEnd = endOfWeek(anchor, WEEK_OPTIONS);
    return { rangeStart, rangeEnd, gridStart: rangeStart, gridEnd: rangeEnd };
  }

  if (lens === 'year') {
    const rangeStart = startOfYear(anchor);
    const rangeEnd = endOfYear(anchor);
    return {
      rangeStart,
      rangeEnd,
      gridStart: startOfWeek(rangeStart, WEEK_OPTIONS),
      gridEnd: endOfWeek(rangeEnd, WEEK_OPTIONS),
    };
  }

  const rangeStart = startOfMonth(anchor);
  const rangeEnd = endOfMonth(anchor);
  return {
    rangeStart,
    rangeEnd,
    gridStart: startOfWeek(rangeStart, WEEK_OPTIONS),
    gridEnd: endOfWeek(rangeEnd, WEEK_OPTIONS),
  };
}

export function shiftAnchor(lens: CalendarLens, anchor: Date, direction: -1 | 1): Date {
  if (lens === 'week') return addWeeks(anchor, direction);
  if (lens === 'year') return addYears(anchor, direction);
  return addMonths(anchor, direction);
}

export function formatRangeTitle(lens: CalendarLens, anchor: Date): string {
  if (lens === 'year') return format(anchor, 'yyyy');
  if (lens === 'month') return format(anchor, 'MMMM yyyy');

  const start = startOfWeek(anchor, WEEK_OPTIONS);
  const end = endOfWeek(anchor, WEEK_OPTIONS);
  const sameYear = start.getFullYear() === end.getFullYear();

  if (!sameYear) {
    // Different years: include year on both sides
    return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
  }

  // Same year: year only on end side
  const tail = isSameMonth(start, end) ? format(end, 'd, yyyy') : format(end, 'MMM d, yyyy');
  return `${format(start, 'MMM d')} – ${tail}`;
}

/**
 * Compact label for a single week, used by the cash-flow strip. Same
 * three-branch structure as `formatRangeTitle`'s week case, but without a
 * year on the same-year branches — the strip already sits under a header
 * that states the year, so it only needs one when the week itself crosses
 * into a different year.
 */
export function formatWeekLabel(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();

  if (!sameYear) {
    // Different years: include year on both sides
    return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
  }

  if (isSameMonth(start, end)) {
    // Same month: short tail, no repeated month or year
    return `${format(start, 'MMM d')} – ${format(end, 'd')}`;
  }

  // Different month, same year: month on both sides, no year
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;
}

/** Every day from gridStart to gridEnd inclusive, in order. */
export function buildGridDays(gridStart: Date, gridEnd: Date): Date[] {
  const days: Date[] = [];
  for (let day = gridStart; day.getTime() <= gridEnd.getTime(); day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}
