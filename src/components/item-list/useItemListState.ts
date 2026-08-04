import { useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useItemFilters } from '@/hooks/useItemFilters';
import type { Category, ItemType, ItemWithCategory } from '@/types';
import { createCategoryLookup, resolveItemCategoryDisplay } from '@/utils/categories';
import {
  SORT_COLLATOR,
  STATUS_ORDER,
  type SortBy,
  type SortDirection,
} from './constants';
import { resolveRangeSelection } from './selectionRange';

interface UseItemListStateOptions {
  items: ItemWithCategory[];
  categories: Category[];
  itemType?: ItemType;
}

export function useItemListState({
  items,
  categories,
  itemType,
}: UseItemListStateOptions) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showActives, setShowActives] = useState(true);
  const [showTrials, setShowTrials] = useState(true);
  const [showPaused, setShowPaused] = useState(true);
  const [showCancelled, setShowCancelled] = useState(false);
  const viewStorageKey = `subtrkr-item-view-${itemType ?? 'all'}`;
  const [viewMode, setViewMode] = useLocalStorage<'grid' | 'list'>(
    viewStorageKey,
    'grid',
  );
  const sortByStorageKey = `subtrkr-item-sort-by-${itemType ?? 'all'}`;
  const sortDirectionStorageKey = `subtrkr-item-sort-direction-${itemType ?? 'all'}`;
  const [sortBy, setSortBy] = useLocalStorage<SortBy>(
    sortByStorageKey,
    'next_billing_date',
  );
  const [sortDirection, setSortDirection] = useLocalStorage<SortDirection>(
    sortDirectionStorageKey,
    'asc',
  );
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const {
    typeFilteredItems,
    filteredItems,
    activeFilterCount,
  } = useItemFilters({
    items,
    itemType,
    searchQuery,
    selectedCategory,
    showActives,
    showTrials,
    showPaused,
    showCancelled,
  });

  const filteredCategories = itemType
    ? categories.filter((category) => category.category_type === itemType)
    : categories;
  const categoryLookup = useMemo(
    () => createCategoryLookup(categories),
    [categories],
  );

  const sortedItems = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;

    return [...filteredItems].sort((left, right) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = SORT_COLLATOR.compare(left.name, right.name);
          break;
        case 'amount':
          comparison = left.amount - right.amount;
          break;
        case 'category':
          comparison = SORT_COLLATOR.compare(
            resolveItemCategoryDisplay(left, categoryLookup).name,
            resolveItemCategoryDisplay(right, categoryLookup).name,
          );
          break;
        case 'status':
          comparison = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
          break;
        case 'next_billing_date':
        default:
          comparison = SORT_COLLATOR.compare(
            left.next_billing_date,
            right.next_billing_date,
          );
          break;
      }

      if (comparison === 0) {
        comparison = SORT_COLLATOR.compare(left.name, right.name);
      }

      return comparison * direction;
    });
  }, [categoryLookup, filteredItems, sortBy, sortDirection]);

  useEffect(() => {
    if (selectedItemIds.size === 0) {
      return;
    }

    const visibleIds = new Set(sortedItems.map((item) => item.id));
    let changed = false;
    const nextSelectedIds = new Set<string>();

    selectedItemIds.forEach((id) => {
      if (visibleIds.has(id)) {
        nextSelectedIds.add(id);
      } else {
        changed = true;
      }
    });

    if (changed) {
      setSelectedItemIds(nextSelectedIds);
    }
  }, [selectedItemIds.size, sortedItems]);

  const selectedVisibleItems = useMemo(() => {
    if (selectedItemIds.size === 0) {
      return [];
    }

    return sortedItems.filter((item) => selectedItemIds.has(item.id));
  }, [selectedItemIds, sortedItems]);

  const selectedCount = selectedVisibleItems.length;
  const allVisibleSelected =
    sortedItems.length > 0 && selectedCount === sortedItems.length;
  const someVisibleSelected =
    selectedCount > 0 && selectedCount < sortedItems.length;

  return {
    activeFilterCount,
    allVisibleSelected,
    categoryLookup,
    filteredCategories,
    // `lastSelectedId` is deliberately not returned: the range anchor is
    // consumed by the closures below, and a consumer reading it from here
    // would see a value one render stale relative to them.
    searchQuery,
    selectedCategory,
    selectedCount,
    selectedItemIds,
    selectedVisibleItems,
    showActives,
    showCancelled,
    showPaused,
    showTrials,
    someVisibleSelected,
    sortBy,
    sortDirection,
    sortedItems,
    typeFilteredItems,
    viewMode,
    setSearchQuery,
    setSelectedCategory,
    setSelectedItemIds,
    setShowActives,
    setShowCancelled,
    setShowPaused,
    setShowTrials,
    setSortBy,
    setSortDirection,
    setViewMode,
    handleSelectAllChange: (checked: boolean | 'indeterminate') => {
      if (checked === true || checked === 'indeterminate') {
        setSelectedItemIds(new Set(sortedItems.map((item) => item.id)));
        return;
      }

      setSelectedItemIds(new Set());
    },
    handleSelectItemChange: (
      itemId: string,
      checked: boolean | 'indeterminate',
      options?: { extendRange?: boolean },
    ) => {
      const shouldSelect = checked === true || checked === 'indeterminate';

      if (options?.extendRange) {
        const orderedIds = sortedItems.map((item) => item.id);
        const span = resolveRangeSelection(orderedIds, lastSelectedId, itemId);

        setSelectedItemIds((previous) => {
          const nextSelectedIds = new Set(previous);
          span.forEach((id) => nextSelectedIds.add(id));
          return nextSelectedIds;
        });
        setLastSelectedId(itemId);
        return;
      }

      setSelectedItemIds((previous) => {
        const nextSelectedIds = new Set(previous);
        if (shouldSelect) {
          nextSelectedIds.add(itemId);
        } else {
          nextSelectedIds.delete(itemId);
        }

        return nextSelectedIds;
      });
      setLastSelectedId(itemId);
    },
    clearSelection: () => {
      setSelectedItemIds(new Set());
      setLastSelectedId(null);
    },
    clearFilters: () => {
      setSelectedCategory('all');
      setShowActives(true);
      setShowTrials(true);
      setShowPaused(true);
      setShowCancelled(false);
    },
  };
}
