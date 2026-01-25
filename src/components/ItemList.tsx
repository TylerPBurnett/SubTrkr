import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  MoreVertical,
  Pencil,
  Trash2,
  Pause,
  Play,
  XCircle,
  RotateCcw,
  ExternalLink,
  CreditCard,
  Receipt
} from 'lucide-react';
import type { ItemWithCategory, Category, BillingCycle, ItemType, StatusChangeData } from '../types';
import ConfirmDialog from './ui/ConfirmDialog';
import EmptyState from './ui/EmptyState';
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

export default function ItemList({
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
  const [showPaused, setShowPaused] = useState(true);
  const [showCancelled, setShowCancelled] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

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
    return typeFilteredItems.filter(item => {
      // Search filter
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'all' && item.category_id !== selectedCategory) {
        return false;
      }
      // Status filter
      if (item.status === 'paused' && !showPaused) {
        return false;
      }
      if (item.status === 'cancelled' && !showCancelled) {
        return false;
      }
      if (item.status === 'archived' && !showArchived) {
        return false;
      }
      return true;
    });
  }, [typeFilteredItems, searchQuery, selectedCategory, showPaused, showCancelled, showArchived]);

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

  const Icon = labels.icon;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={`Search ${labels.plural}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-0"
            style={{ 
              '--tw-ring-color': 'var(--brand-primary)',
              borderColor: 'var(--border-default)'
            } as React.CSSProperties}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2"
            style={{ 
              '--tw-ring-color': 'var(--brand-primary)',
              borderColor: 'var(--border-default)'
            } as React.CSSProperties}
          >
            <option value="all">All Categories</option>
            {filteredCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showPaused}
            onChange={(e) => setShowPaused(e.target.checked)}
            className="w-4 h-4 rounded accent-[var(--brand-primary)]"
            style={{ borderColor: 'var(--border-default)' }}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Show paused</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(e) => setShowCancelled(e.target.checked)}
            className="w-4 h-4 rounded accent-[var(--brand-primary)]"
            style={{ borderColor: 'var(--border-default)' }}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Show cancelled</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="w-4 h-4 rounded accent-[var(--brand-primary)]"
            style={{ borderColor: 'var(--border-default)' }}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Show archived</span>
        </label>
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item, index) => {
            // Determine opacity and styling based on status
            const statusStyles = {
              active: '',
              paused: 'opacity-70',
              cancelled: 'opacity-50',
              archived: 'opacity-40',
            };

            const categoryColor = item.category?.color || '#6b7280';

            return (
            <div
              key={item.id}
              className={`stagger-item card relative group ${statusStyles[item.status]}`}
              style={{
                borderLeft: `6px solid ${categoryColor}`,
                filter: item.status === 'cancelled' || item.status === 'archived' ? 'grayscale(0.3)' : undefined,
                animationDelay: `${index * 0.05}s`,
                transition: 'all 0.2s var(--ease-out-expo)'
              }}
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
              {item.status === 'paused' && (
                <div
                  className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-xs font-bold font-mono"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                    letterSpacing: '0.02em'
                  }}
                >
                  PAUSED {item.paused_until && `· ${formatShortDate(item.paused_until)}`}
                </div>
              )}
              {item.status === 'cancelled' && (
                <div
                  className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-xs font-bold font-mono"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                    letterSpacing: '0.02em'
                  }}
                >
                  CANCELLED {item.cancellation_date && `· ${formatShortDate(item.cancellation_date)}`}
                </div>
              )}
              {item.status === 'archived' && (
                <div
                  className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-xs font-bold font-mono"
                  style={{
                    backgroundColor: 'var(--bg-hover)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-default)',
                    letterSpacing: '0.02em'
                  }}
                >
                  ARCHIVED
                </div>
              )}

              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-mono font-semibold text-lg truncate" style={{ color: 'var(--text-primary)' }}>
                    {item.name}
                  </h3>
                  <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {item.category?.name || 'Uncategorized'}
                  </p>
                </div>

                {/* Menu */}
                <div className="relative">
                  <button
                    onClick={() => handleMenuToggle(item.id)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {openMenuId === item.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div 
                        className="dropdown absolute right-0 top-full mt-1 w-48 rounded-xl py-1 z-20"
                      >
                        <button
                          onClick={() => handleAction(() => onEdit(item))}
                          className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                          style={{ color: 'var(--text-secondary)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>

                        {/* Status-aware actions */}
                        {item.status === 'active' && onStatusChange && (
                          <>
                            <button
                              onClick={() => handleAction(() => onStatusChange(item.id, 'pause'))}
                              className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                              style={{ color: 'var(--text-secondary)' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                              }}
                            >
                              <Pause className="w-4 h-4" />
                              Pause
                            </button>
                            <button
                              onClick={() => handleAction(() => onStatusChange(item.id, 'cancel'))}
                              className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                              style={{ color: 'var(--text-secondary)' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                              }}
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
                              className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                              style={{ color: 'var(--text-secondary)' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                              }}
                            >
                              <Play className="w-4 h-4" />
                              Resume
                            </button>
                            <button
                              onClick={() => handleAction(() => onStatusChange(item.id, 'cancel'))}
                              className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                              style={{ color: 'var(--text-secondary)' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                              }}
                            >
                              <XCircle className="w-4 h-4" />
                              Cancel
                            </button>
                          </>
                        )}

                        {(item.status === 'cancelled' || item.status === 'archived') && onStatusChange && (
                          <button
                            onClick={() => handleAction(() => onStatusChange(item.id, 'reactivate'))}
                            className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                            style={{ color: 'var(--accent-green)' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--accent-green-muted)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <RotateCcw className="w-4 h-4" />
                            Reactivate
                          </button>
                        )}

                        {/* Fallback for old onToggleActive prop */}
                        {!onStatusChange && (
                          <button
                            onClick={() => handleAction(() => onToggleActive(item.id))}
                            className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                              e.currentTarget.style.color = 'var(--text-primary)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = 'var(--text-secondary)';
                            }}
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
                            className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                              e.currentTarget.style.color = 'var(--text-primary)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = 'var(--text-secondary)';
                            }}
                          >
                            <ExternalLink className="w-4 h-4" />
                            Visit Website
                          </a>
                        )}
                        <hr style={{ borderColor: 'var(--border-default)' }} className="my-1" />
                        <button
                          onClick={() => handleDeleteClick(item)}
                          className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                          style={{ color: 'var(--accent-red)' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-red-muted)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div className="mb-4">
                <p className="font-mono font-bold" style={{
                  fontSize: '1.75rem',
                  letterSpacing: '-0.01em',
                  color: 'var(--text-primary)'
                }}>
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
                <span style={{ color: 'var(--text-secondary)' }}>
                  Next billing
                </span>
                <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                  {formatDisplayDate(item.next_billing_date)}
                </span>
              </div>
            </div>
            );
          })}
        </div>
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
    </div>
  );
}
