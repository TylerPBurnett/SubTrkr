import { useMemo } from 'react';
import { format, isSameMonth } from 'date-fns';
import { formatCurrency } from '@/utils/currency';
import { formatISODate } from '@/utils/dates';
import { sumOccurrences, type Occurrence } from '@/utils/occurrences';

interface CashFlowStripProps {
  gridDays: Date[];
  occurrencesByDay: Map<string, Occurrence[]>;
}

export default function CashFlowStrip({ gridDays, occurrencesByDay }: CashFlowStripProps) {
  const weeks = useMemo(() => {
    const result: Array<{ total: number; label: string }> = [];

    for (let index = 0; index < gridDays.length; index += 7) {
      const week = gridDays.slice(index, index + 7);
      if (week.length === 0) continue;

      const first = week[0];
      const last = week[week.length - 1];
      // Mirrors formatRangeTitle's approach: only drop the month on the end
      // date when both days share one — otherwise "Aug 30 – 5" reads as
      // though the week never left August.
      const tail = isSameMonth(first, last) ? format(last, 'd') : format(last, 'MMM d');

      result.push({
        total: week.reduce(
          (total, day) => total + sumOccurrences(occurrencesByDay.get(formatISODate(day)) ?? []),
          0,
        ),
        label: `${format(first, 'MMM d')} – ${tail}`,
      });
    }

    return result;
  }, [gridDays, occurrencesByDay]);

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
