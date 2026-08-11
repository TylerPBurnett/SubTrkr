import type { CSSProperties, ReactNode } from 'react';
import { Check, Minus } from 'lucide-react';

/**
 * Shared vocabulary for the app's filter popovers.
 *
 * Four rules hold everywhere a filter appears:
 *
 * 1. A filter that is on must be visible from outside its popover. A trigger
 *    that looks identical whether or not the view is narrowed makes items
 *    appear to have vanished with no explanation.
 * 2. Rows use a mark in a fixed 16px gutter, with the whole row as the hit
 *    target — the macOS menu idiom. The checkbox square is a concession to
 *    constraints that no longer apply, and fifteen of them in a list is
 *    fifteen boxes of chrome carrying no information.
 * 3. Groups are separated by hairlines, not by labels. A group that leads with
 *    its own "All …" row already says what it is, and a label above it repeats
 *    that in shoutier type.
 * 4. Selecting one thing out of many is one click, not N deselections. Every
 *    multi-select group offers "Only" per row and an All/None row on top.
 *
 * ## Why these are `aria-pressed` buttons and not `menuitemcheckbox`
 *
 * They used to be `role="menuitemcheckbox"`. That role is only valid inside a
 * `menu` or `menubar`, and these live in a Radix Popover, which is neither —
 * so it was the same failure as `role="gridcell"` without `role="row"`
 * ancestry, which this branch shipped three times before catching: the browser
 * drops the invalid role silently and the control ends up announcing as
 * nothing at all.
 *
 * The fix is not to bolt `role="menu"` onto the popover. That role carries a
 * keyboard contract — arrow-key roving, type-ahead — that Radix Popover does
 * not implement, so claiming it would trade a quiet failure for a loud lie. A
 * toggle button is what these actually are: Tab reaches them, Space and Enter
 * activate them, and `aria-pressed` reports their state without requiring any
 * ancestor context. Please do not "fix" this back.
 */

/** Surface material for a filter popover, so every one reads the same. */
export const FILTER_POPOVER_SURFACE: CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-strong)',
  borderRadius: 12,
  boxShadow: '0 8px 32px -8px rgba(0, 0, 0, 0.18)',
};

/** Shared geometry, so two popovers can't drift to 224px and 280px again. */
export const FILTER_POPOVER_CLASS = 'w-64 p-0 overflow-hidden';

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

interface FilterSectionProps {
  children: ReactNode;
  /** Names the group for assistive tech without printing a visible label. */
  label?: string;
  /** Hairline above. False for the first section, which has nothing above it. */
  divider?: boolean;
}

export function FilterSection({ children, label, divider = true }: FilterSectionProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="py-1"
      style={{ borderTop: divider ? '1px solid var(--border-default)' : undefined }}
    >
      {children}
    </div>
  );
}

/**
 * Caps and scrolls an unbounded list inside a section — the categories, which
 * a user can create without limit.
 *
 * It wraps only the list, never the "All …" row above it: a control over a
 * group that scrolls out of its own group is a control you cannot find when
 * you need it most, which is when the list is long.
 */
export function FilterScrollArea({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-y-auto" style={{ maxHeight: 176 }}>
      {children}
    </div>
  );
}

/** The 16px leading gutter every row shares, so marks line up down the column. */
function RowMark({ state }: { state: 'checked' | 'mixed' | 'empty' }) {
  return (
    <span
      aria-hidden="true"
      className="flex items-center shrink-0"
      style={{ width: 16, color: 'var(--brand-text)' }}
    >
      {state === 'checked' && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
      {state === 'mixed' && <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />}
    </span>
  );
}

interface FilterCheckRowProps {
  checked: boolean;
  label: string;
  onToggle: () => void;
  /**
   * Some but not all of the group — renders a dash rather than a check, and
   * reports `aria-pressed="mixed"`. Only meaningful on an "All …" row.
   */
  indeterminate?: boolean;
  /** Category colour dot, rendered between the mark and the label. */
  swatch?: string;
  /**
   * Narrow to this row alone. Renders an "Only" button that appears on hover
   * or keyboard focus, and makes ⌥-click on the row do the same thing — the
   * macOS accelerator for "just this one", as in Finder and Xcode's navigator.
   *
   * It is a SIBLING button, not one nested inside the row button: an
   * interactive element inside another interactive element is invalid, and
   * browsers resolve it by dropping one of them.
   */
  onOnly?: () => void;
}

export function FilterCheckRow({
  checked,
  label,
  onToggle,
  indeterminate = false,
  swatch,
  onOnly,
}: FilterCheckRowProps) {
  return (
    <div className="group flex items-center transition-colors hover:bg-[var(--bg-hover)]">
      <button
        type="button"
        aria-pressed={indeterminate ? 'mixed' : checked}
        onClick={(event) => {
          if (onOnly && event.altKey) {
            onOnly();
            return;
          }
          onToggle();
        }}
        className="flex-1 min-w-0 flex items-center gap-1.5 px-2.5 py-1 text-left"
      >
        <RowMark state={indeterminate ? 'mixed' : checked ? 'checked' : 'empty'} />
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
            color:
              checked || indeterminate ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          {label}
        </span>
      </button>

      {onOnly && (
        /*
          Always in the layout, only ever faded — revealing it by mounting it
          would reflow the label's truncation point on every hover. It stays in
          the tab order at zero opacity so isolating a category is reachable
          without a mouse, and `focus-visible` brings it back into view when it
          gets there.
        */
        <button
          type="button"
          onClick={onOnly}
          aria-label={`Show only ${label}`}
          className="shrink-0 mr-2 rounded opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          style={{
            fontSize: 10.5,
            padding: '1px 5px',
            color: 'var(--brand-text)',
            background: 'var(--brand-primary-light)',
          }}
        >
          Only
        </button>
      )}
    </div>
  );
}

/**
 * One-of-many. Visually identical to a check row so a popover holding both
 * reads as one list — the difference is that picking one unpicks the rest,
 * which the row's state already shows.
 */
export function FilterRadioRow({
  checked,
  label,
  onSelect,
}: {
  checked: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <div className="flex items-center transition-colors hover:bg-[var(--bg-hover)]">
      <button
        type="button"
        aria-pressed={checked}
        onClick={onSelect}
        className="flex-1 min-w-0 flex items-center gap-1.5 px-2.5 py-1 text-left"
      >
        <RowMark state={checked ? 'checked' : 'empty'} />
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
    </div>
  );
}

/** A trailing action row inside a filter popover, aligned to the mark gutter. */
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
      className="w-full flex items-center gap-1.5 px-2.5 py-1 text-left transition-colors hover:bg-[var(--bg-hover)]"
    >
      <span aria-hidden="true" style={{ width: 16, flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{label}</span>
    </button>
  );
}
