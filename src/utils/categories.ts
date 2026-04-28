import type { Category } from '@/types';

export const UNCATEGORIZED_CATEGORY_NAME = 'Uncategorized';
export const UNCATEGORIZED_CATEGORY_COLOR = '#6b7280';

export interface ItemCategoryDisplay {
  id: string | null;
  name: string;
  color: string;
  icon: string | null;
}

export function createCategoryLookup(
  categories: Category[],
): Map<string, Category> {
  return new Map(categories.map((category) => [category.id, category]));
}

export function resolveCategoryById(
  categoryId: string | null | undefined,
  categoryLookup: ReadonlyMap<string, Category>,
): Category | undefined {
  if (!categoryId) {
    return undefined;
  }

  return categoryLookup.get(categoryId);
}

export function resolveItemCategoryDisplay(
  item: { category_id: string | null },
  categoryLookup: ReadonlyMap<string, Category>,
): ItemCategoryDisplay {
  const category = resolveCategoryById(item.category_id, categoryLookup);

  if (category) {
    return {
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
    };
  }

  return {
    id: null,
    name: UNCATEGORIZED_CATEGORY_NAME,
    color: UNCATEGORIZED_CATEGORY_COLOR,
    icon: null,
  };
}
