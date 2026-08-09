# Calendar View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Calendar destination to SubTrkr with week, month, and year lenses that render bills and subscriptions on the days they are due.

**Architecture:** One pure recurrence engine (`src/utils/occurrences.ts`) projects `Occurrence[]` for a date range from the existing `items` payload. Every view — three lenses, the cash-flow strip, the inspector rail — is a fold over that single array. No schema changes, no new write paths, no network calls.

**Tech Stack:** React 19, TypeScript, date-fns 4, framer-motion 12, Tailwind 4, lucide-react. Tests are `node:test` + `node:assert/strict` run under `bun test`.

**Spec:** [2026-08-09-calendar-view-design.md](../specs/2026-08-09-calendar-view-design.md)

## Global Constraints

- **Package manager is `bun`.** Never `npm`, `yarn`, or `pnpm`.
- **Import alias:** `@/` maps to `./src/`. Use it for cross-directory imports; relative paths within a directory.
- **Tests are co-located** as `<name>.test.ts` next to the module, using `import { describe, test } from 'node:test'` and `import assert from 'node:assert/strict'`. Match the style of `src/utils/categoryFolding.test.ts`.
- **All colour comes from CSS custom properties** — `var(--bg-card)`, `var(--text-primary)`, etc. Never hardcode a hex value in a component. Full token list: `src/index.css`, rules in `.claude/rules/theming.md`.
- **3-tier background hierarchy:** `--bg-base` → `--bg-surface` → `--bg-card`. Cards use `--border-default`, never `--border-muted`.
- **Dates never go through `new Date(string)`.** Use `parseLocalDate` from `@/utils/dates` — the app stores `YYYY-MM-DD` and naive parsing shifts them a day in negative-offset timezones.
- **No new dependencies.** Everything needed is already in `package.json`.
- **Sentence case** for all UI copy. No exclamation marks.
- Verification after every task: `bunx tsc --noEmit` must be clean.

---

## File Structure

**Create:**

| Path | Responsibility |
|---|---|
| `src/utils/occurrences.ts` | Recurrence projection engine. Pure, no React. |
| `src/utils/occurrences.test.ts` | Engine tests. |
| `src/components/calendar/calendarRange.ts` | Lens + anchor → range and grid bounds; range titles. |
| `src/components/calendar/calendarRange.test.ts` | Range math tests. |
| `src/components/calendar/CalendarView.tsx` | Shell. Owns all calendar state, runs the engine once. |
| `src/components/calendar/DayCell.tsx` | One day: accent edge, icon stack, total. |
| `src/components/calendar/MonthGrid.tsx` | 7 × 5–6 grid. |
| `src/components/calendar/WeekGrid.tsx` | 7 tall day columns. |
| `src/components/calendar/YearGrid.tsx` | 12 mini-month heatmaps. |
| `src/components/calendar/DayInspector.tsx` | Right rail. |
| `src/components/calendar/CashFlowStrip.tsx` | Per-grid-row bars. |
| `src/components/calendar/CalendarFilterBar.tsx` | Type / category / status filters. |
| `src/components/calendar/useCalendarNavigation.ts` | Keyboard, selection, paging, roving tabindex. |

**Modify:**

| Path | Change |
|---|---|
| `src/app/types.ts` | Add `'calendar'` to the `View` union. |
| `src/app/constants.ts` | Add `VIEW_CONTENT.calendar` and a `NAV_ITEMS` entry in second position. |
| `src/app/hooks/useGlobalShortcuts.ts` | Reorder and extend the shortcut view list to six. |
| `src/app/components/AppContent.tsx` | Lazy-loaded `calendar` route. |
| `src/index.css` | Calendar layout classes only — no new colour tokens. |

---

## Task 1: Recurrence date math

The two primitives every lens depends on: where occurrence *n* lands, and which *n* values can possibly fall in a range.

**Files:**
- Create: `src/utils/occurrences.ts`
- Test: `src/utils/occurrences.test.ts`

**Interfaces:**
- Consumes: `BillingCycle` from `@/types`; `parseLocalDate` from `@/utils/dates`.
- Produces: `occurrenceAt(anchor: Date, cycle: BillingCycle, n: number): Date` and `occurrenceIndexBounds(anchor: Date, cycle: BillingCycle, rangeStart: Date, rangeEnd: Date): { lo: number; hi: number }`.

**Why this shape:** `occurrenceAt` always measures from the anchor, never from the previous result. A Jan 31 monthly item must render Feb 28 and then **Mar 31**. Stepping iteratively clamps to Feb 28 and then advances to Mar 28 — permanently wrong, and wrong by a growing amount.

- [ ] **Step 1: Write the failing test**

Create `src/utils/occurrences.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { parseLocalDate } from './dates';
import { occurrenceAt, occurrenceIndexBounds } from './occurrences';

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('occurrenceAt', () => {
  test('walks monthly forward and backward from the anchor', () => {
    const anchor = parseLocalDate('2026-08-13');
    assert.equal(iso(occurrenceAt(anchor, 'monthly', 0)), '2026-08-13');
    assert.equal(iso(occurrenceAt(anchor, 'monthly', 2)), '2026-10-13');
    assert.equal(iso(occurrenceAt(anchor, 'monthly', -3)), '2026-05-13');
  });

  test('a month-end anchor recovers its day instead of drifting', () => {
    const anchor = parseLocalDate('2026-01-31');
    assert.equal(iso(occurrenceAt(anchor, 'monthly', 1)), '2026-02-28');
    assert.equal(iso(occurrenceAt(anchor, 'monthly', 2)), '2026-03-31');
    assert.equal(iso(occurrenceAt(anchor, 'monthly', 3)), '2026-04-30');
  });

  test('a Feb 29 yearly anchor clamps in a non-leap year', () => {
    const anchor = parseLocalDate('2024-02-29');
    assert.equal(iso(occurrenceAt(anchor, 'yearly', 1)), '2025-02-28');
    assert.equal(iso(occurrenceAt(anchor, 'yearly', 4)), '2028-02-29');
  });

  test('weekly and quarterly step by the right unit', () => {
    const anchor = parseLocalDate('2026-08-13');
    assert.equal(iso(occurrenceAt(anchor, 'weekly', 3)), '2026-09-03');
    assert.equal(iso(occurrenceAt(anchor, 'quarterly', 2)), '2027-02-13');
  });
});

describe('occurrenceIndexBounds', () => {
  test('bounds cover every occurrence a naive scan would find', () => {
    const anchor = parseLocalDate('2019-03-07');
    const rangeStart = parseLocalDate('2026-08-01');
    const rangeEnd = parseLocalDate('2026-08-31');

    for (const cycle of ['weekly', 'monthly', 'quarterly', 'yearly'] as const) {
      const naive: string[] = [];
      for (let n = -2000; n <= 2000; n += 1) {
        const date = occurrenceAt(anchor, cycle, n);
        if (date >= rangeStart && date <= rangeEnd) naive.push(iso(date));
      }

      const { lo, hi } = occurrenceIndexBounds(anchor, cycle, rangeStart, rangeEnd);
      const solved: string[] = [];
      for (let n = lo; n <= hi; n += 1) {
        const date = occurrenceAt(anchor, cycle, n);
        if (date >= rangeStart && date <= rangeEnd) solved.push(iso(date));
      }

      assert.deepEqual(solved, naive, `cycle ${cycle}`);
    }
  });

  test('the scanned span stays small for a distant anchor', () => {
    const { lo, hi } = occurrenceIndexBounds(
      parseLocalDate('2005-01-01'),
      'monthly',
      parseLocalDate('2026-08-01'),
      parseLocalDate('2026-08-31'),
    );
    assert.ok(hi - lo <= 4, `expected a tight span, got ${hi - lo}`);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun test src/utils/occurrences.test.ts
```

Expected: FAIL — cannot resolve `./occurrences`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/occurrences.ts`:

```ts
import {
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
} from 'date-fns';
import type { BillingCycle } from '@/types';

/**
 * Runaway guard. A weekly item over a full year needs ~53 indices, so any
 * span past this means the bounds math went wrong rather than the data
 * being unusual.
 */
const MAX_INDICES_PER_ITEM = 400;

/**
 * Where occurrence `n` lands, always measured from the anchor.
 *
 * Never step from the previous result: a Jan 31 monthly anchor must yield
 * Feb 28 and then Mar 31. Iterating clamps to Feb 28 and then advances to
 * Mar 28, drifting permanently.
 */
export function occurrenceAt(anchor: Date, cycle: BillingCycle, n: number): Date {
  switch (cycle) {
    case 'weekly':
      return addWeeks(anchor, n);
    case 'monthly':
      return addMonths(anchor, n);
    case 'quarterly':
      return addMonths(anchor, n * 3);
    case 'yearly':
      return addYears(anchor, n);
    default:
      return anchor;
  }
}

/**
 * The smallest index span that can contain every occurrence inside the
 * range. Solved rather than searched, so cost tracks occurrences in range
 * instead of distance from the anchor — a 2005 anchor must not cost 250
 * iterations per item per render.
 *
 * Padded by one index each way to absorb month-end clamping.
 */
export function occurrenceIndexBounds(
  anchor: Date,
  cycle: BillingCycle,
  rangeStart: Date,
  rangeEnd: Date,
): { lo: number; hi: number } {
  let lo: number;
  let hi: number;

  switch (cycle) {
    case 'weekly':
      lo = Math.floor(differenceInCalendarDays(rangeStart, anchor) / 7) - 1;
      hi = Math.ceil(differenceInCalendarDays(rangeEnd, anchor) / 7) + 1;
      break;
    case 'monthly':
      lo = differenceInCalendarMonths(rangeStart, anchor) - 1;
      hi = differenceInCalendarMonths(rangeEnd, anchor) + 1;
      break;
    case 'quarterly':
      lo = Math.floor(differenceInCalendarMonths(rangeStart, anchor) / 3) - 1;
      hi = Math.ceil(differenceInCalendarMonths(rangeEnd, anchor) / 3) + 1;
      break;
    case 'yearly':
      lo = differenceInCalendarYears(rangeStart, anchor) - 1;
      hi = differenceInCalendarYears(rangeEnd, anchor) + 1;
      break;
    default:
      return { lo: 0, hi: -1 };
  }

  return { lo, hi: Math.min(hi, lo + MAX_INDICES_PER_ITEM) };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
bun test src/utils/occurrences.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
bunx tsc --noEmit
git add src/utils/occurrences.ts src/utils/occurrences.test.ts
git commit -m "feat(calendar): add recurrence date math for occurrence projection"
```

---

## Task 2: Lifecycle gates and occurrence projection

Turn items into occurrences, honouring pause windows, cancellation cutoffs, trials, and the `start_date` floor.

**Files:**
- Modify: `src/utils/occurrences.ts`
- Test: `src/utils/occurrences.test.ts`

**Interfaces:**
- Consumes: `occurrenceAt`, `occurrenceIndexBounds` from Task 1.
- Produces: types `OccurrenceKind`, `Occurrence`, `ItemSchedule`; functions `getItemSchedule(item: ItemWithCategory): ItemSchedule | null` and `projectOccurrences(items: ItemWithCategory[], rangeStart: Date, rangeEnd: Date): Occurrence[]`.

**Do not add a filters parameter in this task.** Task 3 widens the signature to `projectOccurrences(items, rangeStart, rangeEnd, filters?: OccurrenceFilters)`. Scaffolding it early would mean shipping an empty interface and a no-op predicate — dead code that earns a review finding for no benefit.

**Why `next_billing_date` is the anchor:** existing helpers anchor on `start_date`, which is right for *computing* a next date. It is wrong here. If a user hand-edits `next_billing_date` it leaves the `start_date` lattice, and a `start_date`-anchored calendar would disagree with the "next due" date shown in Dashboard and ItemList. Anchoring on `next_billing_date` keeps the surfaces consistent by construction.

- [ ] **Step 1: Write the failing test**

Append to `src/utils/occurrences.test.ts`:

```ts
import type { ItemWithCategory } from '@/types';
import { projectOccurrences } from './occurrences';

function item(overrides: Partial<ItemWithCategory> = {}): ItemWithCategory {
  return {
    id: 'item-1',
    name: 'Netflix',
    amount: 22.99,
    currency: 'USD',
    billing_cycle: 'monthly',
    category_id: null,
    next_billing_date: '2026-08-13',
    start_date: '2026-01-13',
    notes: null,
    url: null,
    logo_url: null,
    is_active: true,
    status: 'active',
    paused_at: null,
    paused_until: null,
    cancelled_at: null,
    cancellation_date: null,
    archived_at: null,
    trial_started_at: null,
    trial_end_date: null,
    reminder_days: 3,
    item_type: 'subscription',
    created_at: '2026-01-13T00:00:00Z',
    updated_at: '2026-01-13T00:00:00Z',
    ...overrides,
  };
}

const dates = (occurrences: { isoDate: string }[]) => occurrences.map((o) => o.isoDate);

const H1 = parseLocalDate('2026-01-01');
const H2 = parseLocalDate('2026-12-31');

describe('projectOccurrences', () => {
  test('projects a monthly item across a year from its anchor', () => {
    const result = projectOccurrences([item()], H1, H2);
    assert.equal(result.length, 12);
    assert.equal(result[0].isoDate, '2026-01-13');
    assert.equal(result[11].isoDate, '2026-12-13');
    assert.equal(result[0].amount, 22.99);
  });

  test('never projects before start_date', () => {
    const result = projectOccurrences([item({ start_date: '2026-06-13' })], H1, H2);
    assert.deepEqual(dates(result).slice(0, 2), ['2026-06-13', '2026-07-13']);
  });

  test('a paused window suppresses only the occurrences inside it', () => {
    const result = projectOccurrences(
      [item({ status: 'paused', paused_at: '2026-03-01', paused_until: '2026-06-01' })],
      H1, H2,
    );
    assert.ok(!dates(result).includes('2026-03-13'));
    assert.ok(!dates(result).includes('2026-05-13'));
    assert.ok(dates(result).includes('2026-02-13'));
    assert.ok(dates(result).includes('2026-06-13'));
  });

  test('an indefinite pause suppresses everything after paused_at', () => {
    const result = projectOccurrences(
      [item({ status: 'paused', paused_at: '2026-03-01', paused_until: null })],
      H1, H2,
    );
    assert.deepEqual(dates(result), ['2026-01-13', '2026-02-13']);
  });

  test('cancellation keeps history and drops the future', () => {
    const result = projectOccurrences(
      [item({ status: 'cancelled', cancellation_date: '2026-04-20' })],
      H1, H2,
    );
    assert.deepEqual(dates(result), ['2026-01-13', '2026-02-13', '2026-03-13', '2026-04-13']);
  });

  test('a trial emits a trial-end marker and no charge before it', () => {
    const result = projectOccurrences(
      [item({ status: 'trial', trial_end_date: '2026-03-13', start_date: '2026-01-13' })],
      H1, H2,
    );
    const marker = result.filter((o) => o.kind === 'trial-end');
    assert.equal(marker.length, 1);
    assert.equal(marker[0].isoDate, '2026-03-13');
    assert.equal(marker[0].amount, 0);

    const charges = result.filter((o) => o.kind === 'charge');
    assert.ok(!dates(charges).includes('2026-02-13'));
    assert.ok(dates(charges).includes('2026-04-13'));
  });

  test('an item with no next_billing_date is skipped rather than throwing', () => {
    const result = projectOccurrences([item({ next_billing_date: '' })], H1, H2);
    assert.deepEqual(result, []);
  });

  test('results are sorted by date', () => {
    const result = projectOccurrences(
      [item({ id: 'b', next_billing_date: '2026-08-20' }), item({ id: 'a' })],
      parseLocalDate('2026-08-01'),
      parseLocalDate('2026-08-31'),
    );
    assert.deepEqual(dates(result), ['2026-08-13', '2026-08-20']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun test src/utils/occurrences.test.ts
```

Expected: FAIL — `projectOccurrences` is not exported.

- [ ] **Step 3: Write the implementation**

Add to the imports at the top of `src/utils/occurrences.ts`:

```ts
import type { ItemWithCategory } from '@/types';
import { formatISODate, getToday, parseLocalDate } from './dates';
```

Then append:

```ts
export type OccurrenceKind = 'charge' | 'trial-end';

export interface Occurrence {
  /** `${item.id}:${isoDate}:${kind}` — stable React key */
  id: string;
  item: ItemWithCategory;
  /** local midnight */
  date: Date;
  isoDate: string;
  /** the charge amount; always 0 for a trial-end marker */
  amount: number;
  kind: OccurrenceKind;
  /** date is strictly before today */
  isPast: boolean;
  /** a charge that should have landed and was never superseded */
  isOverdue: boolean;
}

export interface ItemSchedule {
  anchor: Date;
  cycle: BillingCycle;
  /** no occurrence before this date */
  earliest: Date;
  /** no occurrence after this date, inclusive; null is open-ended */
  latest: Date | null;
  /** start of the suppressed window, or null when not paused */
  pausedFrom: Date | null;
  /** end of the suppressed window, exclusive; null means indefinite */
  pausedUntil: Date | null;
  trialEnd: Date | null;
}

function parseOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = parseLocalDate(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const laterOf = (a: Date, b: Date) => (a.getTime() >= b.getTime() ? a : b);
const earlierOf = (a: Date, b: Date) => (a.getTime() <= b.getTime() ? a : b);

/**
 * Collapses an item's lifecycle fields into the window its charges may
 * occupy. Returns null when the item carries no usable anchor.
 */
export function getItemSchedule(item: ItemWithCategory): ItemSchedule | null {
  const anchor = parseOrNull(item.next_billing_date);
  if (!anchor) return null;

  const trialEnd = parseOrNull(item.trial_end_date);
  let earliest = parseOrNull(item.start_date) ?? anchor;

  // A trial's first charge cannot land before the trial lapses.
  if (item.status === 'trial' && trialEnd) {
    earliest = laterOf(earliest, trialEnd);
  }

  const cancelled = parseOrNull(item.cancellation_date) ?? parseOrNull(item.cancelled_at);
  const archived = parseOrNull(item.archived_at);
  let latest: Date | null = cancelled;
  if (archived) latest = latest ? earlierOf(latest, archived) : archived;

  return {
    anchor,
    cycle: item.billing_cycle,
    earliest,
    latest,
    // paused_at can be stale on a resumed item, so it only gates while the
    // item is actually paused.
    pausedFrom: item.status === 'paused' ? parseOrNull(item.paused_at) : null,
    pausedUntil: item.status === 'paused' ? parseOrNull(item.paused_until) : null,
    trialEnd,
  };
}

function isScheduleOpen(schedule: ItemSchedule, date: Date): boolean {
  if (date.getTime() < schedule.earliest.getTime()) return false;
  if (schedule.latest && date.getTime() > schedule.latest.getTime()) return false;

  if (schedule.pausedFrom && date.getTime() >= schedule.pausedFrom.getTime()) {
    if (!schedule.pausedUntil) return false;
    if (date.getTime() < schedule.pausedUntil.getTime()) return false;
  }

  return true;
}

function inRange(date: Date, start: Date, end: Date): boolean {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function buildOccurrence(
  item: ItemWithCategory,
  date: Date,
  kind: OccurrenceKind,
  today: Date,
): Occurrence {
  const isoDate = formatISODate(date);
  const isPast = date.getTime() < today.getTime();

  return {
    id: `${item.id}:${isoDate}:${kind}`,
    item,
    date,
    isoDate,
    amount: kind === 'charge' ? item.amount : 0,
    kind,
    isPast,
    isOverdue: kind === 'charge' && isPast && item.status === 'active',
  };
}

/**
 * Every occurrence landing inside [rangeStart, rangeEnd], sorted by date
 * then by descending amount. This is the only recurrence entry point —
 * lenses, totals, and the cash-flow strip all fold over its output.
 */
export function projectOccurrences(
  items: ItemWithCategory[],
  rangeStart: Date,
  rangeEnd: Date,
): Occurrence[] {
  const today = getToday();
  const result: Occurrence[] = [];

  for (const item of items) {
    const schedule = getItemSchedule(item);
    if (!schedule) continue;

    if (
      item.status === 'trial' &&
      schedule.trialEnd &&
      inRange(schedule.trialEnd, rangeStart, rangeEnd)
    ) {
      result.push(buildOccurrence(item, schedule.trialEnd, 'trial-end', today));
    }

    const { lo, hi } = occurrenceIndexBounds(schedule.anchor, schedule.cycle, rangeStart, rangeEnd);
    for (let n = lo; n <= hi; n += 1) {
      const date = occurrenceAt(schedule.anchor, schedule.cycle, n);
      if (!inRange(date, rangeStart, rangeEnd)) continue;
      if (!isScheduleOpen(schedule, date)) continue;
      result.push(buildOccurrence(item, date, 'charge', today));
    }
  }

  return result.sort((a, b) => {
    const byDate = a.date.getTime() - b.date.getTime();
    if (byDate !== 0) return byDate;
    const byAmount = b.amount - a.amount;
    if (byAmount !== 0) return byAmount;
    return a.item.name.localeCompare(b.item.name);
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
bun test src/utils/occurrences.test.ts
```

Expected: PASS, 14 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
bunx tsc --noEmit
git add src/utils/occurrences.ts src/utils/occurrences.test.ts
git commit -m "feat(calendar): project occurrences with lifecycle gates"
```

---

## Task 3: Filters, day grouping, and day summaries

**Files:**
- Modify: `src/utils/occurrences.ts`
- Test: `src/utils/occurrences.test.ts`

**Interfaces:**
- Consumes: `Occurrence`, `projectOccurrences` from Task 2.
- Produces: `UNCATEGORIZED_FILTER_ID`, a real `OccurrenceFilters`, `groupByDay(occurrences: Occurrence[]): Map<string, Occurrence[]>`, `sumOccurrences(occurrences: Occurrence[]): number`, and `summariseDay(occurrences: Occurrence[], categoryLookup: ReadonlyMap<string, Category>): DaySummary`.

`DaySummary` carries what `DayCell` needs so the component does no derivation:

```ts
export interface DaySummary {
  total: number;
  count: number;
  accentColor: string | null;
  hasOverdue: boolean;
  hasTrialEnd: boolean;
}
```

`accentColor` is the **largest-amount occurrence's** category colour, falling back to `UNCATEGORIZED_CATEGORY_COLOR`. One hue reads faster than a blend, and the biggest charge is the one worth flagging.

- [ ] **Step 1: Write the failing test**

Append to `src/utils/occurrences.test.ts`:

```ts
import type { Category } from '@/types';
import { createCategoryLookup } from './categories';
import {
  UNCATEGORIZED_FILTER_ID,
  groupByDay,
  summariseDay,
  sumOccurrences,
} from './occurrences';

const category = (id: string, color: string): Category => ({
  id,
  name: `Category ${id}`,
  color,
  icon: null,
  category_type: 'subscription',
  created_at: '2026-01-01T00:00:00Z',
});

describe('filters', () => {
  const items = [
    item({ id: 'sub', item_type: 'subscription', category_id: 'cat-a' }),
    item({ id: 'bill', item_type: 'bill', category_id: null }),
    item({ id: 'gone', status: 'archived', archived_at: '2026-06-01' }),
  ];

  test('archived items are excluded by default and opt-in only', () => {
    assert.ok(!projectOccurrences(items, H1, H2).some((o) => o.item.id === 'gone'));
    assert.ok(
      projectOccurrences(items, H1, H2, { includeArchived: true }).some((o) => o.item.id === 'gone'),
    );
  });

  test('itemType narrows to one kind', () => {
    const result = projectOccurrences(items, H1, H2, { itemType: 'bill' });
    assert.ok(result.every((o) => o.item.item_type === 'bill'));
    assert.ok(result.length > 0);
  });

  test('an uncategorised item matches only via the sentinel', () => {
    const withoutSentinel = projectOccurrences(items, H1, H2, { categoryIds: ['cat-a'] });
    assert.ok(!withoutSentinel.some((o) => o.item.id === 'bill'));

    const withSentinel = projectOccurrences(items, H1, H2, {
      categoryIds: ['cat-a', UNCATEGORIZED_FILTER_ID],
    });
    assert.ok(withSentinel.some((o) => o.item.id === 'bill'));
  });

  test('a null categoryIds applies no category filter', () => {
    const result = projectOccurrences(items, H1, H2, { categoryIds: null });
    assert.ok(result.some((o) => o.item.id === 'bill'));
    assert.ok(result.some((o) => o.item.id === 'sub'));
  });
});

describe('day folding', () => {
  test('groupByDay keys by ISO date and preserves order', () => {
    const grouped = groupByDay(
      projectOccurrences(
        [item({ id: 'a' }), item({ id: 'b', amount: 5, next_billing_date: '2026-08-13' })],
        parseLocalDate('2026-08-01'),
        parseLocalDate('2026-08-31'),
      ),
    );
    assert.equal(grouped.get('2026-08-13')?.length, 2);
    assert.equal(grouped.get('2026-08-13')?.[0].item.id, 'a');
  });

  test('sumOccurrences totals amounts', () => {
    const occurrences = projectOccurrences(
      [item({ id: 'a', amount: 10 }), item({ id: 'b', amount: 2.5 })],
      parseLocalDate('2026-08-01'),
      parseLocalDate('2026-08-31'),
    );
    assert.equal(sumOccurrences(occurrences), 12.5);
  });

  test('summariseDay takes its accent from the largest charge', () => {
    const lookup = createCategoryLookup([category('cat-a', '#111111'), category('cat-b', '#222222')]);
    const occurrences = projectOccurrences(
      [
        item({ id: 'small', amount: 5, category_id: 'cat-a' }),
        item({ id: 'big', amount: 50, category_id: 'cat-b' }),
      ],
      parseLocalDate('2026-08-01'),
      parseLocalDate('2026-08-31'),
    );

    const summary = summariseDay(occurrences, lookup);
    assert.equal(summary.accentColor, '#222222');
    assert.equal(summary.count, 2);
    assert.equal(summary.total, 55);
  });

  test('summariseDay reports an empty day', () => {
    const summary = summariseDay([], createCategoryLookup([]));
    assert.equal(summary.accentColor, null);
    assert.equal(summary.count, 0);
    assert.equal(summary.total, 0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun test src/utils/occurrences.test.ts
```

Expected: FAIL — `UNCATEGORIZED_FILTER_ID` is not exported.

- [ ] **Step 3: Write the implementation**

Extend the imports in `src/utils/occurrences.ts`:

```ts
import type { Category, ItemType, ItemWithCategory } from '@/types';
import { UNCATEGORIZED_CATEGORY_COLOR, resolveItemCategoryDisplay } from './categories';
```

Add the filter type and predicate. Neither exists yet — Task 2 deliberately left them out rather than shipping an empty scaffold:

```ts
/**
 * Stands in for `category_id === null` so "uncategorised" can be selected
 * and deselected like any other category. Without it, uncategorised items
 * silently vanish the moment any category filter is applied.
 */
export const UNCATEGORIZED_FILTER_ID = '__uncategorized__';

export interface OccurrenceFilters {
  itemType?: ItemType | 'all';
  /**
   * null means no category filter at all. A non-null array filters to
   * those ids; items with a null `category_id` match only when the array
   * contains UNCATEGORIZED_FILTER_ID.
   */
  categoryIds?: string[] | null;
  /** default true */
  includePaused?: boolean;
  /** default true */
  includeCancelled?: boolean;
  /** default false */
  includeArchived?: boolean;
}

function passesFilters(item: ItemWithCategory, filters: OccurrenceFilters): boolean {
  if (filters.itemType && filters.itemType !== 'all' && item.item_type !== filters.itemType) {
    return false;
  }

  if (filters.categoryIds) {
    const key = item.category_id ?? UNCATEGORIZED_FILTER_ID;
    if (!filters.categoryIds.includes(key)) return false;
  }

  if (item.status === 'paused' && filters.includePaused === false) return false;
  if (item.status === 'cancelled' && filters.includeCancelled === false) return false;
  if (item.status === 'archived' && filters.includeArchived !== true) return false;

  return true;
}
```

Then widen `projectOccurrences` to accept them — add the fourth parameter and the guard at the top of the item loop:

```ts
export function projectOccurrences(
  items: ItemWithCategory[],
  rangeStart: Date,
  rangeEnd: Date,
  filters: OccurrenceFilters = {},
): Occurrence[] {
  const today = getToday();
  const result: Occurrence[] = [];

  for (const item of items) {
    if (!passesFilters(item, filters)) continue;

    const schedule = getItemSchedule(item);
    // ...the rest of the loop body from Task 2 is unchanged
```

Append the folds:

```ts
export interface DaySummary {
  total: number;
  count: number;
  /** category colour of the largest charge; null when the day is empty */
  accentColor: string | null;
  hasOverdue: boolean;
  hasTrialEnd: boolean;
}

export function groupByDay(occurrences: Occurrence[]): Map<string, Occurrence[]> {
  const grouped = new Map<string, Occurrence[]>();

  for (const occurrence of occurrences) {
    const bucket = grouped.get(occurrence.isoDate);
    if (bucket) bucket.push(occurrence);
    else grouped.set(occurrence.isoDate, [occurrence]);
  }

  return grouped;
}

export function sumOccurrences(occurrences: Occurrence[]): number {
  return occurrences.reduce((total, occurrence) => total + occurrence.amount, 0);
}

/**
 * Everything DayCell needs, so the component derives nothing itself.
 * The accent follows the largest charge — a single hue reads faster than
 * a blend, and the biggest charge is the one worth flagging.
 */
export function summariseDay(
  occurrences: Occurrence[],
  categoryLookup: ReadonlyMap<string, Category>,
): DaySummary {
  if (occurrences.length === 0) {
    return { total: 0, count: 0, accentColor: null, hasOverdue: false, hasTrialEnd: false };
  }

  const charges = occurrences.filter((occurrence) => occurrence.kind === 'charge');
  const largest = charges.reduce<Occurrence | null>(
    (best, occurrence) => (!best || occurrence.amount > best.amount ? occurrence : best),
    null,
  );

  return {
    total: sumOccurrences(occurrences),
    count: occurrences.length,
    accentColor: largest
      ? resolveItemCategoryDisplay(largest.item, categoryLookup).color
      : UNCATEGORIZED_CATEGORY_COLOR,
    hasOverdue: occurrences.some((occurrence) => occurrence.isOverdue),
    hasTrialEnd: occurrences.some((occurrence) => occurrence.kind === 'trial-end'),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
bun test src/utils/occurrences.test.ts
```

Expected: PASS, 23 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
bunx tsc --noEmit
git add src/utils/occurrences.ts src/utils/occurrences.test.ts
git commit -m "feat(calendar): add occurrence filters and day folds"
```

---

## Task 4: Range math

**Files:**
- Create: `src/components/calendar/calendarRange.ts`
- Test: `src/components/calendar/calendarRange.test.ts`

**Interfaces:**
- Produces: `CalendarLens`, `CalendarRange`, `getCalendarRange(lens, anchor)`, `shiftAnchor(lens, anchor, direction)`, `formatRangeTitle(lens, anchor)`, `buildGridDays(gridStart, gridEnd)`.

**The range/grid distinction — read this before writing code.** `rangeStart`/`rangeEnd` bound the period the lens is *about* (the calendar month). `gridStart`/`gridEnd` bound what is *drawn*, week-padded so leading and trailing rows include adjacent-month days. The engine is always called with the **grid** bounds, because those padded days must render their icons. Headline totals then filter back to the **range** bounds so "August" means August.

- [ ] **Step 1: Write the failing test**

Create `src/components/calendar/calendarRange.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { formatISODate, parseLocalDate } from '@/utils/dates';
import {
  buildGridDays,
  formatRangeTitle,
  getCalendarRange,
  shiftAnchor,
} from './calendarRange';

describe('getCalendarRange', () => {
  test('month range is the calendar month, grid is week-padded', () => {
    const range = getCalendarRange('month', parseLocalDate('2026-08-13'));
    assert.equal(formatISODate(range.rangeStart), '2026-08-01');
    assert.equal(formatISODate(range.rangeEnd), '2026-08-31');
    assert.equal(formatISODate(range.gridStart), '2026-07-26');
    assert.equal(formatISODate(range.gridEnd), '2026-09-05');
  });

  test('week range and grid are identical', () => {
    const range = getCalendarRange('week', parseLocalDate('2026-08-13'));
    assert.equal(formatISODate(range.rangeStart), '2026-08-09');
    assert.equal(formatISODate(range.rangeEnd), '2026-08-15');
    assert.equal(formatISODate(range.gridStart), '2026-08-09');
    assert.equal(formatISODate(range.gridEnd), '2026-08-15');
  });

  test('year range is the calendar year', () => {
    const range = getCalendarRange('year', parseLocalDate('2026-08-13'));
    assert.equal(formatISODate(range.rangeStart), '2026-01-01');
    assert.equal(formatISODate(range.rangeEnd), '2026-12-31');
    assert.equal(formatISODate(range.gridStart), '2025-12-28');
    assert.equal(formatISODate(range.gridEnd), '2027-01-02');
  });

  test('the month grid always holds whole weeks', () => {
    for (const iso of ['2026-02-13', '2026-08-13', '2027-05-01']) {
      const range = getCalendarRange('month', parseLocalDate(iso));
      const days = buildGridDays(range.gridStart, range.gridEnd);
      assert.equal(days.length % 7, 0, `expected whole weeks for ${iso}`);
    }
  });
});

describe('shiftAnchor', () => {
  test('paging moves by one lens unit', () => {
    const anchor = parseLocalDate('2026-08-13');
    assert.equal(formatISODate(shiftAnchor('week', anchor, 1)), '2026-08-20');
    assert.equal(formatISODate(shiftAnchor('month', anchor, -1)), '2026-07-13');
    assert.equal(formatISODate(shiftAnchor('year', anchor, 1)), '2027-08-13');
  });

  test('paging a month-end anchor does not strand it', () => {
    assert.equal(formatISODate(shiftAnchor('month', parseLocalDate('2026-01-31'), 1)), '2026-02-28');
  });
});

describe('formatRangeTitle', () => {
  test('each lens names its range', () => {
    const anchor = parseLocalDate('2026-08-13');
    assert.equal(formatRangeTitle('month', anchor), 'August 2026');
    assert.equal(formatRangeTitle('year', anchor), '2026');
    assert.equal(formatRangeTitle('week', anchor), 'Aug 9 – 15, 2026');
  });

  test('a week spanning two months names both', () => {
    assert.equal(
      formatRangeTitle('week', parseLocalDate('2026-08-31')),
      'Aug 30 – Sep 5, 2026',
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun test src/components/calendar/calendarRange.test.ts
```

Expected: FAIL — cannot resolve `./calendarRange`.

- [ ] **Step 3: Write the implementation**

Create `src/components/calendar/calendarRange.ts`:

```ts
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';

export type CalendarLens = 'week' | 'month' | 'year';

export interface CalendarRange {
  /** the period the lens is about, inclusive */
  rangeStart: Date;
  rangeEnd: Date;
  /** what is actually drawn — week-padded, inclusive */
  gridStart: Date;
  gridEnd: Date;
}

/** Sunday-first, matching macOS Calendar's US default. */
const WEEK_OPTIONS = { weekStartsOn: 0 } as const;

export function getCalendarRange(lens: CalendarLens, anchor: Date): CalendarRange {
  if (lens === 'week') {
    const rangeStart = startOfWeek(anchor, WEEK_OPTIONS);
    const rangeEnd = endOfWeek(anchor, WEEK_OPTIONS);
    return { rangeStart, rangeEnd, gridStart: rangeStart, gridEnd: rangeEnd };
  }

  if (lens === 'year') {
    const rangeStart = startOfYear(anchor);
    const rangeEnd = endOfYear(anchor);
    return {
      rangeStart,
      rangeEnd,
      gridStart: startOfWeek(rangeStart, WEEK_OPTIONS),
      gridEnd: endOfWeek(rangeEnd, WEEK_OPTIONS),
    };
  }

  const rangeStart = startOfMonth(anchor);
  const rangeEnd = endOfMonth(anchor);
  return {
    rangeStart,
    rangeEnd,
    gridStart: startOfWeek(rangeStart, WEEK_OPTIONS),
    gridEnd: endOfWeek(rangeEnd, WEEK_OPTIONS),
  };
}

export function shiftAnchor(lens: CalendarLens, anchor: Date, direction: -1 | 1): Date {
  if (lens === 'week') return addWeeks(anchor, direction);
  if (lens === 'year') return addYears(anchor, direction);
  return addMonths(anchor, direction);
}

export function formatRangeTitle(lens: CalendarLens, anchor: Date): string {
  if (lens === 'year') return format(anchor, 'yyyy');
  if (lens === 'month') return format(anchor, 'MMMM yyyy');

  const start = startOfWeek(anchor, WEEK_OPTIONS);
  const end = endOfWeek(anchor, WEEK_OPTIONS);
  const tail = isSameMonth(start, end) ? format(end, 'd, yyyy') : format(end, 'MMM d, yyyy');

  return `${format(start, 'MMM d')} – ${tail}`;
}

/** Every day from gridStart to gridEnd inclusive, in order. */
export function buildGridDays(gridStart: Date, gridEnd: Date): Date[] {
  const days: Date[] = [];
  for (let day = gridStart; day.getTime() <= gridEnd.getTime(); day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
bun test src/components/calendar/calendarRange.test.ts
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
bunx tsc --noEmit
git add src/components/calendar/calendarRange.ts src/components/calendar/calendarRange.test.ts
git commit -m "feat(calendar): add lens range and grid math"
```

---

## Task 5: App shell wiring

Get a navigable Calendar destination on screen. Deliverable: clicking Calendar in the sidebar shows a placeholder page.

**Files:**
- Modify: `src/app/types.ts`
- Modify: `src/app/constants.ts`
- Modify: `src/app/hooks/useGlobalShortcuts.ts:72-86`
- Modify: `src/app/components/AppContent.tsx`
- Create: `src/components/calendar/CalendarView.tsx`

**Interfaces:**
- Produces: `CalendarView` as a default export taking `{ items: ItemWithCategory[]; categories: Category[]; onEdit: (item: ItemWithCategory) => void }`. Tasks 7–13 build it out; this task lands the shell.

- [ ] **Step 1: Extend the View union**

In `src/app/types.ts`:

```ts
export type View =
  | 'dashboard'
  | 'calendar'
  | 'bills'
  | 'subscriptions'
  | 'analytics'
  | 'settings';
```

- [ ] **Step 2: Add nav entry and view copy**

In `src/app/constants.ts`, add `CalendarDays` to the lucide import, add to `VIEW_CONTENT`:

```ts
  calendar: {
    label: 'Planning',
    title: 'Calendar',
    description: 'Your bills and subscriptions across time',
  },
```

and put Calendar second in `NAV_ITEMS`:

```ts
export const NAV_ITEMS: Array<{
  id: Exclude<View, 'settings'>;
  label: string;
  icon: LucideIcon;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'bills', label: 'Bills', icon: Receipt },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];
```

- [ ] **Step 3: Renumber the global shortcuts**

In `src/app/hooks/useGlobalShortcuts.ts`, replace the block at lines 72-86:

```ts
      if (mod && event.key >= '1' && event.key <= '6') {
        event.preventDefault();
        const views: View[] = [
          'dashboard',
          'calendar',
          'subscriptions',
          'bills',
          'analytics',
          'settings',
        ];
        const index = parseInt(event.key, 10) - 1;
        if (index < views.length) {
          onNavigateViewRef.current(views[index]);
        }
        return;
      }
```

This shifts Subscriptions, Bills, and Analytics down one and moves Settings from `⌘5` to `⌘6`. Accepted so the sidebar groups overview → time → things → insight.

- [ ] **Step 4: Create the CalendarView shell**

Create `src/components/calendar/CalendarView.tsx`:

```tsx
import type { Category, ItemWithCategory } from '@/types';

interface CalendarViewProps {
  items: ItemWithCategory[];
  categories: Category[];
  onEdit: (item: ItemWithCategory) => void;
}

export default function CalendarView({ items }: CalendarViewProps) {
  return (
    <div className="card">
      <p style={{ color: 'var(--text-secondary)' }}>
        {items.length} items ready to project.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Wire the route**

In `src/app/components/AppContent.tsx`, add beside the other lazy imports:

```tsx
const CalendarView = lazy(() => import('@/components/calendar/CalendarView'));
```

and add the route block after the `dashboard` block:

```tsx
          {view === 'calendar' && (
            <ErrorBoundary>
              <Suspense fallback={<LazyComponentFallback />}>
                <CalendarView
                  items={items}
                  categories={categories}
                  onEdit={onEditItem}
                />
              </Suspense>
            </ErrorBoundary>
          )}
```

- [ ] **Step 6: Verify it renders**

```bash
bunx tsc --noEmit
```

Then start the dev server via the preview tooling (never `bun run dev` in a shell — use `preview_start` with a `.claude/launch.json` entry pointing at `bun run dev` on port 1420), navigate to Calendar in the sidebar, and confirm the placeholder shows a non-zero item count. Confirm `⌘2` reaches Calendar and `⌘6` reaches Settings.

- [ ] **Step 7: Commit**

```bash
git add src/app src/components/calendar/CalendarView.tsx
git commit -m "feat(calendar): add calendar destination to the app shell"
```

---

## Task 6: DayCell

**Files:**
- Create: `src/components/calendar/DayCell.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `Occurrence`, `DaySummary` from `@/utils/occurrences`; `ServiceLogo` from `@/components/ui/ServiceLogo`.
- Produces: `DayCell` as a default export with props `{ date: Date; occurrences: Occurrence[]; summary: DaySummary; isToday: boolean; isSelected: boolean; isOutsideRange: boolean; isFocused: boolean; onSelect: (date: Date) => void }`.

State ranking, highest wins, since state outranks category: overdue → `--accent-red`; trial end → `--accent-amber`; otherwise `summary.accentColor`.

- [ ] **Step 1: Add the layout classes**

Append to `src/index.css`:

```css
/* ============ Calendar ============ */

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 3px;
}

.calendar-day {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 96px;
  text-align: left;
  transition:
    background-color 0.15s ease,
    box-shadow 0.15s ease;
}

.calendar-day:hover {
  background: var(--bg-hover);
}

.calendar-day:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: -2px;
}

.calendar-day-accent {
  height: 2px;
  flex-shrink: 0;
}

.calendar-day-body {
  padding: 6px 8px 8px;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 4px;
}

.calendar-day-number {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
}

.calendar-day-total {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
}

.calendar-logo-stack {
  display: flex;
  align-items: center;
  flex: 1;
}

.calendar-logo-stack > * + * {
  margin-left: -7px;
}

.calendar-logo-ring {
  box-shadow: 0 0 0 2px var(--bg-card);
  border-radius: 6px;
}
```

- [ ] **Step 2: Write the component**

Create `src/components/calendar/DayCell.tsx`:

```tsx
import { memo } from 'react';
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

  const label =
    summary.count === 0
      ? `${date.toDateString()} — nothing due`
      : `${date.toDateString()} — ${summary.count} ${summary.count === 1 ? 'charge' : 'charges'}, ${formatCurrency(summary.total)}${summary.hasOverdue ? ', overdue' : ''}${summary.hasTrialEnd ? ', trial ends' : ''}`;

  return (
    <button
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
```

Note `ServiceLogo`'s `sm` size is 32px, which is what the stack is sized around.

- [ ] **Step 3: Typecheck and commit**

```bash
bunx tsc --noEmit
git add src/components/calendar/DayCell.tsx src/index.css
git commit -m "feat(calendar): add day cell with icon stack and accent edge"
```

---

## Task 7: Month grid and the wired shell

Deliverable: a working month calendar with real data, paging, and a lens switcher.

**Files:**
- Create: `src/components/calendar/MonthGrid.tsx`
- Modify: `src/components/calendar/CalendarView.tsx`

**Interfaces:**
- Consumes: `DayCell` (Task 6), `getCalendarRange`/`buildGridDays`/`formatRangeTitle`/`shiftAnchor` (Task 4), `projectOccurrences`/`groupByDay`/`summariseDay` (Tasks 2–3).
- Produces: `MonthGrid` default export with props `{ gridDays: Date[]; occurrencesByDay: Map<string, Occurrence[]>; categoryLookup: ReadonlyMap<string, Category>; rangeStart: Date; rangeEnd: Date; selectedDate: Date; focusedDate: Date; onSelect: (date: Date) => void }`.

- [ ] **Step 1: Write MonthGrid**

Create `src/components/calendar/MonthGrid.tsx`:

```tsx
import { useMemo } from 'react';
import { isSameDay, isToday } from 'date-fns';
import type { Category } from '@/types';
import { formatISODate } from '@/utils/dates';
import { summariseDay, type Occurrence } from '@/utils/occurrences';
import DayCell from './DayCell';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface MonthGridProps {
  gridDays: Date[];
  occurrencesByDay: Map<string, Occurrence[]>;
  categoryLookup: ReadonlyMap<string, Category>;
  rangeStart: Date;
  rangeEnd: Date;
  selectedDate: Date;
  focusedDate: Date;
  onSelect: (date: Date) => void;
}

export default function MonthGrid({
  gridDays,
  occurrencesByDay,
  categoryLookup,
  rangeStart,
  rangeEnd,
  selectedDate,
  focusedDate,
  onSelect,
}: MonthGridProps) {
  // Chunked into weeks because `role="gridcell"` is only valid ARIA with
  // `role="row"` ancestry inside `role="grid"`. Each row is its own 7-column
  // grid, so the visual result is identical to one flat 7-column grid.
  const weeks = useMemo(() => {
    const rows: Date[][] = [];
    for (let index = 0; index < gridDays.length; index += 7) {
      rows.push(gridDays.slice(index, index + 7));
    }
    return rows;
  }, [gridDays]);

  return (
    <div>
      <div className="calendar-grid" style={{ marginBottom: 6, padding: '0 3px' }}>
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            aria-hidden="true"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            {weekday}
          </div>
        ))}
      </div>

      <div
        role="grid"
        aria-label="Month view"
        className="flex flex-col gap-[3px] rounded-xl p-[3px]"
        style={{ background: 'var(--bg-surface)' }}
      >
        {weeks.map((week) => (
          <div key={formatISODate(week[0])} role="row" className="calendar-grid">
            {week.map((day) => {
              const isoDate = formatISODate(day);
              const occurrences = occurrencesByDay.get(isoDate) ?? [];

              return (
                <DayCell
                  key={isoDate}
                  date={day}
                  occurrences={occurrences}
                  summary={summariseDay(occurrences, categoryLookup)}
                  isToday={isToday(day)}
                  isSelected={isSameDay(day, selectedDate)}
                  isFocused={isSameDay(day, focusedDate)}
                  isOutsideRange={day < rangeStart || day > rangeEnd}
                  onSelect={onSelect}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire CalendarView**

Replace `src/components/calendar/CalendarView.tsx` entirely:

```tsx
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SegmentedControl from '@/components/ui/SegmentedControl';
import type { Category, ItemWithCategory } from '@/types';
import { createCategoryLookup } from '@/utils/categories';
import { getToday } from '@/utils/dates';
import { groupByDay, projectOccurrences } from '@/utils/occurrences';
import {
  buildGridDays,
  formatRangeTitle,
  getCalendarRange,
  shiftAnchor,
  type CalendarLens,
} from './calendarRange';
import MonthGrid from './MonthGrid';

interface CalendarViewProps {
  items: ItemWithCategory[];
  categories: Category[];
  onEdit: (item: ItemWithCategory) => void;
}

const LENS_TABS: Array<{ id: CalendarLens; label: string }> = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

export default function CalendarView({ items, categories }: CalendarViewProps) {
  const [lens, setLens] = useState<CalendarLens>('month');
  const [anchor, setAnchor] = useState<Date>(() => getToday());
  const [selectedDate, setSelectedDate] = useState<Date>(() => getToday());

  const range = useMemo(() => getCalendarRange(lens, anchor), [lens, anchor]);
  const gridDays = useMemo(
    () => buildGridDays(range.gridStart, range.gridEnd),
    [range.gridStart, range.gridEnd],
  );
  const categoryLookup = useMemo(() => createCategoryLookup(categories), [categories]);

  // Projected over the GRID bounds so padded adjacent-month days render
  // their icons. Headline totals filter back to the range bounds.
  const occurrences = useMemo(
    () => projectOccurrences(items, range.gridStart, range.gridEnd),
    [items, range.gridStart, range.gridEnd],
  );
  const occurrencesByDay = useMemo(() => groupByDay(occurrences), [occurrences]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {formatRangeTitle(lens, anchor)}
        </h3>

        <div className="flex items-center gap-2">
          <SegmentedControl tabs={LENS_TABS} activeTab={lens} onTabChange={setLens} />

          <button
            type="button"
            aria-label="Previous"
            className="nav-item rounded-lg p-1.5"
            onClick={() => setAnchor((current) => shiftAnchor(lens, current, -1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="nav-item rounded-lg px-2.5 py-1.5 text-sm"
            onClick={() => {
              const today = getToday();
              setAnchor(today);
              setSelectedDate(today);
            }}
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next"
            className="nav-item rounded-lg p-1.5"
            onClick={() => setAnchor((current) => shiftAnchor(lens, current, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {renderLens()}
    </div>
  );
}
```

Define `renderLens` inside the component, just above the `return`:

```tsx
  const renderLens = () => (
    <MonthGrid
      gridDays={gridDays}
      occurrencesByDay={occurrencesByDay}
      categoryLookup={categoryLookup}
      rangeStart={range.rangeStart}
      rangeEnd={range.rangeEnd}
      selectedDate={selectedDate}
      focusedDate={selectedDate}
      onSelect={setSelectedDate}
    />
  );
```

**This `renderLens` seam is deliberate.** Tasks 10 and 11 add the week and year lenses by editing only this function, so the surrounding layout, rail, and strip never have to be restated. Week and year lenses render the month grid until then.

- [ ] **Step 3: Verify in the browser**

```bash
bunx tsc --noEmit
```

In the preview: navigate to Calendar. Confirm real logos appear on due dates, today has a green pill, paging with `‹ ›` works and keeps the grid whole-week, and clicking a day outlines it. Check the console for errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/calendar
git commit -m "feat(calendar): render the month grid with live occurrence data"
```

---

## Task 8: Day inspector rail

**Files:**
- Create: `src/components/calendar/DayInspector.tsx`
- Modify: `src/components/calendar/CalendarView.tsx`

**Interfaces:**
- Produces: `DayInspector` default export with props `{ selectedDate: Date; selectedOccurrences: Occurrence[]; rangeOccurrences: Occurrence[]; upcoming: Occurrence[]; onEdit: (item: ItemWithCategory) => void }`.

`rangeOccurrences` is filtered to `rangeStart..rangeEnd` by the caller — this is where "August means August" is enforced.

- [ ] **Step 1: Write DayInspector**

Create `src/components/calendar/DayInspector.tsx`:

```tsx
import { format } from 'date-fns';
import type { ItemWithCategory } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { sumOccurrences, type Occurrence } from '@/utils/occurrences';

interface DayInspectorProps {
  selectedDate: Date;
  selectedOccurrences: Occurrence[];
  rangeOccurrences: Occurrence[];
  upcoming: Occurrence[];
  onEdit: (item: ItemWithCategory) => void;
}

function OccurrenceRow({
  occurrence,
  onEdit,
  showDate = false,
}: {
  occurrence: Occurrence;
  onEdit: (item: ItemWithCategory) => void;
  showDate?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(occurrence.item)}
      className="w-full flex items-center gap-2.5 py-2 text-left"
      style={{ borderTop: '1px solid var(--border-default)' }}
    >
      <div className="min-w-0 flex-1">
        <p
          className="truncate"
          style={{ fontSize: 13, color: 'var(--text-primary)' }}
        >
          {occurrence.item.name}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          {occurrence.kind === 'trial-end'
            ? 'Trial ends'
            : showDate
              ? format(occurrence.date, 'MMM d')
              : occurrence.item.billing_cycle}
        </p>
      </div>
      {occurrence.kind === 'charge' && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: occurrence.isOverdue ? 'var(--accent-red)' : 'var(--text-primary)',
          }}
        >
          {formatCurrency(occurrence.amount, { currency: occurrence.item.currency })}
        </span>
      )}
    </button>
  );
}

export default function DayInspector({
  selectedDate,
  selectedOccurrences,
  rangeOccurrences,
  upcoming,
  onEdit,
}: DayInspectorProps) {
  const remaining = rangeOccurrences.filter((occurrence) => !occurrence.isPast).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="card" style={{ padding: 14 }}>
        <p className="label-wide">Due this period</p>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 22,
            fontWeight: 650,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            marginTop: 4,
          }}
        >
          {formatCurrency(sumOccurrences(rangeOccurrences), { display: 'summary' })}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
          {rangeOccurrences.length} charges · {remaining} remaining
        </p>
      </div>

      <div className="card flex-1" style={{ padding: 14 }}>
        <p className="label-wide">
          {selectedOccurrences.length > 0 ? format(selectedDate, 'EEE, MMM d') : 'Next up'}
        </p>

        <div style={{ marginTop: 8 }}>
          {selectedOccurrences.length > 0
            ? selectedOccurrences.map((occurrence) => (
                <OccurrenceRow key={occurrence.id} occurrence={occurrence} onEdit={onEdit} />
              ))
            : upcoming.map((occurrence) => (
                <OccurrenceRow
                  key={occurrence.id}
                  occurrence={occurrence}
                  onEdit={onEdit}
                  showDate
                />
              ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire the collapsible rail into CalendarView**

Add to the imports:

```tsx
import { useEffect } from 'react';
import { PanelRight } from 'lucide-react';
import { addDays } from 'date-fns';
import { formatISODate } from '@/utils/dates';
import DayInspector from './DayInspector';
```

Add state and derivations after `occurrencesByDay`:

```tsx
  const [railOpen, setRailOpen] = useState(true);
  const [railFits, setRailFits] = useState(() => window.innerWidth >= 1024);

  useEffect(() => {
    const onResize = () => setRailFits(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const showRail = railOpen && railFits;

  // "August" means August, so headline totals use the range bounds even
  // though the engine ran over the padded grid.
  const rangeOccurrences = useMemo(
    () =>
      occurrences.filter(
        (occurrence) =>
          occurrence.date >= range.rangeStart && occurrence.date <= range.rangeEnd,
      ),
    [occurrences, range.rangeStart, range.rangeEnd],
  );

  const selectedOccurrences = useMemo(
    () => occurrencesByDay.get(formatISODate(selectedDate)) ?? [],
    [occurrencesByDay, selectedDate],
  );

  const upcoming = useMemo(() => {
    const today = getToday();
    return projectOccurrences(items, today, addDays(today, 90)).slice(0, 5);
  }, [items]);
```

Add a rail toggle button next to `Today`:

```tsx
          {railFits && (
            <button
              type="button"
              aria-label={showRail ? 'Hide details' : 'Show details'}
              aria-pressed={showRail}
              className="nav-item rounded-lg p-1.5"
              onClick={() => setRailOpen((open) => !open)}
            >
              <PanelRight className="w-4 h-4" />
            </button>
          )}
```

Replace the bare `{renderLens()}` call in the returned JSX with the two-column layout:

```tsx
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showRail ? 'minmax(0, 1fr) 280px' : 'minmax(0, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {renderLens()}

        {showRail && (
          <DayInspector
            selectedDate={selectedDate}
            selectedOccurrences={selectedOccurrences}
            rangeOccurrences={rangeOccurrences}
            upcoming={upcoming}
            onEdit={onEdit}
          />
        )}
      </div>
```

`renderLens` itself is untouched. Destructure `onEdit` in the component signature.

- [ ] **Step 3: Verify**

```bash
bunx tsc --noEmit
```

In the preview: confirm the rail total matches the month (not the padded grid), selecting a day repopulates the rail, clicking a row opens `ItemForm`, the toggle hides the rail and the grid widens, and shrinking the window below 1024px hides the rail and its toggle.

- [ ] **Step 4: Commit**

```bash
git add src/components/calendar
git commit -m "feat(calendar): add collapsible day inspector rail"
```

---

## Task 9: Cash-flow strip

**Files:**
- Create: `src/components/calendar/CashFlowStrip.tsx`
- Modify: `src/components/calendar/CalendarView.tsx`

**Interfaces:**
- Produces: `CashFlowStrip` default export with props `{ gridDays: Date[]; occurrencesByDay: Map<string, Occurrence[]> }`.

**One bar per grid week, read left to right as a timeline of the month.** This is a horizontal timeline, not a per-row gutter — grid rows stack vertically and nothing beneath the grid can align with them. Each bar totals the whole week it is labelled with, so the first and last include adjacent-month days. The bars therefore sum to slightly more than the rail's month total — correct, not a defect.

- [ ] **Step 1: Write the component**

Create `src/components/calendar/CashFlowStrip.tsx`:

```tsx
import { useMemo } from 'react';
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

      result.push({
        total: week.reduce(
          (total, day) => total + sumOccurrences(occurrencesByDay.get(formatISODate(day)) ?? []),
          0,
        ),
        label: `${format(week[0], 'MMM d')} – ${format(week[week.length - 1], 'd')}`,
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
```

Add `format` to the date-fns import: `import { format } from 'date-fns';`

- [ ] **Step 2: Render it under the month grid only**

In `CalendarView`, wrap `renderLens` so the strip sits beneath the grid in the month lens only. Replace the `renderLens` definition from Task 7 with:

```tsx
  const renderLens = () => (
    <div className="flex flex-col gap-2">
      <MonthGrid
        gridDays={gridDays}
        occurrencesByDay={occurrencesByDay}
        categoryLookup={categoryLookup}
        rangeStart={range.rangeStart}
        rangeEnd={range.rangeEnd}
        selectedDate={selectedDate}
        focusedDate={selectedDate}
        onSelect={setSelectedDate}
      />
      {lens === 'month' && (
        <CashFlowStrip gridDays={gridDays} occurrencesByDay={occurrencesByDay} />
      )}
    </div>
  );
```

- [ ] **Step 3: Verify and commit**

```bash
bunx tsc --noEmit
```

In the preview: confirm there is one bar per grid week reading left to right, each labelled with its date span, and the heaviest week's bar is full height. Then:

```bash
git add src/components/calendar
git commit -m "feat(calendar): add per-week cash-flow strip"
```

---

## Task 10: Week lens

**Files:**
- Create: `src/components/calendar/WeekGrid.tsx`
- Modify: `src/components/calendar/CalendarView.tsx`

**Interfaces:**
- Produces: `WeekGrid` default export with props `{ gridDays: Date[]; occurrencesByDay: Map<string, Occurrence[]>; selectedDate: Date; onSelect: (date: Date) => void; onEdit: (item: ItemWithCategory) => void }`.

Seven tall columns. This is where names live at full length, since there is vertical room. Bills have no time-of-day, so there is no hour axis.

- [ ] **Step 1: Write WeekGrid**

Create `src/components/calendar/WeekGrid.tsx`:

```tsx
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
```

The `borderRadius: 0` alongside `borderLeft` is deliberate — rounded corners on a single-sided border read as a rendering bug.

- [ ] **Step 2: Branch on lens in CalendarView**

Replace the whole `renderLens` definition from Task 9 with:

```tsx
  const renderLens = () => {
    if (lens === 'week') {
      return (
        <WeekGrid
          gridDays={gridDays}
          occurrencesByDay={occurrencesByDay}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          onEdit={onEdit}
        />
      );
    }

    return (
      <div className="flex flex-col gap-2">
        <MonthGrid
          gridDays={gridDays}
          occurrencesByDay={occurrencesByDay}
          categoryLookup={categoryLookup}
          rangeStart={range.rangeStart}
          rangeEnd={range.rangeEnd}
          selectedDate={selectedDate}
          focusedDate={selectedDate}
          onSelect={setSelectedDate}
        />
        {lens === 'month' && (
          <CashFlowStrip gridDays={gridDays} occurrencesByDay={occurrencesByDay} />
        )}
      </div>
    );
  };
```

- [ ] **Step 3: Verify and commit**

```bash
bunx tsc --noEmit
```

In the preview: switch to Week, confirm seven full-height columns with readable names, paging moves one week, and the rail title says "Due this period" with the week's total.

```bash
git add src/components/calendar
git commit -m "feat(calendar): add week lens"
```

---

## Task 11: Year lens

**Files:**
- Create: `src/components/calendar/YearGrid.tsx`
- Modify: `src/components/calendar/CalendarView.tsx`

**Interfaces:**
- Produces: `YearGrid` default export with props `{ year: number; occurrencesByDay: Map<string, Occurrence[]>; onSelectMonth: (date: Date) => void; onSelectDay: (date: Date) => void }`.

Intensity is quantised into 4 steps rather than continuous, so the ramp reads as distinct bands instead of mush.

- [ ] **Step 1: Write YearGrid**

Create `src/components/calendar/YearGrid.tsx`:

```tsx
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

          <div
            role="grid"
            aria-label={format(first, 'MMMM yyyy')}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}
          >
            {days.map((day) => {
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
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Branch on lens**

Replace the whole `renderLens` definition from Task 10 with its final form:

```tsx
  const renderLens = () => {
    if (lens === 'year') {
      return (
        <YearGrid
          year={anchor.getFullYear()}
          occurrencesByDay={occurrencesByDay}
          onSelectMonth={(date) => {
            setAnchor(date);
            setLens('month');
          }}
          onSelectDay={(date) => {
            setAnchor(date);
            setSelectedDate(date);
            setLens('month');
          }}
        />
      );
    }

    if (lens === 'week') {
      return (
        <WeekGrid
          gridDays={gridDays}
          occurrencesByDay={occurrencesByDay}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          onEdit={onEdit}
        />
      );
    }

    return (
      <div className="flex flex-col gap-2">
        <MonthGrid
          gridDays={gridDays}
          occurrencesByDay={occurrencesByDay}
          categoryLookup={categoryLookup}
          rangeStart={range.rangeStart}
          rangeEnd={range.rangeEnd}
          selectedDate={selectedDate}
          focusedDate={selectedDate}
          onSelect={setSelectedDate}
        />
        <CashFlowStrip gridDays={gridDays} occurrencesByDay={occurrencesByDay} />
      </div>
    );
  };
```

The `lens === 'month'` guard on the strip is now redundant — the month branch is only reached in the month lens — so it is dropped.

- [ ] **Step 3: Verify and commit**

```bash
bunx tsc --noEmit
```

In the preview: switch to Year, confirm 12 mini months with visible intensity banding, clicking a month header drops into that month, clicking a day drops into that month with the day selected.

```bash
git add src/components/calendar
git commit -m "feat(calendar): add year lens with spend intensity"
```

---

## Task 12: Filter bar

**Files:**
- Create: `src/components/calendar/CalendarFilterBar.tsx`
- Modify: `src/components/calendar/CalendarView.tsx`

**Interfaces:**
- Consumes: `OccurrenceFilters`, `UNCATEGORIZED_FILTER_ID` from `@/utils/occurrences`.
- Produces: `CalendarFilterBar` default export with props `{ categories: Category[]; filters: OccurrenceFilters; onChange: (filters: OccurrenceFilters) => void }`.

Filters are passed into `projectOccurrences`, not applied in the grid, so the grid, strip, and totals stay consistent.

- [ ] **Step 1: Write the component**

Create `src/components/calendar/CalendarFilterBar.tsx`:

```tsx
import type { Category, ItemType } from '@/types';
import { UNCATEGORIZED_FILTER_ID, type OccurrenceFilters } from '@/utils/occurrences';

interface CalendarFilterBarProps {
  categories: Category[];
  filters: OccurrenceFilters;
  onChange: (filters: OccurrenceFilters) => void;
}

const TYPES: Array<{ id: ItemType | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'subscription', label: 'Subscriptions' },
  { id: 'bill', label: 'Bills' },
];

function Chip({
  active,
  label,
  onClick,
  swatch,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  swatch?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{
        fontSize: 12,
        background: active ? 'var(--brand-primary-light)' : 'var(--bg-hover)',
        color: active ? 'var(--brand-text)' : 'var(--text-secondary)',
        border: `1px solid ${active ? 'var(--brand-primary)' : 'transparent'}`,
      }}
    >
      {swatch && (
        <span
          aria-hidden="true"
          style={{ width: 7, height: 7, borderRadius: 999, background: swatch }}
        />
      )}
      {label}
    </button>
  );
}

export default function CalendarFilterBar({
  categories,
  filters,
  onChange,
}: CalendarFilterBarProps) {
  const selected = filters.categoryIds;

  const toggleCategory = (id: string) => {
    const everyId = [...categories.map((category) => category.id), UNCATEGORIZED_FILTER_ID];
    const current = selected ?? everyId;
    const next = current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id];

    onChange({ ...filters, categoryIds: next.length === everyId.length ? null : next });
  };

  const isCategoryActive = (id: string) => selected === null || selected === undefined || selected.includes(id);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TYPES.map((type) => (
        <Chip
          key={type.id}
          label={type.label}
          active={(filters.itemType ?? 'all') === type.id}
          onClick={() => onChange({ ...filters, itemType: type.id })}
        />
      ))}

      <span
        aria-hidden="true"
        style={{ width: 1, height: 18, background: 'var(--border-default)', margin: '0 4px' }}
      />

      {categories.map((category) => (
        <Chip
          key={category.id}
          label={category.name}
          swatch={category.color}
          active={isCategoryActive(category.id)}
          onClick={() => toggleCategory(category.id)}
        />
      ))}
      <Chip
        label="Uncategorized"
        active={isCategoryActive(UNCATEGORIZED_FILTER_ID)}
        onClick={() => toggleCategory(UNCATEGORIZED_FILTER_ID)}
      />

      <span
        aria-hidden="true"
        style={{ width: 1, height: 18, background: 'var(--border-default)', margin: '0 4px' }}
      />

      <Chip
        label="Paused"
        active={filters.includePaused !== false}
        onClick={() => onChange({ ...filters, includePaused: filters.includePaused === false })}
      />
      <Chip
        label="Cancelled"
        active={filters.includeCancelled !== false}
        onClick={() =>
          onChange({ ...filters, includeCancelled: filters.includeCancelled === false })
        }
      />
      <Chip
        label="Archived"
        active={filters.includeArchived === true}
        onClick={() => onChange({ ...filters, includeArchived: filters.includeArchived !== true })}
      />
    </div>
  );
}
```

- [ ] **Step 2: Wire into CalendarView**

Add state and pass filters into the engine:

```tsx
  const [filters, setFilters] = useState<OccurrenceFilters>({});

  const occurrences = useMemo(
    () => projectOccurrences(items, range.gridStart, range.gridEnd, filters),
    [items, range.gridStart, range.gridEnd, filters],
  );
```

Thread `filters` into the `upcoming` memo too, so the rail agrees with the grid:

```tsx
  const upcoming = useMemo(() => {
    const today = getToday();
    return projectOccurrences(items, today, addDays(today, 90), filters).slice(0, 5);
  }, [items, filters]);
```

Render the bar between the header row and the grid layout, immediately after the closing `</div>` of the header:

```tsx
      <CalendarFilterBar
        categories={categories}
        filters={filters}
        onChange={setFilters}
      />
```

- [ ] **Step 3: Verify and commit**

```bash
bunx tsc --noEmit
```

In the preview: toggle each filter and confirm the grid, the cash-flow strip, and the rail total all change together. Deselect every category and confirm an empty grid rather than a crash.

```bash
git add src/components/calendar
git commit -m "feat(calendar): add type, category, and status filters"
```

---

## Task 13: Keyboard navigation

**Files:**
- Create: `src/components/calendar/useCalendarNavigation.ts`
- Modify: `src/components/calendar/CalendarView.tsx`

**Interfaces:**
- Produces: `useCalendarNavigation(options: UseCalendarNavigationOptions): void` where options are `{ enabled: boolean; lens: CalendarLens; selectedDate: Date; onSelectDate: (date: Date) => void; onLensChange: (lens: CalendarLens) => void; onPage: (direction: -1 | 1) => void; onToday: () => void; onToggleRail: () => void; onOpenSelected: () => void }`.

Moving past a range edge pages the view and keeps the selection — `CalendarView` derives the anchor from the selected date, so this falls out.

- [ ] **Step 1: Write the hook**

Create `src/components/calendar/useCalendarNavigation.ts`:

```ts
import { useEffect, useRef } from 'react';
import { addDays, addMonths, addWeeks } from 'date-fns';
import type { CalendarLens } from './calendarRange';

export interface UseCalendarNavigationOptions {
  enabled: boolean;
  lens: CalendarLens;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onLensChange: (lens: CalendarLens) => void;
  onPage: (direction: -1 | 1) => void;
  onToday: () => void;
  onToggleRail: () => void;
  onOpenSelected: () => void;
}

/** In year lens the vertical step is a month; elsewhere it is a week. */
function stepBy(lens: CalendarLens, date: Date, days: number, rows: number): Date {
  if (days !== 0) return addDays(date, days);
  return lens === 'year' ? addMonths(date, rows) : addWeeks(date, rows);
}

export function useCalendarNavigation(options: UseCalendarNavigationOptions): void {
  const ref = useRef(options);
  ref.current = options;

  useEffect(() => {
    if (!options.enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const current = ref.current;
      if (!current.enabled) return;

      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const mod = event.metaKey || event.ctrlKey;

      if (mod && event.key === '.') {
        event.preventDefault();
        current.onToggleRail();
        return;
      }

      // Everything below is unmodified — never swallow the app's ⌘N, ⌘B,
      // ⌘1–6, or ⌘\ shortcuts.
      if (mod || event.altKey) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          current.onSelectDate(stepBy(current.lens, current.selectedDate, -1, 0));
          return;
        case 'ArrowRight':
          event.preventDefault();
          current.onSelectDate(stepBy(current.lens, current.selectedDate, 1, 0));
          return;
        case 'ArrowUp':
          event.preventDefault();
          current.onSelectDate(stepBy(current.lens, current.selectedDate, 0, -1));
          return;
        case 'ArrowDown':
          event.preventDefault();
          current.onSelectDate(stepBy(current.lens, current.selectedDate, 0, 1));
          return;
        case '[':
          event.preventDefault();
          current.onPage(-1);
          return;
        case ']':
          event.preventDefault();
          current.onPage(1);
          return;
        case 'Enter':
          event.preventDefault();
          current.onOpenSelected();
          return;
        default:
          break;
      }

      switch (event.key.toLowerCase()) {
        case 'w':
          event.preventDefault();
          current.onLensChange('week');
          return;
        case 'm':
          event.preventDefault();
          current.onLensChange('month');
          return;
        case 'y':
          event.preventDefault();
          current.onLensChange('year');
          return;
        case 't':
          event.preventDefault();
          current.onToday();
          return;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options.enabled]);
}
```

- [ ] **Step 2: Wire it up**

`CalendarView` needs an `isModalOpen` prop so the hook goes quiet while `ItemForm` is open. Add it to `CalendarViewProps`, pass `isModalOpen` from `AppContent` (it already receives it), and:

```tsx
  const selectDate = (date: Date) => {
    setSelectedDate(date);
    // Selecting outside the visible range pages the view and keeps the
    // selection, so arrow keys walk off the edge naturally.
    if (date < range.rangeStart || date > range.rangeEnd) setAnchor(date);
  };

  useCalendarNavigation({
    enabled: !isModalOpen,
    lens,
    selectedDate,
    onSelectDate: selectDate,
    onLensChange: setLens,
    onPage: (direction) => setAnchor((current) => shiftAnchor(lens, current, direction)),
    onToday: () => {
      const today = getToday();
      setAnchor(today);
      setSelectedDate(today);
    },
    onToggleRail: () => setRailOpen((open) => !open),
    onOpenSelected: () => {
      const first = selectedOccurrences[0];
      if (first) onEdit(first.item);
    },
  });
```

Replace every `onSelect={setSelectedDate}` with `onSelect={selectDate}`, and pass `focusedDate={selectedDate}` so the roving tabindex in `DayCell` follows the selection.

- [ ] **Step 3: Verify and commit**

```bash
bunx tsc --noEmit
```

In the preview: arrow off the end of a month and confirm it pages with the selection intact; `W`/`M`/`Y` switch lenses; `T` returns to today; `[`/`]` page; `Enter` opens the selected day's first item; `⌘.` toggles the rail. Then open `ItemForm` with `⌘N`, type a name containing "w" and "m", and confirm the lens does not change.

```bash
git add src/components/calendar src/app/components/AppContent.tsx
git commit -m "feat(calendar): add keyboard navigation"
```

---

## Task 14: Motion

The spec's motion budget, applied last so it is not re-done as the grids change.

**Files:**
- Modify: `src/components/calendar/CalendarView.tsx`

Restrained on purpose: lens changes cross-fade over 150ms, month paging slides directionally by 8px, the rail slides on the x-axis. `--ease-spring` stays reserved for the segmented control, which already uses it. No bounce on the grid — a calendar that springs reads as a toy.

- [ ] **Step 1: Track the paging direction**

Direction is needed so paging forward slides the opposite way to paging back. Add to `CalendarView`:

```tsx
  const [direction, setDirection] = useState<-1 | 1>(1);

  const page = (next: -1 | 1) => {
    setDirection(next);
    setAnchor((current) => shiftAnchor(lens, current, next));
  };
```

Replace both chevron `onClick` handlers and the `onPage` callback passed to `useCalendarNavigation` with `page`.

- [ ] **Step 2: Animate the lens region**

Add `import { AnimatePresence, motion } from 'framer-motion';` and wrap the `renderLens()` call site:

```tsx
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${lens}-${formatRangeTitle(lens, anchor)}`}
            initial={{ opacity: 0, x: direction * 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {renderLens()}
          </motion.div>
        </AnimatePresence>
```

The `key` combines lens and range title so both a lens switch and a page change trigger the transition, while selecting a day inside the same range does not.

- [ ] **Step 3: Animate the rail**

Replace the `{showRail && <DayInspector …/>}` block:

```tsx
        <AnimatePresence initial={false}>
          {showRail && (
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <DayInspector
                selectedDate={selectedDate}
                selectedOccurrences={selectedOccurrences}
                rangeOccurrences={rangeOccurrences}
                upcoming={upcoming}
                onEdit={onEdit}
              />
            </motion.div>
          )}
        </AnimatePresence>
```

- [ ] **Step 4: Verify and commit**

```bash
bunx tsc --noEmit
```

In the preview: page forward and back and confirm the slide reverses direction; switch lenses and confirm a cross-fade with no layout jump; toggle the rail and confirm it slides rather than popping. Hold an arrow key down and confirm the grid keeps up without stuttering.

```bash
git add src/components/calendar
git commit -m "feat(calendar): add lens and rail transitions"
```

---

## Task 15: Empty state and final verification

**Files:**
- Modify: `src/components/calendar/CalendarView.tsx`
- Modify: `docs/TASKS.md`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Add the empty state**

The grid stays drawn when a range has no occurrences — an empty August is meaningful information. Only a genuinely empty account gets the full empty state. Add to `CalendarView`, before the grid:

```tsx
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nothing to schedule yet"
        description="Add a subscription or bill and it will show up on the day it is due."
      />
    );
  }
```

with `import EmptyState from '@/components/ui/EmptyState';` and `CalendarDays` added to the lucide import.

For a populated account with an empty range, add a quiet line under the grid instead:

```tsx
      {rangeOccurrences.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
          Nothing due in this period.
        </p>
      )}
```

- [ ] **Step 2: Update the tracking docs**

In `docs/TASKS.md`, mark TASK-009 complete and point it at this plan. In `docs/ROADMAP.md`, replace the "Calendar View Workspace" section body with a line noting it shipped, keeping the heading.

- [ ] **Step 3: Full verification**

```bash
bun test
```

Expected: all suites pass, including the 31 new calendar tests.

```bash
bunx tsc --noEmit
```

Expected: clean.

Then run the `/smoke` skill against the running dev server and confirm every view still renders. Manually check the calendar in **both themes** — toggle with the sidebar theme button and confirm the accent edges, intensity bands, and today pill all read correctly in light and dark.

- [ ] **Step 4: Commit**

```bash
git add src/components/calendar docs/TASKS.md docs/ROADMAP.md
git commit -m "feat(calendar): add empty states and close out TASK-009"
```

---

## Self-review notes

**Spec coverage.** Engine → Tasks 1–3. Range/grid split → Task 4, enforced in Task 8. Shell and shortcuts → Task 5. Day cell treatment → Task 6. Three lenses → Tasks 7, 10, 11. Rail → Task 8. Cash-flow strip → Task 9. Filters → Task 12. Keyboard and roving tabindex → Tasks 6 and 13. Accessibility labels → Tasks 6, 10, 11. Motion → Task 14. Empty states → Task 15. Mixed-currency limitation → inherited by using `formatCurrency` defaults, no task needed.

**Corrected during review.** The spec originally described the cash-flow strip as "one bar per grid row, column-aligned with the rows above it." That is incoherent — grid rows stack vertically, so nothing in a horizontal strip beneath the grid can align with them. Both the spec and Task 9 now describe it as what it actually is: a left-to-right timeline of the month's weeks, each bar labelled with its date span.

**The `renderLens` seam.** Task 7 introduces `renderLens()` inside `CalendarView` so Tasks 9, 10, and 11 each replace one function rather than restating the whole view. Its final form is in Task 11; Tasks 9 and 10 show the intermediate forms in full.

**Naming is consistent across tasks:** `projectOccurrences`, `groupByDay`, `summariseDay`, `sumOccurrences`, `getCalendarRange`, `buildGridDays`, `shiftAnchor`, `formatRangeTitle`, `useCalendarNavigation`, `renderLens`. `DaySummary.accentColor` is the only derived colour field and is read only by `DayCell`.
