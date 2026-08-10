import { memo, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Hourglass } from 'lucide-react';
import ServiceLogo from '@/components/ui/ServiceLogo';
import { formatCurrency } from '@/utils/currency';
import type { DaySummary, Occurrence } from '@/utils/occurrences';

const MAX_VISIBLE_LOGOS = 3;

interface DayCellProps {
  date: Date;
  occurrences: Occurrence[];
  summary: DaySummary;
  isToday: boolean;
  isSelected: boolean;
  isOutsideRange: boolean;
  isFocused: boolean;
  onSelect: (date: Date) => void;
  /** Only move real DOM focus once the user has deliberately navigated. */
  shouldFocus: boolean;
}

/** State outranks category, so overdue and trial-end override the accent. */
function resolveAccent(summary: DaySummary): string | null {
  if (summary.hasOverdue) return 'var(--accent-red)';
  if (summary.hasTrialEnd) return 'var(--accent-amber)';
  return summary.accentColor;
}

function DayCell({
  date,
  occurrences,
  summary,
  isToday,
  isSelected,
  isOutsideRange,
  isFocused,
  onSelect,
  shouldFocus,
}: DayCellProps) {
  const accent = resolveAccent(summary);
  const visible = occurrences.slice(0, MAX_VISIBLE_LOGOS);
  const overflow = occurrences.length - visible.length;

  const buttonRef = useRef<HTMLButtonElement>(null);
  // Roving tabindex only moves the tabIndex value on its own — without this,
  // real DOM focus (and what a screen reader announces) never follows the
  // arrow keys. `shouldFocus` comes from CalendarView and is only true once
  // the user has deliberately navigated (arrow keys, a day click, "today",
  // or paging) — that keeps landing on the Calendar view from yanking focus
  // into the grid, and survives cells remounting when paging past a range
  // edge, since the flag lives above the grid rather than on the cell.
  useEffect(() => {
    if (!shouldFocus || !isFocused) return;
    if (buttonRef.current === document.activeElement) return;
    buttonRef.current?.focus();
  }, [shouldFocus, isFocused]);

  const formattedDate = format(date, 'MMMM d, yyyy');
  const label =
    summary.chargeCount === 0
      ? `${formattedDate} — ${summary.hasTrialEnd ? 'trial ends' : 'nothing due'}`
      : `${formattedDate} — ${summary.chargeCount} ${summary.chargeCount === 1 ? 'charge' : 'charges'}, ${formatCurrency(summary.total)}${summary.hasOverdue ? ', overdue' : ''}${summary.hasTrialEnd ? ', trial ends' : ''}`;

  return (
    <button
      ref={buttonRef}
      type="button"
      role="gridcell"
      aria-selected={isSelected}
      aria-label={label}
      tabIndex={isFocused ? 0 : -1}
      onClick={() => onSelect(date)}
      className="calendar-day"
      style={{
        opacity: isOutsideRange ? 0.35 : 1,
        boxShadow: isSelected
          ? 'inset 0 0 0 1.5px color-mix(in srgb, var(--brand-primary) 45%, transparent)'
          : undefined,
      }}
    >
      <div
        className="calendar-day-accent"
        style={{ background: accent ?? 'transparent' }}
      />

      <div className="calendar-day-body">
        <div className="flex items-center justify-between gap-1">
          <span
            className="calendar-day-number"
            style={
              isToday
                ? {
                    color: 'var(--text-inverse)',
                    background: 'var(--brand-primary)',
                    borderRadius: '999px',
                    padding: '1px 6px',
                    alignSelf: 'flex-start',
                    fontWeight: 600,
                  }
                : { color: isSelected ? 'var(--text-primary)' : undefined }
            }
          >
            {date.getDate()}
          </span>

          {summary.hasTrialEnd && (
            <Hourglass
              aria-hidden="true"
              size={12}
              className="shrink-0"
              style={{ color: 'var(--accent-amber)' }}
            />
          )}
        </div>

        {occurrences.length > 0 && (
          <div className="calendar-logo-stack">
            {visible.map((occurrence) => (
              <ServiceLogo
                key={occurrence.id}
                logoUrl={occurrence.item.logo_url}
                name={occurrence.item.name}
                size="xs"
                className="calendar-logo-ring"
              />
            ))}
            {overflow > 0 && (
              <span
                className="calendar-logo-ring flex items-center justify-center shrink-0"
                style={{
                  width: 22,
                  height: 22,
                  background: 'var(--bg-hover)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                }}
              >
                +{overflow}
              </span>
            )}
          </div>
        )}

        {summary.chargeCount > 0 && (
          <span
            className="calendar-day-total"
            style={{
              color: summary.hasOverdue
                ? 'var(--accent-red)'
                : isSelected
                  ? 'var(--text-primary)'
                  : undefined,
            }}
          >
            {formatCurrency(summary.total, { display: 'summary' })}
          </span>
        )}
      </div>
    </button>
  );
}

export default memo(DayCell);
