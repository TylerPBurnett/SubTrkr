import { useState, useMemo } from 'react';
import { 
  Search,
  Filter,
  MoreVertical,
  Pencil,
  Trash2,
  Pause,
  Play,
  ExternalLink
} from 'lucide-react';
import type { SubscriptionWithCategory, Category, BillingCycle } from '../types';

interface SubscriptionListProps {
  subscriptions: SubscriptionWithCategory[];
  categories: Category[];
  onEdit: (subscription: SubscriptionWithCategory) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
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
}: SubscriptionListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search subscriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-surface-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-neutral-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-surface-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-brand-500 focus:ring-brand-500"
          />
          <span className="text-sm text-neutral-600 dark:text-neutral-400">Show inactive</span>
        </label>
      </div>

      {/* Subscription List */}
      {filteredSubscriptions.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
            No subscriptions found
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400">
            {subscriptions.length === 0
              ? "Add your first subscription to get started"
              : "Try adjusting your filters"}
          </p>
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
                <div className="absolute top-4 right-4 px-2 py-1 bg-neutral-100 dark:bg-neutral-700 rounded-lg text-xs font-medium text-neutral-500 dark:text-neutral-400">
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
                  <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                    {sub.name}
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {sub.category?.name || 'Uncategorized'}
                  </p>
                </div>

                {/* Menu */}
                <div className="relative">
                  <button
                    onClick={() => handleMenuToggle(sub.id)}
                    className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <MoreVertical className="w-5 h-5 text-neutral-400" />
                  </button>

                  {openMenuId === sub.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-surface-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-20">
                        <button
                          onClick={() => handleAction(() => onEdit(sub))}
                          className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleAction(() => onToggleActive(sub.id))}
                          className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"
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
                            className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Visit Website
                          </a>
                        )}
                        <hr className="my-1 border-neutral-200 dark:border-neutral-700" />
                        <button
                          onClick={() => handleAction(() => onDelete(sub.id))}
                          className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
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
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {formatCurrency(sub.amount, sub.currency)}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {billingCycleLabels[sub.billing_cycle]}
                </p>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Next billing
                </span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {formatDate(sub.next_billing_date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
