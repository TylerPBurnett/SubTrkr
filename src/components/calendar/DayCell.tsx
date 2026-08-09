import { memo, useEffect, useRef } from 'react';
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
}: DayCellProps) {
  const accent = resolveAccent(summary);
  const visible = occurrences.slice(0, MAX_VISIBLE_LOGOS);
  const overflow = occurrences.length - visible.length;

  const buttonRef = useRef<HTMLButtonElement>(null);
  // Roving tabindex only moves the tabIndex value on its own — without this,
  // real DOM focus (and what a screen reader announces) never follows the
  // arrow keys. The `hasMountedRef` guard skips the very first effect run so
  // landing on the calendar view doesn't yank focus into the grid before the
  // user has interacted with it.
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (isFocused && buttonRef.current !== document.activeElement) {
      buttonRef.current?.focus();
    }
  }, [isFocused]);

  const label =
    summary.count === 0
      ? `${date.toDateString()} — nothing due`
      : `${date.toDateString()} — ${summary.count} ${summary.count === 1 ? 'charge' : 'charges'}, ${formatCurrency(summary.total)}${summary.hasOverdue ? ', overdue' : ''}${summary.hasTrialEnd ? ', trial ends' : ''}`;

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

        {occurrences.length > 0 && (
          <>
            <div className="calendar-logo-stack">
              {visible.map((occurrence) => (
                <ServiceLogo
                  key={occurrence.id}
                  logoUrl={occurrence.item.logo_url}
                  name={occurrence.item.name}
                  size="sm"
                  className="calendar-logo-ring"
                />
              ))}
              {overflow > 0 && (
                <span
                  className="calendar-logo-ring flex items-center justify-center shrink-0"
                  style={{
                    width: 32,
                    height: 32,
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
          </>
        )}
      </div>
    </button>
  );
}

export default memo(DayCell);
