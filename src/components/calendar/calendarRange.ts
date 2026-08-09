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
  const tail = isSameMonth(start, end) ? format(end, 'd, yyyy') : format(end, 'MMM d, yyyy');

  return `${format(start, 'MMM d')} – ${tail}`;
}

/** Every day from gridStart to gridEnd inclusive, in order. */
export function buildGridDays(gridStart: Date, gridEnd: Date): Date[] {
  const days: Date[] = [];
  for (let day = gridStart; day.getTime() <= gridEnd.getTime(); day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}
