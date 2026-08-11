import { useMemo } from 'react';
import { formatCurrency } from '@/utils/currency';
import { formatISODate } from '@/utils/dates';
import { sumOccurrences, type Occurrence } from '@/utils/occurrences';
import { chunkWeeks, formatWeekLabel } from './calendarRange';

interface CashFlowStripProps {
  gridDays: Date[];
  occurrencesByDay: Map<string, Occurrence[]>;
}

export default function CashFlowStrip({ gridDays, occurrencesByDay }: CashFlowStripProps) {
  const weeks = useMemo(
    () =>
      chunkWeeks(gridDays).map((week) => ({
        total: week.reduce(
          (total, day) => total + sumOccurrences(occurrencesByDay.get(formatISODate(day)) ?? []),
          0,
        ),
        label: formatWeekLabel(week[0], week[week.length - 1]),
      })),
    [gridDays, occurrencesByDay],
  );

  const peak = Math.max(0, ...weeks.map((week) => week.total));
  if (peak === 0) return null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
        gap: 3,
      }}
    >
      {weeks.map((week) => (
        <div key={week.label} className="flex flex-col gap-1">
          <div
            title={`${week.label} — ${formatCurrency(week.total)}`}
            style={{
              height: 24,
              background: 'var(--bg-hover)',
              borderRadius: 5,
              display: 'flex',
              alignItems: 'flex-end',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '100%',
                height: `${Math.round((week.total / peak) * 100)}%`,
                background: 'var(--brand-primary)',
                opacity: 0.75,
              }}
            />
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-secondary)',
              textAlign: 'center',
            }}
          >
            {formatCurrency(week.total, { display: 'compact' })}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            {week.label}
          </span>
        </div>
      ))}
    </div>
  );
}
