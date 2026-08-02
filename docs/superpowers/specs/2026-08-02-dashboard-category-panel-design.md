# Dashboard category panel — design

**Date:** 2026-08-02
**Status:** Approved
**Scope:** `src/components/Dashboard.tsx` "Spending by Category" card

## Problem

The category breakdown panel beside the donut is a fixed-height scroll region
(`xl:h-[17rem]`, `max-h-[18.5rem]`, `overflow-y-auto`). Three problems follow
from that:

1. **Chart and legend disagree.** The donut renders every category as a slice,
   but the panel only shows about five rows before clipping. What the chart
   claims exists and what the list shows are different sets.
2. **Nested scrolling.** The panel scrolls inside a page that already scrolls.
   The hidden rows have no affordance beyond a thin scrollbar.
3. **The height is arbitrary.** `17rem` exists only to match the donut's 263px,
   not because the content wants to be that tall.

Typical scale matters here: `getSpendingByCategory` returns only categories that
have at least one **active** item, so real users see roughly three to eight rows.
The panel scrolls to hide two or three rows — a poor trade.

## Approach

Fold the tail of the distribution into a single `Other` entry that appears in
**both** the donut and the list, and let the panel size itself to its content.

This mirrors the Upcoming Payments card sitting next to it, which already shows
the top five plus a "View all N upcoming" affordance. The dashboard should
answer "where is my money going?" at a glance; the exhaustive breakdown already
lives in the Analytics view.

### Rejected alternatives

- **Two-column compact legend.** Fits every category, but amounts have to be
  dropped for space and names truncate badly in a narrow column. Reads as chart
  furniture rather than information.
- **Proportion bar rows.** The most information-dense option — bar length
  encodes share, so ranking is readable without decoding colors. Rejected
  because it duplicates the donut's job and would demote `GlowDonutChart`, which
  carries real craft (reveal animation, tangent-capsule arc geometry). A
  cosmetic fix before a release is the wrong moment for that change.

## Design

### Data shaping

A new pure helper folds the tail:

```ts
foldCategoryTail(slices: DashboardCategorySlice[], limit = 5): {
  visible: DashboardCategorySlice[];  // top N, with the synthetic Other slice
                                      // appended as the LAST element when folded
  otherCount: number;                 // categories inside Other; 0 when not folded
}
```

`visible` is the single array rendered by both the donut and the list.
`otherCount > 0` tells callers whether folding happened; when it did, the
exported `OTHER_CATEGORY_ID` constant identifies the synthetic `Other` slice
(the last element of `visible`) when mapping over the array.

Rules:

- Input is already sorted descending by value (`getSpendingByCategory` sorts).
- Fold only when the tail holds **two or more** categories. Six categories
  render as six rows; folding one leftover into "Other · 1 category" is noise.
- The synthetic slice has `id: '__other__'`, `name: 'Other'`,
  `color: 'var(--accent-gray)'`, and `value` / `share` summed from the tail.
- `getSpendingByCategory` is **not** modified — Analytics still consumes the
  complete set.

### One array drives both surfaces

The folded array feeds the donut and the list, so they cannot disagree. Because
`chartHover` is an index into that shared array, the existing bidirectional
hover sync keeps working unchanged: hovering the `Other` row lights the grey
arc, and vice versa.

`var(--accent-gray)` is an existing token (`#6b7280` light, `#9ca3af` dark). CSS
variables resolve in SVG `fill` — `GlowDonutChart` already does this with
`stroke="var(--text-muted)"` — and in the row's
`color-mix(in srgb, ${color} 22%, transparent)` box-shadow.

### Expansion

The `Other` row is a real `<button>` carrying `aria-expanded`. Clicking it
unfolds **both** the list and the donut, so the grey arc splits into its real
slices. Collapsing is a separate "Show less" button rendered below the list
while expanded, not a second click on the `Other` row. State is local to
`Dashboard` (`showAllCategories`), and resets when the filter tab changes.
Because the two controls occupy different DOM positions, toggling moves
keyboard focus explicitly to the counterpart control so it isn't dropped when
the originating element unmounts.

The donut's reveal animation runs only on mount (`useEffect` with `[]` deps), so
expanding recomputes segments without re-triggering the animation.

The header's "N total" badge continues to report the **true** category count,
which is what makes the `Other` row legible.

### Layout

Removed: `xl:h-[17rem]`, `max-h-[18.5rem]`, `overflow-y-auto`,
`scrollbarGutter`, and the `xl:max-h-none` override. Height comes from content.
The existing `xl:items-center` on the flex container vertically centers the
donut against the panel. The panel itself carries `xl:self-start`, which
overrides that alignment for the panel — so only the donut is centered; the
panel stays top-aligned. Below `xl` the card stacks as it does today, minus
the nested scroll region.

### Accessibility fix in passing

Rows currently set `cursor: pointer` with no click handler, promising
interactivity that does not exist. Non-interactive rows drop the pointer cursor
and keep their hover highlight; only the `Other` row is clickable.

## Edge cases

| Case | Behavior |
| --- | --- |
| 0 categories | Existing `EmptyState`, unchanged |
| 1–5 categories | All rows, no `Other`, no button |
| 6 categories | All six rows (tail of 1 is not folded) |
| 7+ categories | Top 5 + `Other · N categories` |
| Expanded | All rows, donut unfolded, `Other` row (`aria-expanded={true}`) stays in place and a separate "Show less" button appears below the list; focus moves explicitly from whichever control was activated to its counterpart so keyboard users aren't dropped to the top of the document |
| Long names | Existing `truncate` on the name span |
| Filter tab change | `showAllCategories` resets to collapsed |

## Testing

Unit tests for `foldCategoryTail` covering: empty input, below limit, exactly at
limit, tail of one (not folded), tail of many (folded), share and value sums,
and preservation of input order. The existing suite is pure-logic Bun tests, so
this fits the established pattern.

Manual verification: collapsed and expanded states, hover sync in both
directions, light and dark themes, and a narrow viewport where the card stacks.

## Out of scope

`GlowDonutChart` internals, the "Largest share" line, `EmptyState`, the Analytics
category insights, and all color/spacing tokens. This is a structural fix, not a
restyle.
