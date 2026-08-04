import { memo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CreditCard, Plus, Receipt, Search } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import GhostListPreview from '@/components/ui/GhostListPreview';
import SearchFilterToolbar from '@/components/SearchFilterToolbar';
import StatusChangeDialog from '@/components/StatusChangeDialog';
import type {
  Category,
  ItemType,
  ItemWithCategory,
  StatusChangeData,
} from '@/types';
import type { BulkCopy, BulkResult } from '@/services/database';
import { BulkCategoryDialog } from '@/components/item-list/BulkCategoryDialog';
import { SORT_OPTIONS } from '@/components/item-list/constants';
import type { HudActionDescriptor } from '@/components/item-list/hudActions';
import { ItemListGridView } from '@/components/item-list/ItemListGridView';
import { ItemListTableView } from '@/components/item-list/ItemListTableView';
import { SelectionHUD } from '@/components/item-list/SelectionHUD';
import type { BulkStatusAction } from '@/components/item-list/statusActions';
import { useItemListState } from '@/components/item-list/useItemListState';
import { useSelectionKeyboard } from '@/components/item-list/useSelectionKeyboard';

/**
 * Toast wording per bulk action. `singular`/`plural` are filled in from the
 * list's own item-type labels so a bill batch never reads "subscriptions".
 */
const BULK_ACTION_COPY: Record<
  BulkStatusAction,
  { pastTense: string; failedVerb: string }
> = {
  pause: { pastTense: 'Paused', failedVerb: 'pause' },
  resume: { pastTense: 'Resumed', failedVerb: 'resume' },
  cancel: { pastTense: 'Cancelled', failedVerb: 'cancel' },
  reactivate: { pastTense: 'Reactivated', failedVerb: 'reactivate' },
  archive: { pastTense: 'Archived', failedVerb: 'archive' },
};

interface ItemListProps {
  items: ItemWithCategory[];
  categories: Category[];
  itemType?: ItemType;
  onEdit: (item: ItemWithCategory) => void;
  onDelete: (id: string) => void;
  onBulkDelete: (
    ids: string[],
    labels: { singular: string; plural: string },
  ) => Promise<BulkResult>;
  onBulkStatusChange: (
    ids: string[],
    data: StatusChangeData,
    copy: BulkCopy,
    /** selected but ineligible ids, surfaced in the toast as "· N skipped" */
    skippedIds?: string[],
  ) => Promise<BulkResult>;
  onBulkCategoryChange: (
    ids: string[],
    categoryId: string | null,
    labels: { singular: string; plural: string },
  ) => Promise<BulkResult>;
  onToggleActive: (id: string) => void;
  onStatusChange?: (itemId: string, action: StatusChangeData['action']) => void;
  onViewHistory?: (item: ItemWithCategory) => void;
  onAddNew?: () => void;
  /**
   * True while any App-level modal (item form, single-item status dialog,
   * status history, password recovery) is open. Those render as siblings of the
   * page content, so this list stays mounted underneath them with its keydown
   * listener still on window — without this the selection shortcuts would fire
   * straight through an open modal.
   */
  isModalOpen?: boolean;
}

function ItemList({
  items,
  categories,
  itemType,
  onEdit,
  onDelete,
  onBulkDelete,
  onBulkStatusChange,
  onBulkCategoryChange,
  onToggleActive,
  onStatusChange,
  onViewHistory,
  onAddNew,
  isModalOpen = false,
}: ItemListProps) {
  const {
    activeFilterCount,
    allVisibleSelected,
    categoryLookup,
    clearFilters,
    clearSelection,
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
  const [bulkDeletePending, setBulkDeletePending] = useState(false);
  // The ref is the actual latch: it flips synchronously, so a second click can
  // never slip through in the window before React re-renders the disabled
  // button. The state exists to drive that re-render.
  const bulkDeleteInFlight = useRef(false);
  const [bulkStatusAction, setBulkStatusAction] = useState<{
    action: BulkStatusAction;
    items: ItemWithCategory[];
    /**
     * Selected but ineligible ids. Held as ids, not a count, so they can be
     * merged into `BulkResult.skipped` (a `string[]`) and reach the toast —
     * otherwise the dialog promises "N will be skipped" and the toast that
     * follows never mentions them.
     */
    skippedIds: string[];
  } | null>(null);
  // Drives BulkCategoryDialog, rendered below. Reset to false on both its
  // cancel and confirm paths — see the useSelectionKeyboard guard note below.
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);
  // True while any row-actions or HUD-overflow dropdown is open. Those are
  // non-modal Radix popover layers, so without this the selection shortcuts
  // would fire straight through them — Backspace would stack a bulk-delete
  // confirmation on top of an open menu, leaving two layers fighting over
  // focus and pointer-events.
  const [hasOpenMenu, setHasOpenMenu] = useState(false);

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

  /** Drops only the ids the batch actually mutated; failures stay selected. */
  const deselectSucceeded = (result: BulkResult) => {
    if (result.succeeded.length === 0) {
      return;
    }

    setSelectedItemIds((previous) => {
      const nextSelectedIds = new Set(previous);
      result.succeeded.forEach((id) => nextSelectedIds.delete(id));
      return nextSelectedIds;
    });
  };

  const handleBulkDeleteConfirm = async () => {
    if (bulkDeleteInFlight.current) {
      return;
    }

    if (selectedCount === 0) {
      setBulkDeleteConfirmOpen(false);
      return;
    }

    bulkDeleteInFlight.current = true;
    setBulkDeletePending(true);

    try {
      const result = await onBulkDelete(
        selectedVisibleItems.map((item) => item.id),
        { singular: labels.singular, plural: labels.plural },
      );

      deselectSucceeded(result);
      setBulkDeleteConfirmOpen(false);
    } finally {
      bulkDeleteInFlight.current = false;
      setBulkDeletePending(false);
    }
  };

  const handleHudAction = (descriptor: HudActionDescriptor) => {
    if (descriptor.action === 'category') {
      setBulkCategoryOpen(true);
      return;
    }

    const eligibleIds = new Set(descriptor.eligibleIds);
    const eligibleItems = selectedVisibleItems.filter((item) =>
      eligibleIds.has(item.id),
    );

    if (eligibleItems.length === 0) {
      return;
    }

    setBulkStatusAction({
      action: descriptor.action,
      items: eligibleItems,
      skippedIds: descriptor.skippedIds,
    });
  };

  const handleBulkStatusConfirm = async (data: StatusChangeData) => {
    if (!bulkStatusAction) {
      return;
    }

    const actionCopy = BULK_ACTION_COPY[bulkStatusAction.action];
    const result = await onBulkStatusChange(
      bulkStatusAction.items.map((item) => item.id),
      data,
      {
        pastTense: actionCopy.pastTense,
        failedVerb: actionCopy.failedVerb,
        singular: labels.singular,
        plural: labels.plural,
      },
      // The ids the HUD already ruled ineligible. The service only ever
      // reports ids it attempted, so this is the only path by which the
      // "· N skipped" suffix can reach the toast.
      bulkStatusAction.skippedIds,
    );

    deselectSucceeded(result);
    setBulkStatusAction(null);
  };

  // Covers every dialog that actually renders today, so Backspace can't stack a
  // second confirmation behind the first. `isModalOpen` covers the App-level
  // modals, which render as siblings of the page content and leave this list
  // mounted with its window listener live underneath them.
  //
  // `bulkCategoryOpen` is included now that BulkCategoryDialog renders below
  // and resets the flag on both its cancel and confirm paths — without that
  // reset this guard would disable Cmd+A, Escape and Backspace permanently
  // after the first Category click.
  //
  // `hasOpenMenu` covers the non-modal popover layer (row-actions and HUD
  // overflow dropdowns). Backspace isn't Radix typeahead, so nothing inside
  // the menu would intercept it — real open state is what keeps the shortcuts
  // off while a menu is up.
  useSelectionKeyboard({
    enabled:
      !isModalOpen &&
      !deleteConfirm &&
      !bulkDeleteConfirmOpen &&
      !bulkStatusAction &&
      !bulkCategoryOpen &&
      !hasOpenMenu,
    hasSelection: selectedCount > 0,
    onSelectAll: () => handleSelectAllChange(true),
    onClear: clearSelection,
    onDelete: () => setBulkDeleteConfirmOpen(true),
  });

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
              onSelectItemChange={handleSelectItemChange}
              onToggleActive={onToggleActive}
              onStatusChange={onStatusChange}
              onViewHistory={onViewHistory}
              onActionsMenuOpenChange={setHasOpenMenu}
              selectedItemIds={selectedItemIds}
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
              onActionsMenuOpenChange={setHasOpenMenu}
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
        isSubmitting={bulkDeletePending}
        submittingLabel="Deleting..."
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setBulkDeleteConfirmOpen(false)}
      />

      {bulkStatusAction ? (
        <StatusChangeDialog
          categories={categories}
          isOpen={true}
          item={bulkStatusAction.items[0]}
          action={bulkStatusAction.action}
          bulkItems={bulkStatusAction.items}
          skippedCount={bulkStatusAction.skippedIds.length}
          onConfirm={handleBulkStatusConfirm}
          onCancel={() => setBulkStatusAction(null)}
        />
      ) : null}

      {bulkCategoryOpen ? (
        <BulkCategoryDialog
          isOpen={bulkCategoryOpen}
          categories={filteredCategories}
          itemCount={selectedCount}
          onConfirm={async (categoryId) => {
            // Same guard the delete path uses: a background realtime reload
            // can prune the selection to empty while this dialog is open, and
            // an empty batch summarizes to `null` — closing with no toast at
            // all, the silent no-op BulkResult exists to prevent.
            if (selectedCount === 0) {
              setBulkCategoryOpen(false);
              return;
            }

            const result = await onBulkCategoryChange(
              selectedVisibleItems.map((item) => item.id),
              categoryId,
              { singular: labels.singular, plural: labels.plural },
            );
            deselectSucceeded(result);
            setBulkCategoryOpen(false);
          }}
          onCancel={() => setBulkCategoryOpen(false)}
        />
      ) : null}

      {/*
        Last child on purpose. `SelectionHUD` is position: sticky with a bottom
        offset, so it only floats over the list when its flow slot sits below
        the scrollport — anywhere higher in the tree it would render as a static
        bar wedged between the toolbar and the first row.
      */}
      <SelectionHUD
        items={selectedVisibleItems}
        onAction={handleHudAction}
        onDelete={() => setBulkDeleteConfirmOpen(true)}
        onDismiss={clearSelection}
        onOverflowOpenChange={setHasOpenMenu}
      />
    </div>
  );
}

export default memo(ItemList);
