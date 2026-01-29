import { useState, useMemo, useEffect, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Pause,
  Play,
  XCircle,
  RotateCcw,
  ExternalLink,
  CreditCard,
  Receipt,
  Check
} from 'lucide-react';
import SearchFilterToolbar from './SearchFilterToolbar';
import { Checkbox } from './ui/checkbox';
import type { ItemWithCategory, Category, BillingCycle, ItemType, StatusChangeData } from '@/types';
import ConfirmDialog from './ui/ConfirmDialog';
import EmptyState from './ui/EmptyState';
import ServiceLogo from './ui/ServiceLogo';
import { formatDisplayDate, formatShortDate } from '../utils/dates';

interface ItemListProps {
  items: ItemWithCategory[];
  categories: Category[];
  itemType?: ItemType; // If provided, filters to this type
  onEdit: (item: ItemWithCategory) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void; // DEPRECATED: kept for compatibility
  onStatusChange?: (itemId: string, action: StatusChangeData['action']) => void;
  onAddNew?: () => void;
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

const billingCycleLabels: Record<BillingCycle, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

function ItemList({
  items,
  categories,
  itemType,
  onEdit,
  onDelete,
  onToggleActive,
  onStatusChange,
  onAddNew,
}: ItemListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showActives, setShowActives] = useState(true);
  const [showTrials, setShowTrials] = useState(true);
  const [showPaused, setShowPaused] = useState(true);
  const [showCancelled, setShowCancelled] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const viewStorageKey = `subtrkr-item-view-${itemType ?? 'all'}`;
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem(viewStorageKey);
    return saved === 'list' ? 'list' : 'grid';
  });
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    localStorage.setItem(viewStorageKey, viewMode);
  }, [viewMode, viewStorageKey]);

  useEffect(() => {
    if (viewMode !== 'grid' || selectedItemIds.size === 0) {
      return;
    }
    setSelectedItemIds(new Set());
  }, [viewMode, selectedItemIds.size]);

  // Get labels based on item type
  const labels = {
    singular: itemType === 'bill' ? 'bill' : 'subscription',
    plural: itemType === 'bill' ? 'bills' : 'subscriptions',
    icon: itemType === 'bill' ? Receipt : CreditCard,
  };

  // Filter items by type first, then apply other filters
  const typeFilteredItems = useMemo(() => {
    return itemType ? items.filter(item => item.item_type === itemType) : items;
  }, [items, itemType]);

  // Filter categories by type
  const filteredCategories = useMemo(() => {
    return itemType ? categories.filter(cat => cat.category_type === itemType) : categories;
  }, [categories, itemType]);

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

  useEffect(() => {
    if (selectedItemIds.size === 0) {
      return;
    }
    const visibleIds = new Set(filteredItems.map((item) => item.id));
    let changed = false;
    const next = new Set<string>();
    selectedItemIds.forEach((id) => {
      if (visibleIds.has(id)) {
        next.add(id);
      } else {
        changed = true;
      }
    });
    if (changed) {
      setSelectedItemIds(next);
    }
  }, [filteredItems, selectedItemIds]);

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (!showActives) count++;
    if (!showTrials) count++;
    if (!showPaused) count++;
    if (!showCancelled) count++;
    return count;
  }, [selectedCategory, showActives, showTrials, showPaused, showCancelled]);

  const selectedVisibleItems = useMemo(() => {
    if (selectedItemIds.size === 0) {
      return [];
    }
    return filteredItems.filter((item) => selectedItemIds.has(item.id));
  }, [filteredItems, selectedItemIds]);

  const selectedCount = selectedVisibleItems.length;
  const allVisibleSelected = filteredItems.length > 0 && selectedCount === filteredItems.length;
  const someVisibleSelected = selectedCount > 0 && selectedCount < filteredItems.length;

  const handleMenuToggle = (id: string) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleAction = (action: () => void) => {
    action();
    setOpenMenuId(null);
  };

  const handleDeleteClick = (item: ItemWithCategory) => {
    setOpenMenuId(null);
    setDeleteConfirm({ id: item.id, name: item.name });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      onDelete(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleSelectAllChange = (checked: boolean | 'indeterminate') => {
    if (checked === true || checked === 'indeterminate') {
      setSelectedItemIds(new Set(filteredItems.map((item) => item.id)));
      return;
    }
    setSelectedItemIds(new Set());
  };

  const handleSelectItemChange = (itemId: string, checked: boolean | 'indeterminate') => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (checked === true || checked === 'indeterminate') {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
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

  const renderActionsMenu = (item: ItemWithCategory) => (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        onClick={(event) => {
          event.stopPropagation();
          handleMenuToggle(item.id);
        }}
        className="p-2 rounded-lg transition-colors interactive-hover-bg"
        style={{ color: 'var(--text-muted)' }}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {openMenuId === item.id && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
          <div
            className="dropdown absolute right-0 top-full mt-1 w-48 rounded-xl py-1 z-20"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => handleAction(() => onEdit(item))}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors menu-item"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>

            {/* Status-aware actions */}
            {item.status === 'trial' && onStatusChange && (
              <>
                <button
                  onClick={() => handleAction(() => onStatusChange(item.id, 'convert'))}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors menu-item-success"
                >
                  <Check className="w-4 h-4" />
                  Convert to Paid
                </button>
                <button
                  onClick={() => handleAction(() => onStatusChange(item.id, 'cancel'))}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors menu-item"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel Trial
                </button>
              </>
            )}

            {item.status === 'active' && onStatusChange && (
              <>
                <button
                  onClick={() => handleAction(() => onStatusChange(item.id, 'pause'))}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors menu-item"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
                <button
                  onClick={() => handleAction(() => onStatusChange(item.id, 'cancel'))}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors menu-item"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
              </>
            )}

            {item.status === 'paused' && onStatusChange && (
              <>
                <button
                  onClick={() => handleAction(() => onStatusChange(item.id, 'resume'))}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors menu-item"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </button>
                <button
                  onClick={() => handleAction(() => onStatusChange(item.id, 'cancel'))}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors menu-item"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
              </>
            )}

            {(item.status === 'cancelled' || item.status === 'archived') && onStatusChange && (
              <button
                onClick={() => handleAction(() => onStatusChange(item.id, 'reactivate'))}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors menu-item-success"
              >
                <RotateCcw className="w-4 h-4" />
                Reactivate
              </button>
            )}

            {/* Fallback for old onToggleActive prop */}
            {!onStatusChange && (
              <button
                onClick={() => handleAction(() => onToggleActive(item.id))}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors menu-item"
              >
                {item.is_active ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Resume
                  </>
                )}
              </button>
            )}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpenMenuId(null)}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors menu-item"
              >
                <ExternalLink className="w-4 h-4" />
                Visit Website
              </a>
            )}
            <hr style={{ borderColor: 'var(--border-default)' }} className="my-1" />
            <button
              onClick={() => handleDeleteClick(item)}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors menu-item-danger"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderStatusPill = (item: ItemWithCategory) => {
    const statusMeta = (() => {
      switch (item.status) {
        case 'trial':
          return {
            label: 'Trial',
            date: item.trial_end_date ? formatShortDate(item.trial_end_date) : null,
            background: 'var(--accent-blue-muted)',
            color: 'var(--accent-blue)',
          };
        case 'paused':
          return {
            label: 'Paused',
            date: item.paused_until ? formatShortDate(item.paused_until) : null,
            background: 'var(--accent-amber-muted)',
            color: 'var(--accent-amber)',
          };
        case 'cancelled':
          return {
            label: 'Cancelled',
            date: item.cancellation_date ? formatShortDate(item.cancellation_date) : null,
            background: 'var(--accent-red-muted)',
            color: 'var(--accent-red)',
          };
        case 'archived':
          return {
            label: 'Archived',
            date: null,
            background: 'var(--bg-hover)',
            color: 'var(--text-muted)',
          };
        default:
          return {
            label: 'Active',
            date: null,
            background: 'var(--brand-primary-light)',
            color: 'var(--brand-primary)',
          };
      }
    })();

    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-mono"
        style={{
          backgroundColor: statusMeta.background,
          color: statusMeta.color,
          letterSpacing: '0.02em',
        }}
      >
        {statusMeta.label}
        {statusMeta.date && <span className="opacity-80">· {statusMeta.date}</span>}
      </span>
    );
  };

  const statusStyles = {
    active: '',
    trial: 'opacity-90',
    paused: 'opacity-70',
    cancelled: 'opacity-50',
    archived: 'opacity-40',
  };

  const selectedLabel = selectedCount === 1 ? labels.singular : labels.plural;
  const Icon = labels.icon;

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
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
        onClearFilters={() => {
          setSelectedCategory('all');
          setShowActives(true);
          setShowTrials(true);
          setShowPaused(true);
          setShowCancelled(false);
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      >
        {/* Bulk actions - only shown in list mode when items are selected */}
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
      </SearchFilterToolbar>

      {/* Item List */}
      {typeFilteredItems.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Icon}
            title={`No ${labels.plural} yet`}
            description={`Start tracking your recurring payments by adding your first ${labels.singular}.`}
            action={onAddNew ? { label: `Add ${labels.singular.charAt(0).toUpperCase() + labels.singular.slice(1)}`, onClick: onAddNew } : undefined}
          />
        </div>
      ) : filteredItems.length === 0 ? (
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
            <motion.div
              key="grid"
              layout
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              {filteredItems.map((item, index) => {
                const categoryColor = item.category?.color || '#6b7280';

                return (
                  <motion.div
                    layout
                    key={item.id}
                    className={`stagger-item card relative group cursor-pointer ${statusStyles[item.status]}`}
                    style={{
                      borderLeft: `6px solid ${categoryColor}`,
                      filter:
                        item.status === 'cancelled' || item.status === 'archived'
                          ? 'grayscale(0.3)'
                          : undefined,
                      animationDelay: `${index * 0.05}s`,
                      transition: 'all 0.2s var(--ease-out-expo)',
                    }}
                    onClick={() => onEdit(item)}
                    onMouseEnter={(e) => {
                      if (item.status === 'active') {
                        e.currentTarget.style.boxShadow = `0 8px 24px -8px ${categoryColor}40, var(--shadow-elevated)`;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Status badge */}
                    {item.status === 'trial' && (
                      <div
                        className="absolute bottom-16 right-4 px-3 py-1.5 rounded-lg text-xs font-bold font-mono"
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: 'white',
                          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                          letterSpacing: '0.02em',
                        }}
                      >
                        TRIAL {item.trial_end_date && `· ${formatShortDate(item.trial_end_date)}`}
                      </div>
                    )}
                    {item.status === 'paused' && (
                      <div
                        className="absolute bottom-16 right-4 px-3 py-1.5 rounded-lg text-xs font-bold font-mono"
                        style={{
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: 'white',
                          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                          letterSpacing: '0.02em',
                        }}
                      >
                        PAUSED {item.paused_until && `· ${formatShortDate(item.paused_until)}`}
                      </div>
                    )}
                    {item.status === 'cancelled' && (
                      <div
                        className="absolute bottom-16 right-4 px-3 py-1.5 rounded-lg text-xs font-bold font-mono"
                        style={{
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          color: 'white',
                          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                          letterSpacing: '0.02em',
                        }}
                      >
                        CANCELLED {item.cancellation_date && `· ${formatShortDate(item.cancellation_date)}`}
                      </div>
                    )}
                    {item.status === 'archived' && (
                      <div
                        className="absolute bottom-16 right-4 px-3 py-1.5 rounded-lg text-xs font-bold font-mono"
                        style={{
                          backgroundColor: 'var(--bg-hover)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border-default)',
                          letterSpacing: '0.02em',
                        }}
                      >
                        ARCHIVED
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                      {/* Logo */}
                      <ServiceLogo
                        logoUrl={item.logo_url}
                        name={item.name}
                        size="md"
                        itemType={item.item_type}
                        categoryName={item.category?.name}
                        categoryColor={item.category?.color}
                      />

                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEdit(item);
                          }}
                          className="block w-full text-left font-mono font-semibold text-lg truncate transition-colors hover:underline focus-visible:outline-none"
                          style={{ color: 'var(--text-primary)' }}
                          aria-label={`Edit ${item.name}`}
                        >
                          {item.name}
                        </button>
                        <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                          {item.category?.name || 'Uncategorized'}
                        </p>
                      </div>

                      {/* Menu */}
                      {renderActionsMenu(item)}
                    </div>

                    {/* Amount */}
                    <div className="mb-4">
                      <p
                        className="font-mono font-semibold"
                        style={{
                          fontSize: '1.5rem',
                          letterSpacing: '-0.01em',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {formatCurrency(item.amount, item.currency)}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {billingCycleLabels[item.billing_cycle]}
                      </p>
                    </div>

                    {/* Footer */}
                    <div
                      className="pt-4 flex items-center justify-between text-sm"
                      style={{ borderTop: '1px solid var(--border-muted)' }}
                    >
                      <span style={{ color: 'var(--text-secondary)' }}>Next billing</span>
                      <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                        {formatDisplayDate(item.next_billing_date)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ minWidth: 760 }}>
                    <thead
                      style={{
                        backgroundColor: 'var(--bg-default)',
                        color: 'var(--text-muted)',
                        borderBottom: '1px solid var(--border-default)',
                      }}
                    >
                      <tr>
                        <th className="pl-4 pr-2 py-3">
                          <Checkbox
                            checked={
                              allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false
                            }
                            onCheckedChange={handleSelectAllChange}
                            aria-label="Select all"
                            onClick={(event) => event.stopPropagation()}
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                          Renews
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                          Recurrence
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                          Cost
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item, index) => {
                        const categoryColor = item.category?.color || '#6b7280';

                        return (
                          <motion.tr
                            layout
                            key={item.id}
                            className={`stagger-item transition-colors cursor-pointer interactive-hover-bg ${statusStyles[item.status]}`}
                            style={{
                              borderBottom: '1px solid var(--border-muted)',
                              filter:
                                item.status === 'cancelled' || item.status === 'archived'
                                  ? 'grayscale(0.3)'
                                  : undefined,
                              animationDelay: `${index * 0.03}s`,
                            }}
                            onClick={() => onEdit(item)}
                          >
                            <td className="pl-4 pr-2 py-3" onClick={(event) => event.stopPropagation()}>
                              <Checkbox
                                checked={selectedItemIds.has(item.id)}
                                onCheckedChange={(checked) => handleSelectItemChange(item.id, checked)}
                                aria-label={`Select ${item.name}`}
                                onClick={(event) => event.stopPropagation()}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3 min-w-[240px]">
                                <ServiceLogo
                                  logoUrl={item.logo_url}
                                  name={item.name}
                                  size="sm"
                                  itemType={item.item_type}
                                  categoryName={item.category?.name}
                                  categoryColor={item.category?.color}
                                />
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onEdit(item);
                                    }}
                                    className="block w-full text-left font-mono font-semibold text-sm truncate transition-colors hover:underline focus-visible:outline-none"
                                    style={{ color: 'var(--text-primary)' }}
                                    aria-label={`Edit ${item.name}`}
                                  >
                                    {item.name}
                                  </button>
                                  <div
                                    className="flex items-center gap-2 text-xs"
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    <span className="inline-flex items-center gap-1">
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: categoryColor }}
                                      />
                                      {item.category?.name || 'Uncategorized'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-primary)' }}>
                              {formatDisplayDate(item.next_billing_date)}
                            </td>
                            <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                              {billingCycleLabels[item.billing_cycle]}
                            </td>
                            <td
                              className="px-4 py-3 font-mono font-semibold"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {formatCurrency(item.amount, item.currency)}
                            </td>
                            <td className="px-4 py-3">{renderStatusPill(item)}</td>
                            <td className="px-4 py-3 text-right">{renderActionsMenu(item)}</td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title={`Delete ${labels.singular.charAt(0).toUpperCase() + labels.singular.slice(1)}`}
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Keep it"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Bulk Delete Confirmation Dialog */}
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
