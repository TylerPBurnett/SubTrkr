import { useState, useMemo } from 'react';
import { 
  Search,
  Filter,
  MoreVertical,
  Pencil,
  Trash2,
  Pause,
  Play,
  ExternalLink,
  CreditCard
} from 'lucide-react';
import type { SubscriptionWithCategory, Category, BillingCycle } from '../types';
import ConfirmDialog from './ui/ConfirmDialog';
import EmptyState from './ui/EmptyState';

interface SubscriptionListProps {
  subscriptions: SubscriptionWithCategory[];
  categories: Category[];
  onEdit: (subscription: SubscriptionWithCategory) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
  onAddNew?: () => void;
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const billingCycleLabels: Record<BillingCycle, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export default function SubscriptionList({
  subscriptions,
  categories,
  onEdit,
  onDelete,
  onToggleActive,
  onAddNew,
}: SubscriptionListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      // Search filter
      if (searchQuery && !sub.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'all' && sub.category_id !== selectedCategory) {
        return false;
      }
      // Active filter
      if (!showInactive && sub.is_active !== 1) {
        return false;
      }
      return true;
    });
  }, [subscriptions, searchQuery, selectedCategory, showInactive]);

  const handleMenuToggle = (id: string) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleAction = (action: () => void) => {
    action();
    setOpenMenuId(null);
  };

  const handleDeleteClick = (sub: SubscriptionWithCategory) => {
    setOpenMenuId(null);
    setDeleteConfirm({ id: sub.id, name: sub.name });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      onDelete(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search subscriptions..."
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
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 rounded accent-[var(--brand-primary)]"
            style={{ borderColor: 'var(--border-default)' }}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Show inactive</span>
        </label>
      </div>

      {/* Subscription List */}
      {subscriptions.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={CreditCard}
            title="No subscriptions yet"
            description="Start tracking your recurring payments by adding your first subscription."
            action={onAddNew ? { label: 'Add Subscription', onClick: onAddNew } : undefined}
          />
        </div>
      ) : filteredSubscriptions.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Search}
            title="No matches found"
            description="Try adjusting your search or filter criteria."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSubscriptions.map(sub => (
            <div
              key={sub.id}
              className={`card relative group ${
                sub.is_active !== 1 ? 'opacity-60' : ''
              }`}
            >
              {/* Status badge */}
              {sub.is_active !== 1 && (
                <div 
                  className="absolute top-4 right-4 px-2 py-1 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                >
                  Paused
                </div>
              )}

              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                  style={{ backgroundColor: sub.category?.color || '#6b7280' }}
                >
                  {sub.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {sub.name}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {sub.category?.name || 'Uncategorized'}
                  </p>
                </div>

                {/* Menu */}
                <div className="relative">
                  <button
                    onClick={() => handleMenuToggle(sub.id)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {openMenuId === sub.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div 
                        className="dropdown absolute right-0 top-full mt-1 w-48 rounded-xl py-1 z-20"
                      >
                        <button
                          onClick={() => handleAction(() => onEdit(sub))}
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
                        <button
                          onClick={() => handleAction(() => onToggleActive(sub.id))}
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
                          {sub.is_active === 1 ? (
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
                        {sub.url && (
                          <a
                            href={sub.url}
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
                          onClick={() => handleDeleteClick(sub)}
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
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(sub.amount, sub.currency)}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {billingCycleLabels[sub.billing_cycle]}
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
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {formatDate(sub.next_billing_date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Subscription"
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
