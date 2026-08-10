import { useMemo } from 'react';
import type { ItemWithCategory, ItemType } from '@/types';
import { UNCATEGORIZED_FILTER_ID } from '@/utils/categories';

interface UseItemFiltersParams {
  items: ItemWithCategory[];
  itemType?: ItemType;
  searchQuery: string;
  selectedCategoryIds: string[] | null;
  showActives: boolean;
  showTrials: boolean;
  showPaused: boolean;
  showCancelled: boolean;
}

interface UseItemFiltersResult {
  typeFilteredItems: ItemWithCategory[];
  filteredItems: ItemWithCategory[];
  activeFilterCount: number;
}

/**
 * Hook for filtering items by type, search, category, and status
 * Encapsulates all the complex filtering logic used in ItemList
 */
export function useItemFilters({
  items,
  itemType,
  searchQuery,
  selectedCategoryIds,
  showActives,
  showTrials,
  showPaused,
  showCancelled,
}: UseItemFiltersParams): UseItemFiltersResult {
  // Filter items by type first
  const typeFilteredItems = useMemo(() => {
    return itemType ? items.filter((item) => item.item_type === itemType) : items;
  }, [items, itemType]);

  // Apply search, category, and status filters
  const filteredItems = useMemo(() => {
    return typeFilteredItems.filter((item) => {
      const matchesSearch =
        !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        !selectedCategoryIds ||
        selectedCategoryIds.includes(item.category_id ?? UNCATEGORIZED_FILTER_ID);
      const matchesStatus =
        (item.status === 'active' && showActives) ||
        (item.status === 'trial' && showTrials) ||
        (item.status === 'paused' && showPaused) ||
        ((item.status === 'cancelled' || item.status === 'archived') && showCancelled);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [typeFilteredItems, searchQuery, selectedCategoryIds, showActives, showTrials, showPaused, showCancelled]);

  // Count how many filters are active
  // Counts deviations from the DEFAULT state, not "on" toggles. `showCancelled`
  // defaults to false, so counting `!showCancelled` made the count 1 at rest —
  // harmless while nothing rendered it, but it pins the trigger permanently lit
  // and a badge that is always on tells you nothing.
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategoryIds) count++;
    if (!showActives) count++;
    if (!showTrials) count++;
    if (!showPaused) count++;
    if (showCancelled) count++;
    return count;
  }, [selectedCategoryIds, showActives, showTrials, showPaused, showCancelled]);

  return {
    typeFilteredItems,
    filteredItems,
    activeFilterCount,
  };
}
