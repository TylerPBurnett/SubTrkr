import { useMemo } from 'react';
import { isSameDay, isToday } from 'date-fns';
import type { Category } from '@/types';
import { formatISODate } from '@/utils/dates';
import { summariseDay, type DaySummary, type Occurrence } from '@/utils/occurrences';
import DayCell from './DayCell';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Shared references for empty days so `DayCell`'s React.memo doesn't see a
// fresh array/object prop on every render — most cells have no occurrences,
// and selectedDate changes on every arrow keypress.
const NO_OCCURRENCES: Occurrence[] = [];
const EMPTY_SUMMARY: DaySummary = {
  total: 0,
  count: 0,
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
}: MonthGridProps) {
  // Chunked into weeks because `role="gridcell"` is only valid ARIA with
  // `role="row"` ancestry inside `role="grid"`. Each row is its own 7-column
  // grid, so the visual result is identical to one flat 7-column grid.
  const weeks = useMemo(() => {
    const rows: Date[][] = [];
    for (let index = 0; index < gridDays.length; index += 7) {
      rows.push(gridDays.slice(index, index + 7));
    }
    return rows;
  }, [gridDays]);

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

  return (
    <div>
      <div
        role="row"
        className="calendar-grid"
        style={{ marginBottom: 6, padding: '0 3px' }}
      >
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

      <div
        role="grid"
        aria-label="Month view"
        className="flex flex-col gap-[3px] rounded-xl p-[3px]"
        style={{ background: 'var(--bg-surface)' }}
      >
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
                  isFocused={isSameDay(day, focusedDate)}
                  isOutsideRange={day < rangeStart || day > rangeEnd}
                  onSelect={onSelect}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
