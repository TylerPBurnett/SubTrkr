import { useEffect, useMemo, useRef } from 'react';
import { endOfMonth, endOfWeek, format, isSameDay, startOfMonth, startOfWeek } from 'date-fns';
import { formatCurrency } from '@/utils/currency';
import { formatISODate } from '@/utils/dates';
import { sumOccurrences, type Occurrence } from '@/utils/occurrences';
import { buildGridDays } from './calendarRange';

const WEEK_OPTIONS = { weekStartsOn: 0 } as const;
const INTENSITY_STEPS = [0.25, 0.5, 0.75, 1];

interface YearGridProps {
  year: number;
  selectedDate: Date;
  /** True once the user has deliberately navigated; gates focus movement. */
  shouldFocus: boolean;
  occurrencesByDay: Map<string, Occurrence[]>;
  onSelectMonth: (date: Date) => void;
  onSelectDay: (date: Date) => void;
}

/** Seven-day slices, so each row can carry `role="row"`. */
function chunkWeeks(days: Date[]): Date[][] {
  const rows: Date[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    rows.push(days.slice(index, index + 7));
  }
  return rows;
}

/** Quantised into 4 bands — a continuous ramp reads as mush at this size. */
function intensityFor(total: number, peak: number): number {
  if (total <= 0 || peak <= 0) return 0;
  const ratio = total / peak;
  const step = INTENSITY_STEPS.findIndex((threshold) => ratio <= threshold);
  return INTENSITY_STEPS[step === -1 ? INTENSITY_STEPS.length - 1 : step];
}

export default function YearGrid({
  year,
  selectedDate,
  shouldFocus,
  occurrencesByDay,
  onSelectMonth,
  onSelectDay,
}: YearGridProps) {
  const dayTotals = useMemo(() => {
    const totals = new Map<string, number>();
    occurrencesByDay.forEach((occurrences, isoDate) => {
      totals.set(isoDate, sumOccurrences(occurrences));
    });
    return totals;
  }, [occurrencesByDay]);

  // `dayTotals` is built from `occurrencesByDay`, which spans the padded
  // grid — late December of the prior year through early January of the
  // next — not just the displayed year. Without filtering, a heavy day
  // just outside the year could set the intensity scale for all twelve
  // months. The spec wants "the year's heaviest day", so only days that
  // actually belong to `year` are eligible.
  const peak = useMemo(() => {
    let max = 0;
    dayTotals.forEach((total, isoDate) => {
      if (!isoDate.startsWith(`${year}-`)) return;
      if (total > max) max = total;
    });
    return max;
  }, [dayTotals, year]);

  // Roving tabindex across the whole year: exactly one day square is a tab
  // stop, matching the pattern MonthGrid uses (previously every one of the
  // ~504 day squares had its own tab stop, and the grid had no selection
  // indicator at all). Target the selection when it falls inside the
  // displayed year; otherwise fall back to Jan 1 so there is always exactly
  // one, even if the selection lives in a different year than the one
  // currently shown.
  const focusTarget = useMemo(
    () => (selectedDate.getFullYear() === year ? selectedDate : new Date(year, 0, 1)),
    [selectedDate, year],
  );

  // A roving tabindex moves which cell is tabbable, but assistive tech only
  // announces a cell when DOM focus actually lands on it. Without this the
  // ring moved and the screen reader stayed silent — the same half-fix the
  // month grid shipped before DayCell got its focus effect.
  const focusRef = useRef<HTMLButtonElement | null>(null);
  const focusTargetIso = formatISODate(focusTarget);

  useEffect(() => {
    if (!shouldFocus) return;
    if (focusRef.current === document.activeElement) return;
    focusRef.current?.focus();
  }, [shouldFocus, focusTargetIso]);

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) => {
        const first = new Date(year, month, 1);
        const days = buildGridDays(
          startOfWeek(startOfMonth(first), WEEK_OPTIONS),
          endOfWeek(endOfMonth(first), WEEK_OPTIONS),
        );
        const total = days.reduce((sum, day) => {
          if (day.getMonth() !== month) return sum;
          return sum + (dayTotals.get(formatISODate(day)) ?? 0);
        }, 0);
        return { first, month, days, total };
      }),
    [year, dayTotals],
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
      }}
    >
      {months.map(({ first, month, days, total }) => (
        <div key={month}>
          <button
            type="button"
            onClick={() => onSelectMonth(first)}
            className="w-full flex items-baseline justify-between mb-2"
          >
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
              {format(first, 'MMMM')}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-secondary)',
              }}
            >
              {formatCurrency(total, { display: 'compact' })}
            </span>
          </button>

          {/*
            Chunked into weeks for the same reason MonthGrid is: `role="gridcell"`
            is invalid ARIA without `role="row"` ancestry inside `role="grid"`.
            Browsers drop the invalid role entirely, so the cells stop being cells.
          */}
          <div
            role="grid"
            aria-label={format(first, 'MMMM yyyy')}
            style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {chunkWeeks(days).map((week) => (
              <div
                key={formatISODate(week[0])}
                role="row"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}
              >
                {week.map((day) => {
                  const isoDate = formatISODate(day);
                  const isOwnMonth = day.getMonth() === month;
                  const dayTotal = isOwnMonth ? (dayTotals.get(isoDate) ?? 0) : 0;
                  const intensity = intensityFor(dayTotal, peak);
                  // Padding days (the greyed-out lead/trail from adjacent
                  // months) are excluded so the same calendar date, which
                  // also renders as an "own month" cell elsewhere in the
                  // year, isn't selected/focusable twice.
                  const isSelected = isOwnMonth && isSameDay(day, selectedDate);
                  const isFocusTarget = isOwnMonth && isSameDay(day, focusTarget);

                  return (
                    <button
                      key={isoDate}
                      ref={isFocusTarget ? focusRef : undefined}
                      type="button"
                      role="gridcell"
                      aria-selected={isSelected}
                      aria-label={
                        dayTotal > 0
                          ? `${format(day, 'MMMM d, yyyy')} — ${formatCurrency(dayTotal)}`
                          : format(day, 'MMMM d, yyyy')
                      }
                      tabIndex={isFocusTarget ? 0 : -1}
                      onClick={() => onSelectDay(day)}
                      style={{
                        aspectRatio: '1',
                        borderRadius: 2,
                        background:
                          intensity > 0
                            ? `color-mix(in srgb, var(--brand-primary) ${Math.round(intensity * 100)}%, transparent)`
                            : 'var(--bg-hover)',
                        opacity: isOwnMonth ? 1 : 0.25,
                        boxShadow: isSelected
                          ? 'inset 0 0 0 1.5px color-mix(in srgb, var(--brand-primary) 45%, transparent)'
                          : undefined,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
