/**
 * Shapes a category distribution for the dashboard donut and its breakdown list.
 *
 * The dashboard renders one array through BOTH surfaces, so the chart and the
 * legend always describe the same set. Two transforms live here:
 *   buildCategorySlices — account for every dollar, including uncategorized
 *   foldCategoryTail    — collapse the long tail into a single "Other" slice
 */

export const OTHER_CATEGORY_ID = '__other__';
/** The one neutral that stays legible in both themes (#6b7280 / #9ca3af). */
export const OTHER_CATEGORY_COLOR = 'var(--accent-gray)';

export const UNCATEGORIZED_SLICE_ID = '__uncategorized__';
/**
 * Deliberately NOT a second grey: --text-muted drops to #525252 in dark (≈2.3:1
 * against the row, under the 3:1 non-text minimum) and --text-secondary is
 * indistinguishable from --accent-gray in dark (#a3a3a3 vs #9ca3af). Amber also
 * carries the right meaning — untagged spend is a nudge, not a neutral bucket.
 */
export const UNCATEGORIZED_SLICE_COLOR = 'var(--accent-amber)';

/** Sub-cent remainders are float noise, not real uncategorized spend. */
const UNCATEGORIZED_EPSILON = 0.005;

export interface CategorySlice {
  color: string;
  id: string;
  name: string;
  share: number;
  value: number;
}

export interface CategoryTotal {
  category: { color: string; id: string; name: string };
  total: number;
}

/**
 * Builds the donut's slice array so the arcs account for `overallTotal`.
 *
 * getSpendingByCategory only counts items that resolve to a live, type-matching
 * category — it drops items with no category_id AND items pointing at a deleted
 * category. calculateMonthlySpending counts every active item. Feeding the donut
 * one and its centre label the other meant the arcs silently under-counted, and
 * because shares were computed against the categorized subtotal, every
 * percentage was inflated (a single uncategorized item could make one category
 * read 100% when its true share was 60%).
 *
 * The difference is surfaced as an explicit "Uncategorized" slice instead, and
 * shares are computed against `overallTotal`, so arcs and centre agree.
 *
 * @param categoryTotals Per-category monthly totals (order irrelevant; re-sorted).
 * @param overallTotal   Total monthly spend across ALL active items.
 */
export function buildCategorySlices(
  categoryTotals: CategoryTotal[],
  overallTotal: number,
): CategorySlice[] {
  const slices: CategorySlice[] = categoryTotals.map((entry) => ({
    color: entry.category.color,
    id: entry.category.id,
    name: entry.category.name,
    share: 0,
    value: entry.total,
  }));

  const categorized = slices.reduce((sum, slice) => sum + slice.value, 0);
  const uncategorized = overallTotal - categorized;

  if (uncategorized > UNCATEGORIZED_EPSILON) {
    slices.push({
      color: UNCATEGORIZED_SLICE_COLOR,
      id: UNCATEGORIZED_SLICE_ID,
      name: 'Uncategorized',
      share: 0,
      value: uncategorized,
    });
  }

  // Uncategorized is real spend and competes for rank like any category.
  slices.sort((left, right) => right.value - left.value);

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return slices.map((slice) => ({
    ...slice,
    share: total === 0 ? 0 : slice.value / total,
  }));
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
