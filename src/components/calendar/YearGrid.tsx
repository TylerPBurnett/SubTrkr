import { useMemo } from 'react';
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { formatCurrency } from '@/utils/currency';
import { formatISODate } from '@/utils/dates';
import { sumOccurrences, type Occurrence } from '@/utils/occurrences';
import { buildGridDays } from './calendarRange';

const WEEK_OPTIONS = { weekStartsOn: 0 } as const;
const INTENSITY_STEPS = [0.25, 0.5, 0.75, 1];

interface YearGridProps {
  year: number;
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

  const peak = useMemo(() => Math.max(0, ...dayTotals.values()), [dayTotals]);

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
                  const dayTotal = day.getMonth() === month ? (dayTotals.get(isoDate) ?? 0) : 0;
                  const intensity = intensityFor(dayTotal, peak);

                  return (
                    <button
                      key={isoDate}
                      type="button"
                      role="gridcell"
                      aria-label={
                        dayTotal > 0
                          ? `${day.toDateString()} — ${formatCurrency(dayTotal)}`
                          : day.toDateString()
                      }
                      onClick={() => onSelectDay(day)}
                      style={{
                        aspectRatio: '1',
                        borderRadius: 2,
                        background:
                          intensity > 0
                            ? `color-mix(in srgb, var(--brand-primary) ${Math.round(intensity * 100)}%, transparent)`
                            : 'var(--bg-hover)',
                        opacity: day.getMonth() === month ? 1 : 0.25,
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
