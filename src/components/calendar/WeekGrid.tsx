import { format, isSameDay, isToday } from 'date-fns';
import ServiceLogo from '@/components/ui/ServiceLogo';
import type { ItemWithCategory } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { formatISODate } from '@/utils/dates';
import { sumOccurrences, type Occurrence } from '@/utils/occurrences';

interface WeekGridProps {
  gridDays: Date[];
  occurrencesByDay: Map<string, Occurrence[]>;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onEdit: (item: ItemWithCategory) => void;
}

export default function WeekGrid({
  gridDays,
  occurrencesByDay,
  selectedDate,
  onSelect,
  onEdit,
}: WeekGridProps) {
  return (
    <div className="calendar-grid" role="grid" aria-label="Week view">
      {gridDays.map((day) => {
        const isoDate = formatISODate(day);
        const occurrences = occurrencesByDay.get(isoDate) ?? [];
        const selected = isSameDay(day, selectedDate);

        return (
          <div
            key={isoDate}
            role="gridcell"
            aria-selected={selected}
            className="calendar-day"
            style={{
              minHeight: 420,
              boxShadow: selected
                ? 'inset 0 0 0 1.5px color-mix(in srgb, var(--brand-primary) 45%, transparent)'
                : undefined,
            }}
          >
            <button
              type="button"
              onClick={() => onSelect(day)}
              className="w-full text-left px-3 pt-3 pb-2"
              style={{ borderBottom: '1px solid var(--border-default)' }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                }}
              >
                {format(day, 'EEE')}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 18,
                  color: isToday(day) ? 'var(--brand-text)' : 'var(--text-primary)',
                  fontWeight: isToday(day) ? 650 : 500,
                }}
              >
                {day.getDate()}
              </p>
              {occurrences.length > 0 && (
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {formatCurrency(sumOccurrences(occurrences), { display: 'summary' })}
                </p>
              )}
            </button>

            <div className="flex flex-col gap-1.5 p-2 overflow-hidden">
              {occurrences.map((occurrence) => (
                <button
                  key={occurrence.id}
                  type="button"
                  onClick={() => onEdit(occurrence.item)}
                  className="flex flex-col gap-1 rounded-lg p-2 text-left"
                  style={{
                    background: 'var(--bg-hover)',
                    borderLeft: `2px solid ${
                      occurrence.isOverdue
                        ? 'var(--accent-red)'
                        : occurrence.kind === 'trial-end'
                          ? 'var(--accent-amber)'
                          : 'var(--brand-primary)'
                    }`,
                    borderRadius: 0,
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ServiceLogo
                      logoUrl={occurrence.item.logo_url}
                      name={occurrence.item.name}
                      size="sm"
                    />
                    <span
                      className="truncate"
                      style={{ fontSize: 12, color: 'var(--text-primary)' }}
                    >
                      {occurrence.item.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {occurrence.kind === 'trial-end'
                      ? 'Trial ends'
                      : formatCurrency(occurrence.amount, { currency: occurrence.item.currency })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
