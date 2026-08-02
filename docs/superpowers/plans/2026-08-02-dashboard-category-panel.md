# Dashboard Category Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed-height scrollable category list beside the dashboard donut with a top-5 list plus a foldable `Other` row that drives both the chart and the list.

**Architecture:** A pure helper (`foldCategoryTail`) folds the sorted category slices into "top N + synthetic Other". `Dashboard` renders that single folded array through both `GlowDonutChart` and the breakdown list, so the two can never disagree. A local `showAllCategories` flag swaps the folded array for the full one; the existing index-based hover sync keeps working because both surfaces always consume the same array.

**Tech Stack:** React 19, TypeScript, Tailwind v4, `node:test` + `node:assert/strict` run by `bun test`.

## Global Constraints

- Package manager is **bun**. Never npm/yarn/pnpm.
- All colors come from CSS custom properties (`var(--…)`). No new hardcoded hex.
- Card background hierarchy and existing spacing tokens are unchanged — this is a structural fix, not a restyle.
- `getSpendingByCategory` in `src/services/database/analytics.ts` must **not** be modified; Analytics consumes the complete set.
- `GlowDonutChart` internals must **not** be modified.
- Tests are pure-logic `node:test` files colocated beside the module, matching `src/utils/categories.test.ts`.
- Do not commit unless the step says to. Never push.

---

### Task 1: `foldCategoryTail` helper

**Files:**
- Create: `src/utils/categoryFolding.ts`
- Test: `src/utils/categoryFolding.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces:
  - `OTHER_CATEGORY_ID: '__other__'`
  - `OTHER_CATEGORY_COLOR: 'var(--accent-gray)'`
  - `interface CategorySlice { color: string; id: string; name: string; share: number; value: number }`
  - `interface FoldedCategories { visible: CategorySlice[]; otherCount: number }`
  - `foldCategoryTail(slices: CategorySlice[], limit?: number): FoldedCategories`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/categoryFolding.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  OTHER_CATEGORY_COLOR,
  OTHER_CATEGORY_ID,
  foldCategoryTail,
  type CategorySlice,
} from './categoryFolding';

function slice(id: string, value: number, share: number): CategorySlice {
  return { color: '#22c55e', id, name: `Category ${id}`, share, value };
}

// Descending by value, as getSpendingByCategory already returns.
const eight: CategorySlice[] = [
  slice('a', 48, 0.31),
  slice('b', 32, 0.2),
  slice('c', 25, 0.16),
  slice('d', 18, 0.11),
  slice('e', 12, 0.08),
  slice('f', 9, 0.06),
  slice('g', 8, 0.05),
  slice('h', 5, 0.03),
];

describe('foldCategoryTail', () => {
  test('returns empty input untouched', () => {
    assert.deepEqual(foldCategoryTail([]), { visible: [], otherCount: 0 });
  });

  test('does not fold when below the limit', () => {
    const input = eight.slice(0, 3);
    const result = foldCategoryTail(input);

    assert.equal(result.otherCount, 0);
    assert.deepEqual(result.visible, input);
  });

  test('does not fold when exactly at the limit', () => {
    const input = eight.slice(0, 5);
    const result = foldCategoryTail(input);

    assert.equal(result.otherCount, 0);
    assert.equal(result.visible.length, 5);
  });

  test('does not fold a tail of one', () => {
    const input = eight.slice(0, 6);
    const result = foldCategoryTail(input);

    assert.equal(result.otherCount, 0);
    assert.equal(result.visible.length, 6);
    assert.equal(result.visible.at(-1)?.id, 'f');
  });

  test('folds a tail of two or more', () => {
    const result = foldCategoryTail(eight);

    assert.equal(result.otherCount, 3);
    assert.equal(result.visible.length, 6);
  });

  test('sums value and share into the Other slice', () => {
    const other = foldCategoryTail(eight).visible.at(-1);

    assert.equal(other?.id, OTHER_CATEGORY_ID);
    assert.equal(other?.color, OTHER_CATEGORY_COLOR);
    assert.equal(other?.name, 'Other');
    assert.equal(other?.value, 22);
    assert.ok(Math.abs((other?.share ?? 0) - 0.14) < 1e-9);
  });

  test('preserves head order ahead of the Other slice', () => {
    const ids = foldCategoryTail(eight).visible.map((item) => item.id);

    assert.deepEqual(ids, ['a', 'b', 'c', 'd', 'e', OTHER_CATEGORY_ID]);
  });

  test('honors a custom limit', () => {
    const result = foldCategoryTail(eight, 2);

    assert.equal(result.otherCount, 6);
    assert.deepEqual(result.visible.map((item) => item.id), [
      'a',
      'b',
      OTHER_CATEGORY_ID,
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test src/utils/categoryFolding.test.ts`
Expected: FAIL — cannot resolve module `./categoryFolding`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/categoryFolding.ts`:

```ts
/**
 * Folds the long tail of a category distribution into a single "Other" slice.
 *
 * The dashboard renders the returned `visible` array through BOTH the donut and
 * the breakdown list, so the chart and the legend always describe the same set.
 */

export const OTHER_CATEGORY_ID = '__other__';
export const OTHER_CATEGORY_COLOR = 'var(--accent-gray)';

export interface CategorySlice {
  color: string;
  id: string;
  name: string;
  share: number;
  value: number;
}

export interface FoldedCategories {
  /** Top N, with the synthetic Other slice appended last when folded. */
  visible: CategorySlice[];
  /** Categories inside Other. 0 when nothing was folded. */
  otherCount: number;
}

/**
 * @param slices Sorted descending by value (getSpendingByCategory already does).
 * @param limit  How many real categories to keep before folding.
 */
export function foldCategoryTail(
  slices: CategorySlice[],
  limit = 5,
): FoldedCategories {
  // Folding a single leftover into "Other · 1 category" is noise, so a tail of
  // one stays expanded. Also covers every input at or below the limit.
  if (slices.length - limit < 2) {
    return { visible: slices, otherCount: 0 };
  }

  const tail = slices.slice(limit);
  const other: CategorySlice = {
    color: OTHER_CATEGORY_COLOR,
    id: OTHER_CATEGORY_ID,
    name: 'Other',
    share: tail.reduce((sum, item) => sum + item.share, 0),
    value: tail.reduce((sum, item) => sum + item.value, 0),
  };

  return { visible: [...slices.slice(0, limit), other], otherCount: tail.length };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test src/utils/categoryFolding.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Typecheck**

Run: `bunx tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 6: Commit**

```bash
git add src/utils/categoryFolding.ts src/utils/categoryFolding.test.ts
git commit -m "feat(dashboard): add foldCategoryTail helper"
```

---

### Task 2: Rewire the dashboard category card

**Files:**
- Modify: `src/components/Dashboard.tsx`

**Interfaces:**
- Consumes: `foldCategoryTail`, `OTHER_CATEGORY_ID`, `CategorySlice` from Task 1.
- Produces: no new exports.

- [ ] **Step 1: Import the helper and drop the local slice type**

At the top of `src/components/Dashboard.tsx`, add to the imports:

```tsx
import {
  OTHER_CATEGORY_ID,
  foldCategoryTail,
  type CategorySlice,
} from '../utils/categoryFolding';
```

Then delete the local `DashboardCategorySlice` type (currently lines 41–47) and
replace every remaining reference to `DashboardCategorySlice` with
`CategorySlice`. There is one, in the `dashboardCategoryData` `useMemo` generic.

- [ ] **Step 2: Add expansion state and a tab handler that resets it**

Immediately after the existing `const [chartHover, setChartHover] = useState<number | null>(null);` line, add:

```tsx
const [showAllCategories, setShowAllCategories] = useState(false);
```

Then add this callback next to the other handlers in the component body:

```tsx
// Row indices are the hover key shared with the donut, and folding changes what
// each index means — so any change to the rendered set must clear the hover.
const handleFilterTabChange = useCallback((tab: FilterTab) => {
  setFilterTab(tab);
  setShowAllCategories(false);
  setChartHover(null);
}, []);

const handleToggleAllCategories = useCallback(() => {
  setShowAllCategories((previous) => !previous);
  setChartHover(null);
}, []);
```

`useCallback` is already imported? It is **not** — the current import is
`import { useEffect, useMemo, useState, memo } from 'react';`. Change it to:

```tsx
import { useCallback, useEffect, useMemo, useState, memo } from 'react';
```

- [ ] **Step 3: Wire the SegmentedControl to the new handler**

Find:

```tsx
<SegmentedControl tabs={tabs} activeTab={filterTab} onTabChange={setFilterTab} />
```

Replace with:

```tsx
<SegmentedControl tabs={tabs} activeTab={filterTab} onTabChange={handleFilterTabChange} />
```

- [ ] **Step 4: Derive the folded array**

Directly after the `dashboardCategoryData` `useMemo` (which stays exactly as it
is — `topCategory` below it must keep reading the **unfolded** array, or
"Largest share" could eventually read "Other"), add:

```tsx
const foldedCategories = useMemo(
  () => foldCategoryTail(dashboardCategoryData),
  [dashboardCategoryData],
);
const canFoldCategories = foldedCategories.otherCount > 0;
const visibleCategoryData =
  canFoldCategories && !showAllCategories
    ? foldedCategories.visible
    : dashboardCategoryData;
```

- [ ] **Step 5: Point the donut at the folded array**

Find `data={dashboardCategoryData}` in the `GlowDonutChart` call and replace with:

```tsx
data={visibleCategoryData}
```

Leave `size`, `centerValue`, `hoveredIndex`, and `onHoverChange` untouched.

- [ ] **Step 6: Remove the scroll container**

Find the panel wrapper (currently line 464) and delete `xl:h-[17rem]` from its
className, so it reads:

```tsx
className="min-w-0 flex-1 rounded-2xl p-3 sm:p-3.5 xl:flex xl:max-w-[18rem] xl:flex-col xl:self-start xl:-mt-1"
```

Then find the inner list container (currently lines 488–491):

```tsx
<div
  className="max-h-[18.5rem] space-y-1.25 overflow-y-auto pr-3 xl:min-h-0 xl:flex-1 xl:max-h-none"
  style={{ scrollbarGutter: 'stable' }}
>
```

Replace with:

```tsx
<div className="space-y-1.25">
```

Leave the header badge above it alone. It reads `{spendingByCategory.length} total`
and must keep reporting the **true** category count — that honest number is what
makes an `Other · N categories` row legible. Do not "fix" it to match the
visible row count.

- [ ] **Step 7: Replace the row map**

Replace the whole `{dashboardCategoryData.map((item, index) => { … })}` block
(currently lines 492–539) with:

```tsx
{visibleCategoryData.map((item, index) => {
  const isHovered = chartHover === index;
  const isDimmed = chartHover !== null && !isHovered;
  const isOther = item.id === OTHER_CATEGORY_ID;

  const rowClassName =
    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all duration-300';
  const rowStyle: React.CSSProperties = {
    opacity: isDimmed ? 0.42 : 1,
    cursor: isOther ? 'pointer' : 'default',
    background: isHovered
      ? 'color-mix(in srgb, var(--bg-card) 68%, transparent)'
      : 'color-mix(in srgb, var(--bg-card) 36%, transparent)',
    boxShadow: isHovered
      ? `inset 0 0 0 1px color-mix(in srgb, ${item.color} 22%, transparent), 0 14px 24px -24px color-mix(in srgb, ${item.color} 62%, transparent)`
      : 'inset 0 0 0 1px color-mix(in srgb, var(--border-default) 55%, transparent)',
  };

  const rowContent = (
    <>
      <div
        className="h-1.5 w-1.5 shrink-0 rounded-full transition-shadow duration-300"
        style={{
          backgroundColor: item.color,
          // color-mix, not `${color}33` — item.color may be a CSS variable for
          // the Other slice, and `var(--accent-gray)33` is invalid CSS.
          boxShadow: isHovered
            ? `0 0 0 2px color-mix(in srgb, ${item.color} 20%, transparent)`
            : `0 0 0 2px color-mix(in srgb, ${item.color} 12%, transparent)`,
        }}
      />

      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {isOther ? `Other · ${foldedCategories.otherCount} categories` : item.name}
        </span>
      </div>

      <div className="shrink-0 text-right leading-none">
        <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
          {formatCurrency(item.value, { display: 'summary' })}
        </p>
        <p className="mt-1 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {Math.round(item.share * 100)}%
        </p>
      </div>

      {isOther && (
        <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
      )}
    </>
  );

  if (isOther) {
    return (
      <button
        key={item.id}
        type="button"
        aria-expanded={false}
        className={rowClassName}
        style={rowStyle}
        onClick={handleToggleAllCategories}
        onMouseEnter={() => setChartHover(index)}
        onMouseLeave={() => setChartHover(null)}
      >
        {rowContent}
      </button>
    );
  }

  return (
    <div
      key={item.id}
      className={rowClassName}
      style={rowStyle}
      onMouseEnter={() => setChartHover(index)}
      onMouseLeave={() => setChartHover(null)}
    >
      {rowContent}
    </div>
  );
})}
```

Note `Other · N categories` needs no pluralization: `otherCount` is 2 or more by
construction.

- [ ] **Step 8: Add the "Show less" control**

Immediately after the closing `</div>` of the list container from Step 6, add:

```tsx
{canFoldCategories && showAllCategories && (
  <button
    type="button"
    aria-expanded
    onClick={handleToggleAllCategories}
    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors interactive-hover-bg"
    style={{ color: 'var(--text-secondary)' }}
  >
    <ChevronUp className="w-3.5 h-3.5" />
    Show less
  </button>
)}
```

Without this the expanded state has no way back, because expanding removes the
`Other` row that opened it.

- [ ] **Step 9: Import the chevron icons**

Add `ChevronDown` and `ChevronUp` to the existing `lucide-react` import in this
file (it already imports `ChevronRight`), keeping alphabetical order:

```tsx
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  CreditCard,
  Receipt,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Plus,
} from 'lucide-react';
```

- [ ] **Step 10: Typecheck and test**

Run: `bunx tsc --noEmit && bun test`
Expected: tsc exit 0; 43 tests pass (35 existing + 8 new).

- [ ] **Step 11: Build**

Run: `bun run build`
Expected: succeeds.

- [ ] **Step 12: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat(dashboard): fold category tail instead of scrolling"
```

---

### Task 3: Verify in the running app

**Files:**
- No source changes expected. If a defect is found, fix it and amend Task 2's commit.

**Interfaces:**
- Consumes: the finished card from Task 2.
- Produces: screenshots for review.

- [ ] **Step 1: Start the dev server**

Use the preview tooling (`preview_start` with the `.claude/launch.json` entry).
Never run the dev server through Bash.

- [ ] **Step 2: Check the console**

Read console messages. Expected: no React warnings, and specifically no
"validateDOMNesting" or invalid-CSS warnings from the row refactor.

- [ ] **Step 3: Verify the collapsed state**

With 7+ categories present, confirm: five named rows plus one `Other · N categories`
row, no scrollbar in the panel, and the donut showing six arcs with the last one
grey.

- [ ] **Step 4: Verify hover sync both ways**

Hover the `Other` row → the grey arc highlights and the donut center reads
"Other". Hover the grey arc → the `Other` row highlights. Then hover a named row
and confirm its arc highlights.

- [ ] **Step 5: Verify expansion**

Click the `Other` row. Confirm: every category is listed, the grey arc splits
into its real slices, the donut does **not** replay its reveal animation, and a
"Show less" control appears. Click it and confirm the card returns to collapsed.

- [ ] **Step 6: Verify the tail-of-one rule**

Filter to a tab that yields exactly 6 categories. Confirm six real rows and no
`Other` row.

- [ ] **Step 7: Verify both themes and a narrow viewport**

Toggle light and dark; confirm the grey `Other` slice and dot are visible in
both. Resize below the `xl` breakpoint; confirm the card stacks with no nested
scroll region.

- [ ] **Step 8: Screenshot collapsed and expanded states for review**

Capture both states and share them.
