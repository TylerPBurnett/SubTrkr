import { useMemo } from 'react';
import { isSameDay, isToday } from 'date-fns';
import type { Category } from '@/types';
import { formatISODate } from '@/utils/dates';
import { summariseDay, type DaySummary, type Occurrence } from '@/utils/occurrences';
import { chunkWeeks } from './calendarRange';
import DayCell from './DayCell';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Shared references for empty days so `DayCell`'s React.memo doesn't see a
// fresh array/object prop on every render — most cells have no occurrences,
// and selectedDate changes on every arrow keypress.
const NO_OCCURRENCES: Occurrence[] = [];
const EMPTY_SUMMARY: DaySummary = {
  total: 0,
  chargeCount: 0,
  accentColor: null,
  hasOverdue: false,
  hasTrialEnd: false,
};

interface MonthGridProps {
  gridDays: Date[];
  occurrencesByDay: Map<string, Occurrence[]>;
  categoryLookup: ReadonlyMap<string, Category>;
  rangeStart: Date;
  rangeEnd: Date;
  selectedDate: Date;
  focusedDate: Date;
  onSelect: (date: Date) => void;
  /** Only move real DOM focus once the user has deliberately navigated. */
  shouldFocus: boolean;
}

export default function MonthGrid({
  gridDays,
  occurrencesByDay,
  categoryLookup,
  rangeStart,
  rangeEnd,
  selectedDate,
  focusedDate,
  onSelect,
  shouldFocus,
}: MonthGridProps) {
  // Chunked into weeks because `role="gridcell"` is only valid ARIA with
  // `role="row"` ancestry inside `role="grid"`. Each row is its own 7-column
  // grid, so the visual result is identical to one flat 7-column grid.
  const weeks = useMemo(() => chunkWeeks(gridDays), [gridDays]);

  // Computed once per occurrences/category change rather than inline per
  // cell, so DayCell's memo sees a stable object for days that didn't
  // change instead of a brand-new one on every render (e.g. every arrow
  // keypress, which only changes selectedDate).
  const summaryByDate = useMemo(() => {
    const map = new Map<string, DaySummary>();
    occurrencesByDay.forEach((occurrences, isoDate) => {
      map.set(isoDate, summariseDay(occurrences, categoryLookup));
    });
    return map;
  }, [occurrencesByDay, categoryLookup]);

  // Belt-and-braces: `focusedDate` normally tracks the selection, but a
  // caller can page the visible range without moving the selection (or hand
  // us a date from a different lens entirely). If `focusedDate` isn't one of
  // this grid's days, no cell would get `tabIndex={0}` and the whole grid
  // would drop out of the tab order. Fall back to the first day inside the
  // displayed range so exactly one cell is always reachable by keyboard.
  const effectiveFocusedDate = useMemo(() => {
    if (gridDays.some((day) => isSameDay(day, focusedDate))) return focusedDate;
    return (
      gridDays.find(
        (day) => day.getTime() >= rangeStart.getTime() && day.getTime() <= rangeEnd.getTime(),
      ) ??
      gridDays[0] ??
      focusedDate
    );
  }, [gridDays, focusedDate, rangeStart, rangeEnd]);

  return (
    <div>
      {/*
        The header row lives inside the `role="grid"` container as its first
        row — `role="row"` is only valid ARIA with `grid`/`table`/`rowgroup`
        ancestry, and it was previously a sibling of the grid, so browsers
        dropped the role entirely and screen readers got no column labels.
        It reuses `.calendar-grid` (the same 7-column track as the week
        rows) so columns still align, and skips the grid container's own
        left/right inset since it now inherits it via `p-[3px]` instead of
        applying it a second time.
      */}
      <div
        role="grid"
        aria-label="Month view"
        className="flex flex-col gap-[3px] rounded-xl p-[3px]"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div role="row" className="calendar-grid" style={{ marginBottom: 3 }}>
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              role="columnheader"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-muted)',
                textAlign: 'center',
              }}
            >
              {weekday}
            </div>
          ))}
        </div>

        {weeks.map((week) => (
          <div key={formatISODate(week[0])} role="row" className="calendar-grid">
            {week.map((day) => {
              const isoDate = formatISODate(day);
              const occurrences = occurrencesByDay.get(isoDate) ?? NO_OCCURRENCES;
              const summary = summaryByDate.get(isoDate) ?? EMPTY_SUMMARY;

              return (
                <DayCell
                  key={isoDate}
                  date={day}
                  occurrences={occurrences}
                  summary={summary}
                  isToday={isToday(day)}
                  isSelected={isSameDay(day, selectedDate)}
                  isFocused={isSameDay(day, effectiveFocusedDate)}
                  isOutsideRange={day < rangeStart || day > rangeEnd}
                  onSelect={onSelect}
                  shouldFocus={shouldFocus}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
