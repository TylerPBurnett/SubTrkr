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
    <div role="grid" aria-label="Week view">
      <div className="calendar-grid" role="row">
        {gridDays.map((day) => {
          const isoDate = formatISODate(day);
          const occurrences = occurrencesByDay.get(isoDate) ?? [];
          const selected = isSameDay(day, selectedDate);
          // A trial-end marker carries `amount: 0`, so a day holding nothing
          // but trial ends summed to 0 and rendered a confident "$0.00" — a
          // day with no money moving, reported as a day costing nothing.
          // `DayCell` gates on the same count; this is a separate code path
          // that had kept the original `occurrences.length` test.
          const chargeCount = occurrences.reduce(
            (count, occurrence) => count + (occurrence.kind === 'charge' ? 1 : 0),
            0,
          );

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
              {chargeCount > 0 ? (
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {formatCurrency(sumOccurrences(occurrences), { display: 'summary' })}
                </p>
              ) : (
                occurrences.length > 0 && (
                  <p
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--accent-amber)',
                    }}
                  >
                    Trial ends
                  </p>
                )
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
                  {/*
                    Logo and amount share the top line so the name gets the
                    full card width beneath them. Side by side, a 22px logo
                    plus gaps left the name ~41px in a 117px column, which
                    truncated "The Wall Street Journal" to a few characters —
                    in the one lens that exists to show names in full.
                  */}
                  <div className="flex items-center justify-between gap-1.5">
                    <ServiceLogo
                      logoUrl={occurrence.item.logo_url}
                      name={occurrence.item.name}
                      size="xs"
                    />
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: occurrence.isOverdue
                          ? 'var(--accent-red)'
                          : 'var(--text-secondary)',
                      }}
                    >
                      {occurrence.kind === 'trial-end'
                        ? 'Trial'
                        : formatCurrency(occurrence.amount, {
                            currency: occurrence.item.currency,
                          })}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      lineHeight: 1.3,
                      color: 'var(--text-primary)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                    }}
                  >
                    {occurrence.item.name}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: 'var(--text-muted)',
                    }}
                  >
                    {occurrence.kind === 'trial-end'
                      ? 'Trial ends'
                      : occurrence.item.billing_cycle}
                  </span>
                </button>
              ))}
            </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
