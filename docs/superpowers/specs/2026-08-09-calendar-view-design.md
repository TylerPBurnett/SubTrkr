# Calendar view for subscriptions and bills

**Date:** 2026-08-09
**Status:** Design — awaiting review
**Supersedes:** [CALENDAR_VIEW_PLAN.md](../../plans/CALENDAR_VIEW_PLAN.md) (TASK-009)

## Problem

SubTrkr can say what is due next but cannot show the shape of recurring obligations over time. `Dashboard` surfaces a flat "upcoming" list via `getUpcomingItems`, and `Analytics` aggregates spend by category and month — neither answers "what does the second week of September cost me?" or "which days are heavy?"

The data to answer that already exists on every row. `items` carries `start_date`, `next_billing_date`, `billing_cycle`, and the lifecycle dates `paused_at`, `paused_until`, `cancellation_date`, `cancelled_at`, `archived_at`, `trial_end_date` ([types/index.ts:14-39](../../../src/types/index.ts)). Nothing projects them across a range.

## Goals

1. A `Calendar` sidebar destination that takes over the main content area.
2. Week, month, and year lenses; month is the default.
3. Service logos rendered on the day a charge lands.
4. Recurrence math lives in one pure, tested module that all three lenses fold over.
5. No schema changes, no new write paths, no backend work.

## Non-goals

- **Mark-as-paid.** The `payments` table and `recordPayment` exist ([payments.ts](../../../src/services/database/payments.ts)) but no UI writes to them. Wiring a ledger requires defining what "paid" means for a *projected* occurrence, which is its own design. v1 is a read-only planning lens.
- **Drag-to-reschedule and per-occurrence overrides.** These need an occurrence-override table and backend coordination through `docs/SUPABASE_BACKEND_WORKFLOW.md`.
- **ICS export or external calendar sync.**
- **A fourth "zoomed-out" lens.** The superseded plan listed one and flagged in its own text that it needed defining before it became "an ambiguous catch-all mode." Week/month/year is the complete set; the lens is dropped rather than defined.

---

## Architecture

Two layers, hard-separated. The superseded plan's guardrail — "do not mix occurrence math into JSX-heavy view components" — is the organising constraint.

### Layer 1: the projection engine

`src/utils/occurrences.ts` — pure, no React, unit-tested. Every lens, the cash-flow strip, and the rail totals are folds over its single output array.

```ts
export type OccurrenceKind = 'charge' | 'trial-end';

export interface Occurrence {
  /** `${item.id}:${isoDate}:${kind}` — stable React key */
  id: string;
  item: ItemWithCategory;
  /** local midnight, via parseLocalDate semantics */
  date: Date;
  isoDate: string;
  amount: number;
  kind: OccurrenceKind;
  /** date is strictly before today */
  isPast: boolean;
  /** isPast && item.status === 'active' — a charge that should have landed */
  isOverdue: boolean;
}

export interface OccurrenceFilters {
  itemType?: ItemType | 'all';
  /**
   * null means no category filter at all.
   * A non-null array filters to those ids; items with a null `category_id`
   * match only when the array contains the sentinel UNCATEGORISED_ID.
   */
  categoryIds?: string[] | null;
  includePaused?: boolean;    // default true
  includeCancelled?: boolean; // default true
  includeArchived?: boolean;  // default false
}

export function projectOccurrences(
  items: ItemWithCategory[],
  rangeStart: Date,
  rangeEnd: Date,
  filters?: OccurrenceFilters,
): Occurrence[];

/** Day-keyed index built once and shared by grid, strip, and rail. */
export function groupByDay(occurrences: Occurrence[]): Map<string, Occurrence[]>;
```

### Layer 2: the view

`src/components/calendar/`, lazy-loaded in `AppContent` behind `ErrorBoundary` + `Suspense` like `Analytics` and `Settings`.

| File | Responsibility |
|---|---|
| `CalendarView.tsx` | Shell. Owns lens, anchor date, selected day, filters, rail visibility. Runs the one `useMemo` over `projectOccurrences`. |
| `calendarRange.ts` | Pure range math: lens + anchor date → `{ rangeStart, rangeEnd, gridStart, gridEnd }`. |

**Range versus grid.** `rangeStart`/`rangeEnd` bound the period the lens is *about* (the calendar month); `gridStart`/`gridEnd` bound what is *drawn* (week-padded, so the leading and trailing rows include adjacent-month days). The engine is always called with the **grid** bounds, because those padded days must render their icons. Every headline total — the rail summary, the year-view month totals — is then filtered back to the **range** bounds, so "August" means August. The cash-flow strip is the deliberate exception: its bars total grid rows, because a bar sitting under a row must describe that row. The strip's bars therefore sum to slightly more than the rail's month total in most months, which is correct and not a defect.
| `useCalendarNavigation.ts` | Keyboard handling, selection movement, paging. |
| `MonthGrid.tsx` | 7-column grid, 5–6 week rows. |
| `WeekGrid.tsx` | 7 tall day columns. |
| `YearGrid.tsx` | 12 mini-month grids. |
| `DayCell.tsx` | Shared cell: accent edge, icon stack, day total. |
| `DayInspector.tsx` | Right rail. |
| `CashFlowStrip.tsx` | Per-week bars beneath the month grid. |
| `CalendarFilterBar.tsx` | Type / category / status filters. |

---

## Recurrence rules

### Anchor

**The anchor is `next_billing_date`, not `start_date`.**

Existing helpers anchor on `start_date` ([dates.ts:109-145](../../../src/utils/dates.ts)), which is correct for *computing* a next date. It is wrong for the calendar: if a user hand-edits `next_billing_date`, it leaves the `start_date` lattice, and a `start_date`-anchored calendar would disagree with the "next due" date shown everywhere else in the app. Anchoring on `next_billing_date` and walking outward in both directions keeps the calendar consistent with `Dashboard` and `ItemList` by construction.

### Occurrence n is computed, never iterated

```ts
function occurrenceAt(anchor: Date, cycle: BillingCycle, n: number): Date {
  switch (cycle) {
    case 'weekly':    return addWeeks(anchor, n);
    case 'monthly':   return addMonths(anchor, n);
    case 'quarterly': return addMonths(anchor, n * 3);
    case 'yearly':    return addYears(anchor, n);
  }
}
```

`n` is any integer, negative for backward projection. Always measured from the anchor.

This matters for month-end. A subscription anchored on Jan 31 must render Jan 31 → Feb 28 → **Mar 31**. Stepping iteratively (`addBillingCycle` applied to the previous result, as `getNextFutureBillingDate` does) clamps to Feb 28 and then advances to Mar 28 — permanently wrong, and wrong by a growing amount. Computing `addMonths(anchor, n)` each time preserves the intent "the 31st, clamped where the month is short." Leap years fall out for free.

### Index bounds are solved, not searched

Do not loop from `n = 0`. Compute the bounds analytically so cost is proportional to occurrences *in range*, not to the distance from the anchor — a yearly item anchored in 2019 must not cost 7 iterations per render, and year view must not multiply that by 12.

```ts
// monthly
const lo = differenceInCalendarMonths(rangeStart, anchor) - 1;
const hi = differenceInCalendarMonths(rangeEnd, anchor) + 1;
```

with the weekly / quarterly / yearly analogues, then filter the resulting dates against the real bounds. The ±1 padding absorbs clamping. Cap the span per item per range at 400 occurrences as a runaway guard.

### Lifecycle gates

Applied per item before projecting:

| Status | Rule |
|---|---|
| `active` | Project across the range. |
| `trial` | No charges before `trial_end_date`. Emit one `trial-end` occurrence **on** `trial_end_date`. First charge lands on or after it. |
| `paused` | Suppress occurrences inside `[paused_at, paused_until)`. A null `paused_until` means indefinite — nothing after `paused_at`. |
| `cancelled` | Nothing after `cancellation_date ?? cancelled_at`. Occurrences before it are historical fact and still render. |
| `archived` | Excluded unless `includeArchived`. |

**Backward projection floors at `start_date`** — no phantom charges before the item existed.

`isOverdue` is `date < today && !isPast-cancelled && status is active` — a charge that should have landed and was never superseded by a lifecycle change.

---

## Visual system

All colour comes from existing tokens; nothing new is added to `index.css` except the calendar's own layout classes.

### Day cell

- `--bg-card` on a `--bg-surface` grid, `--border-default` seams, matching the 3-tier hierarchy in `.claude/rules/theming.md`.
- **2px top edge**, full-bleed to the cell's rounded top corners. Days with nothing due have no edge. The colour is the **largest-amount occurrence's category colour**, falling back to `--accent-gray` for an uncategorised item — chosen over a blended or split edge because the eye reads a single hue faster, and the biggest charge is the one worth flagging. Overdue and trial-end states override it (below), since state outranks category.
- **Capped icon stack**: up to 3 `ServiceLogo` instances at 22px, overlapping by 7px, each ringed with a 2px `--bg-card` outline so they read as separate chips. A fourth-plus becomes a `+N` pill in `--bg-hover`.
- **Day total** in `--font-mono` beneath the stack, `--text-secondary` normally, `--text-primary` on the selected day.
- `ServiceLogo` is used as-is, so the logo-URL → coloured-initial fallback already works.

### State treatments

| State | Treatment |
|---|---|
| Today | `--brand-primary` ring on the date number |
| Selected | `--brand-primary` at 45% as a cell outline |
| Overdue | `--accent-red` accent edge; amount in `--accent-red` |
| Trial end | `--accent-amber` edge; a small `ti-hourglass`-equivalent lucide marker |
| Outside range | 35% opacity, still clickable (pages the view) |

### Lens layouts

**Month** — 7 columns × 5–6 rows filling `gridStart`/`gridEnd` (week-padded). Weekday headers in `--font-mono`, `--text-muted`.

**Week** — 7 tall columns, each a full-height day panel listing every occurrence as a row with logo, name, cycle, and amount. This is where names live at full length, since there is vertical room. Bills have no time-of-day, so there is no hour axis.

**Year** — 12 mini-month grids, 4 across at full width. Each month header carries its name and total. Each day is a 2px-radius square tinted `--brand-primary` at an opacity quantised into 4 steps by that day's spend relative to the year's heaviest day — quantised rather than continuous so the ramp reads as distinct bands instead of mush. Clicking a month header opens month view; clicking a day opens month view with that day selected.

### Motion

framer-motion, restrained. Lens changes cross-fade over 150ms. Month paging slides directionally by 8px with opacity. The rail slides on the x-axis. `--ease-spring` is reserved for the segmented control, which already uses it. No bounce on the grid.

---

## Chrome

### Header

Page label `Planning` / title `Calendar`, following the existing `page-header` structure in `AppContent`. Right side: `SegmentedControl` for Week/Month/Year (reusing [SegmentedControl.tsx](../../../src/components/ui/SegmentedControl.tsx)), then `‹ Today ›` paging.

The header title shows the current range — "August 2026", "Aug 10 – 16, 2026", "2026".

### Right rail

280px, collapsible, open by default, `--bg-card` panels.

- **Range summary**: total for the visible range, occurrence count, and how many are still ahead.
- **Selected day**: each occurrence as a row — `ServiceLogo`, name, cycle, amount. Clicking a row calls the existing `onEdit` and opens `ItemForm`.
- **No day selected**: the next 5 upcoming occurrences from today.

Auto-hides when the main panel drops below 1024px.

### Cash-flow strip

A 32px strip beneath the month grid: **one bar per rendered grid row**, column-aligned with the rows above it, so a bar always means exactly the week drawn beside it. Rows are the grid's own weeks, which means leading and trailing rows include adjacent-month days — the bar totals what that row actually shows, not what the calendar month contains. Height is relative to the heaviest row; each bar is labelled with its total in `--font-mono`. Hidden in week and year lenses.

### Filter bar

Type (all / bills / subscriptions), category multi-select, and status toggles for paused / cancelled / archived. Follows the `SearchFilterToolbar` idiom so it reads as part of the app. Filter state lives in `CalendarView` and is passed into `projectOccurrences` — filtering happens in the engine, not in the grid, so totals and the strip stay consistent with what is drawn.

---

## App shell changes

- `View` union in [app/types.ts](../../../src/app/types.ts) gains `'calendar'`.
- `VIEW_CONTENT` gains a `calendar` entry: label `Planning`, title `Calendar`, description `Your bills and subscriptions across time`.
- `NAV_ITEMS` in [app/constants.ts](../../../src/app/constants.ts) gains `{ id: 'calendar', label: 'Calendar', icon: CalendarDays }`, positioned **second**, after Dashboard.
- `AppContent` gains the lazy-loaded route.

### Shortcut renumbering

Sidebar order becomes Dashboard · Calendar · Subscriptions · Bills · Analytics. The `views` array in [useGlobalShortcuts.ts:74-81](../../../src/app/hooks/useGlobalShortcuts.ts) is reordered to match and extended to six entries:

```
⌘1 Dashboard   ⌘2 Calendar   ⌘3 Subscriptions
⌘4 Bills       ⌘5 Analytics  ⌘6 Settings
```

The bounds check becomes `event.key >= '1' && event.key <= '6'`. This shifts Subscriptions, Bills, and Analytics by one and moves Settings from `⌘5` to `⌘6` — a one-time muscle-memory cost, accepted so the sidebar groups overview → time → things → insight.

### In-view keys

Registered by `useCalendarNavigation`, suppressed while `ItemForm` or any dialog is open, and suppressed when focus is in an input:

| Key | Action |
|---|---|
| `←` `→` `↑` `↓` | Move selected day (±1 day, ±1 week) |
| `W` `M` `Y` | Switch lens |
| `T` | Jump to today |
| `[` `]` | Page range back / forward |
| `Enter` | Open the selected day's first item, or focus the rail if several |
| `⌘.` | Toggle the rail |

Moving past the range edge pages the view and keeps the selection.

---

## Performance

One `useMemo` in `CalendarView` keyed on `items`, `rangeStart.toISOString()`, `rangeEnd.toISOString()`, and the filter values, producing the `Occurrence[]`. A second `useMemo` builds the `Map<isoDate, Occurrence[]>`. Grid, strip, and rail all read that map — no component re-derives anything.

Worst case is year view: 366 days × N items. With solved index bounds the work is proportional to actual occurrences (a few thousand for a large account), well inside a single frame.

`DayCell` is `memo`'d on its occurrence array reference and selection state.

---

## Accessibility

- Grid is `role="grid"`, rows `role="row"`, cells `role="gridcell"` with `aria-selected`.
- Roving `tabindex` — one cell in the tab order at a time, arrows move focus.
- Each cell carries an `aria-label` such as `August 13, 2026 — 3 charges, $47.97`.
- The accent edge is never the sole carrier of meaning; overdue and trial states are also announced in the label and shown in the rail.

## Empty states

Reuse [EmptyState.tsx](../../../src/components/ui/EmptyState.tsx). A range with no occurrences shows a quiet in-grid message rather than an empty page — the grid itself stays drawn, since an empty August is meaningful information.

---

## Known limitation: mixed currencies

Day, week, month, and year totals sum raw `amount` values and format as USD. This matches what the app already does: `formatCurrency` defaults to `USD` ([currency.ts](../../../src/utils/currency.ts)) and no aggregate caller in `Dashboard` or `Analytics` passes a per-item currency. An account holding both USD and EUR items already gets wrong totals on the dashboard.

The calendar inherits this rather than inventing a different answer, so the two surfaces agree. Fixing it means either an FX rate source or per-currency subtotals across the whole app — tracked as a follow-up, out of scope here.

---

## Verification

**Unit** — `src/utils/occurrences.test.ts` under `bun test`, alongside the existing suites:

- All four billing cycles project correctly forward and backward.
- Jan 31 monthly anchor yields Feb 28 **and then Mar 31**, not Mar 28.
- Feb 29 yearly anchor across a non-leap year.
- Backward projection stops at `start_date`.
- `paused` with a `paused_until` suppresses only the window; without one, suppresses everything after `paused_at`.
- `cancelled` keeps occurrences before the cancellation date and drops those after.
- `trial` emits a `trial-end` occurrence and no charge before it.
- `archived` excluded by default, included under `includeArchived`.
- Solved index bounds return the same set as a naive loop, for a distant anchor.
- `isOverdue` is true only for past charges on active items.

**Type** — `bunx tsc --noEmit`.

**Manual** — switch lenses without losing the dataset; page a year in each lens; confirm the rail follows selection; confirm keyboard navigation pages at range edges; confirm narrow-window rail auto-hide; confirm filters change grid, strip, and totals together.

**Visual** — the `/smoke` skill against the running dev server.

## Follow-ups

- Mark-as-paid on top of the existing `payments` table, once "paid" is defined for a projected occurrence.
- App-wide mixed-currency totals.
- ICS export, if the calendar proves useful enough to want outside the app.
