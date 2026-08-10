import type { CSSProperties } from 'react';
import { Check } from 'lucide-react';

/**
 * Shared vocabulary for the app's filter popovers.
 *
 * Two rules hold everywhere a filter appears:
 *
 * 1. A filter that is on must be visible from outside its popover. A trigger
 *    that looks identical whether or not the view is narrowed makes items
 *    appear to have vanished with no explanation.
 * 2. Multi-select rows use a checkmark in a fixed gutter, with the whole row
 *    as the hit target — the macOS menu idiom. The checkbox square is a
 *    concession to constraints that no longer apply, and fifteen of them in a
 *    list is fifteen boxes of chrome carrying no information.
 */

/** Surface material for a filter popover, so every one reads the same. */
export const FILTER_POPOVER_SURFACE: CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-strong)',
  borderRadius: 12,
};

/**
 * The count of narrowed filter GROUPS, shown on a trigger. Counts groups
 * rather than individual boxes so deselecting six categories reads as 1
 * instead of climbing to 6.
 */
export function FilterCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        lineHeight: 1,
        color: 'var(--brand-text)',
      }}
    >
      {count}
    </span>
  );
}

interface FilterCheckRowProps {
  checked: boolean;
  label: string;
  onToggle: () => void;
  /** Category colour dot, rendered between the checkmark and the label. */
  swatch?: string;
}

export function FilterCheckRow({
  checked,
  label,
  onToggle,
  swatch,
}: FilterCheckRowProps) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={onToggle}
      className="w-full flex items-center gap-1.5 px-2.5 py-1 text-left transition-colors"
      onMouseEnter={(event) => {
        event.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent';
      }}
    >
      <span
        aria-hidden="true"
        className="flex items-center shrink-0"
        style={{ width: 16, color: 'var(--brand-text)' }}
      >
        {checked && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
      </span>
      {swatch && (
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: swatch,
            flexShrink: 0,
            marginRight: 2,
          }}
        />
      )}
      <span
        className="truncate"
        style={{
          fontSize: 12.5,
          color: checked ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}
      >
        {label}
      </span>
    </button>
  );
}

/** A trailing action row inside a filter popover, aligned to the check gutter. */
export function FilterActionRow({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-1.5 px-2.5 py-1 text-left transition-colors"
      onMouseEnter={(event) => {
        event.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent';
      }}
    >
      <span aria-hidden="true" style={{ width: 16, flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{label}</span>
    </button>
  );
}
