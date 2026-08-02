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
