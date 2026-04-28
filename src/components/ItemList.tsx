import { memo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CreditCard, Plus, Receipt, Search, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import GhostListPreview from '@/components/ui/GhostListPreview';
import SearchFilterToolbar from '@/components/SearchFilterToolbar';
import type {
  Category,
  ItemType,
  ItemWithCategory,
  StatusChangeData,
} from '@/types';
import { SORT_OPTIONS } from '@/components/item-list/constants';
import { ItemListGridView } from '@/components/item-list/ItemListGridView';
import { ItemListTableView } from '@/components/item-list/ItemListTableView';
import { useItemListState } from '@/components/item-list/useItemListState';

interface ItemListProps {
  items: ItemWithCategory[];
  categories: Category[];
  itemType?: ItemType;
  onEdit: (item: ItemWithCategory) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
  onStatusChange?: (itemId: string, action: StatusChangeData['action']) => void;
  onViewHistory?: (item: ItemWithCategory) => void;
  onAddNew?: () => void;
}

function ItemList({
  items,
  categories,
  itemType,
  onEdit,
  onDelete,
  onToggleActive,
  onStatusChange,
  onViewHistory,
  onAddNew,
}: ItemListProps) {
  const {
    activeFilterCount,
    allVisibleSelected,
    categoryLookup,
    clearFilters,
    filteredCategories,
    handleSelectAllChange,
    handleSelectItemChange,
    searchQuery,
    selectedCategory,
    selectedCount,
    selectedItemIds,
    selectedVisibleItems,
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
  } = useItemListState({
    items,
    categories,
    itemType,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const labels = {
    singular: itemType === 'bill' ? 'bill' : 'subscription',
    plural: itemType === 'bill' ? 'bills' : 'subscriptions',
    icon: itemType === 'bill' ? Receipt : CreditCard,
  };
  const Icon = labels.icon;
  const selectedLabel = selectedCount === 1 ? labels.singular : labels.plural;
  const addButtonLabel =
    itemType === 'bill'
      ? 'Add Bill'
      : itemType === 'subscription'
        ? 'Add Subscription'
        : 'Add Item';

  const handleDeleteClick = (item: ItemWithCategory) => {
    setDeleteConfirm({ id: item.id, name: item.name });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) {
      return;
    }

    onDelete(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const handleBulkDeleteConfirm = () => {
    if (selectedCount === 0) {
      setBulkDeleteConfirmOpen(false);
      return;
    }

    selectedVisibleItems.forEach((item) => {
      onDelete(item.id);
    });
    setSelectedItemIds(new Set());
    setBulkDeleteConfirmOpen(false);
  };

  return (
    <div className="space-y-6">
      <SearchFilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={`Search ${labels.plural}...`}
        categories={filteredCategories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        showActives={showActives}
        onShowActivesChange={setShowActives}
        showTrials={showTrials}
        onShowTrialsChange={setShowTrials}
        showPaused={showPaused}
        onShowPausedChange={setShowPaused}
        showCancelled={showCancelled}
        onShowCancelledChange={setShowCancelled}
        activeFilterCount={activeFilterCount}
        onClearFilters={clearFilters}
        filterLabel={labels.plural}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        onSortByChange={(value) => setSortBy(value as typeof sortBy)}
        sortDirection={sortDirection}
        onSortDirectionChange={setSortDirection}
        sortOptions={SORT_OPTIONS}
      >
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {onAddNew ? (
            <button
              type="button"
              onClick={onAddNew}
              className="btn-primary flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              {addButtonLabel}
            </button>
          ) : null}

          {viewMode === 'list' && selectedCount > 0 && (
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: 'var(--bg-active)',
                  color: 'var(--text-secondary)',
                }}
              >
                {selectedCount} selected
              </span>
              <button
                type="button"
                onClick={() => setBulkDeleteConfirmOpen(true)}
                className="flex items-center gap-2 h-9 px-3 rounded-lg border-2 text-xs font-semibold transition-colors interactive-hover-danger"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--accent-red-muted)',
                  color: 'var(--accent-red)',
                }}
              >
                <Trash2 className="w-4 h-4" />
                Delete selected
              </button>
            </div>
          )}
        </div>
      </SearchFilterToolbar>

      {typeFilteredItems.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Icon}
            title={`No ${labels.plural} yet`}
            description={`Start tracking your recurring payments by adding your first ${labels.singular}.`}
            action={
              onAddNew
                ? {
                    label: `Add ${labels.singular.charAt(0).toUpperCase() + labels.singular.slice(1)}`,
                    onClick: onAddNew,
                  }
                : undefined
            }
            preview={
              <GhostListPreview
                variant={viewMode === 'list' ? 'item-row' : 'item-card'}
                count={2}
              />
            }
          />
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Search}
            title="No matches found"
            description="Try adjusting your search or filter criteria."
          />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <ItemListGridView
              categoryLookup={categoryLookup}
              items={sortedItems}
              onDeleteClick={handleDeleteClick}
              onEdit={onEdit}
              onToggleActive={onToggleActive}
              onStatusChange={onStatusChange}
              onViewHistory={onViewHistory}
            />
          ) : (
            <ItemListTableView
              allVisibleSelected={allVisibleSelected}
              categoryLookup={categoryLookup}
              items={sortedItems}
              onDeleteClick={handleDeleteClick}
              onEdit={onEdit}
              onSelectAllChange={handleSelectAllChange}
              onSelectItemChange={handleSelectItemChange}
              onToggleActive={onToggleActive}
              onStatusChange={onStatusChange}
              onViewHistory={onViewHistory}
              selectedItemIds={selectedItemIds}
              someVisibleSelected={someVisibleSelected}
            />
          )}
        </AnimatePresence>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteConfirm)}
        title={`Delete ${labels.singular.charAt(0).toUpperCase() + labels.singular.slice(1)}`}
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Keep it"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ConfirmDialog
        isOpen={bulkDeleteConfirmOpen && selectedCount > 0}
        title={`Delete ${selectedCount} ${selectedLabel}`}
        message={`Are you sure you want to delete ${selectedCount} ${selectedLabel}? This action cannot be undone.`}
        confirmLabel={`Delete ${selectedCount}`}
        cancelLabel={selectedCount === 1 ? 'Keep it' : 'Keep them'}
        variant="danger"
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setBulkDeleteConfirmOpen(false)}
      />
    </div>
  );
}

export default memo(ItemList);
