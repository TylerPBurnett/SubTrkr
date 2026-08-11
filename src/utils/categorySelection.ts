import type { Category } from '@/types';
import { UNCATEGORIZED_FILTER_ID } from './categories';

/**
 * The state of a multi-select category filter.
 *
 * `null` means no filter — every category, including future ones. An array
 * means exactly those ids. The two are kept distinct on purpose: a filter
 * listing every current category and a filter listing none of them look the
 * same on screen but behave differently the moment a category is created, so
 * a full selection always collapses back to `null`.
 *
 * `[]` is legal and means "none" — nothing matches. It is reachable only
 * deliberately, by unchecking the All row, and exists so a user can build a
 * selection up from nothing rather than unchecking twelve boxes to keep one.
 * Callers rendering an empty result must say WHICH emptiness it is; "no
 * matches" is a lie when the real answer is "you have no categories selected".
 */
export type CategorySelection = string[] | null;

export type AllCategoriesState = 'all' | 'none' | 'partial';

/**
 * Every selectable id, uncategorised included. Callers must pass this rather
 * than recomputing it, because the collapse-to-`null` rule compares against
 * its length — an "every id" list that forgot uncategorised would never reach
 * the collapse and would leave the filter permanently, invisibly on.
 */
export function everySelectableCategoryId(categories: Category[]): string[] {
  return [...categories.map((category) => category.id), UNCATEGORIZED_FILTER_ID];
}

export function isCategorySelected(
  selection: CategorySelection,
  categoryId: string,
): boolean {
  return !selection || selection.includes(categoryId);
}

/** Add or remove one id, collapsing a full selection back to `null`. */
export function toggleCategory(
  selection: CategorySelection,
  categoryId: string,
  everyId: string[],
): CategorySelection {
  const current = selection ?? everyId;
  const next = current.includes(categoryId)
    ? current.filter((value) => value !== categoryId)
    : [...current, categoryId];

  return next.length === everyId.length ? null : next;
}

/**
 * Narrow to one id. Collapses to `null` in the degenerate case where that id
 * is the only one there is, so the filter doesn't claim to be narrowing when
 * it isn't.
 */
export function onlyCategory(categoryId: string, everyId: string[]): CategorySelection {
  return everyId.length <= 1 ? null : [categoryId];
}

export function allCategoriesState(
  selection: CategorySelection,
  everyId: string[],
): AllCategoriesState {
  if (!selection || selection.length === everyId.length) return 'all';
  if (selection.length === 0) return 'none';
  return 'partial';
}

/**
 * The All row: everything selected clears to nothing, anything else fills to
 * everything. Partial goes to all rather than to none because the row's job is
 * to undo a narrowing in one click; "none" is the deliberate second press.
 */
export function toggleAllCategories(
  selection: CategorySelection,
  everyId: string[],
): CategorySelection {
  return allCategoriesState(selection, everyId) === 'all' ? [] : null;
}

/**
 * How a category filter reads in a summary line. `null` when nothing has been
 * narrowed, so callers can omit it entirely rather than printing "all
 * categories" next to every unfiltered view.
 */
export function describeCategorySelection(
  selection: CategorySelection,
  everyId: string[],
): string | null {
  const state = allCategoriesState(selection, everyId);
  if (state === 'all') return null;
  // Not "0 of 8 categories" — a count of zero is a state, not a quantity.
  if (state === 'none') return 'no categories';

  const count = selection?.length ?? 0;
  return count === 1 ? '1 category' : `${count} of ${everyId.length} categories`;
}
