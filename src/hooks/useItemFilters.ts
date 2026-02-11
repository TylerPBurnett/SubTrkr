import { useMemo } from 'react';
import type { ItemWithCategory, ItemType } from '@/types';

interface UseItemFiltersParams {
  items: ItemWithCategory[];
  itemType?: ItemType;
  searchQuery: string;
  selectedCategory: string;
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
  selectedCategory,
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
        selectedCategory === 'all' || item.category_id === selectedCategory;
      const matchesStatus =
        (item.status === 'active' && showActives) ||
        (item.status === 'trial' && showTrials) ||
        (item.status === 'paused' && showPaused) ||
        ((item.status === 'cancelled' || item.status === 'archived') && showCancelled);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [typeFilteredItems, searchQuery, selectedCategory, showActives, showTrials, showPaused, showCancelled]);

  // Count how many filters are active
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (!showActives) count++;
    if (!showTrials) count++;
    if (!showPaused) count++;
    if (!showCancelled) count++;
    return count;
  }, [selectedCategory, showActives, showTrials, showPaused, showCancelled]);

  return {
    typeFilteredItems,
    filteredItems,
    activeFilterCount,
  };
}
