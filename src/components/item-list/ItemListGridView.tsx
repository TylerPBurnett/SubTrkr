import { motion } from 'framer-motion';
import ServiceLogo from '@/components/ui/ServiceLogo';
import { formatDisplayDate, formatShortDate } from '@/utils/dates';
import type { ItemWithCategory, StatusChangeData } from '@/types';
import { BILLING_CYCLE_LABELS, formatCurrency, STATUS_STYLES } from './constants';
import { ItemListActionsMenu } from './ItemListActionsMenu';

interface ItemListGridViewProps {
  items: ItemWithCategory[];
  onDeleteClick: (item: ItemWithCategory) => void;
  onEdit: (item: ItemWithCategory) => void;
  onToggleActive: (id: string) => void;
  onStatusChange?: (itemId: string, action: StatusChangeData['action']) => void;
  onViewHistory?: (item: ItemWithCategory) => void;
}

export function ItemListGridView({
  items,
  onDeleteClick,
  onEdit,
  onToggleActive,
  onStatusChange,
  onViewHistory,
}: ItemListGridViewProps) {
  return (
    <motion.div
      key="grid"
      layout
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
    >
      {items.map((item, index) => {
        const categoryColor = item.category?.color || '#6b7280';

        return (
          <motion.div
            layout
            key={item.id}
            className={`stagger-item card group cursor-pointer ${STATUS_STYLES[item.status]}`}
            style={{
              filter:
                item.status === 'cancelled' || item.status === 'archived'
                  ? 'grayscale(0.15)'
                  : undefined,
              animationDelay: `${index * 0.05}s`,
              transition: 'all 0.2s var(--ease-out-expo)',
            }}
            onClick={() => onEdit(item)}
            onMouseEnter={(event) => {
              if (item.status === 'active') {
                event.currentTarget.style.boxShadow = `0 8px 24px -8px ${categoryColor}40, var(--shadow-elevated)`;
                event.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.boxShadow = 'var(--shadow-card)';
              event.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div className="flex items-start gap-3 mb-3">
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
                  className="block w-full text-left font-semibold text-lg truncate transition-colors hover:underline focus-visible:outline-none"
                  style={{
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.01em',
                  }}
                  aria-label={`Edit ${item.name}`}
                >
                  {item.name}
                </button>
                <div
                  className="flex items-center gap-1.5 mt-0.5"
                  style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: categoryColor,
                      boxShadow: `0 0 0 2px ${categoryColor}20`,
                    }}
                  />
                  <span className="font-medium truncate">
                    {item.category?.name || 'Uncategorized'}
                  </span>
                </div>
              </div>

              <ItemListActionsMenu
                item={item}
                onDeleteClick={onDeleteClick}
                onEdit={onEdit}
                onToggleActive={onToggleActive}
                onStatusChange={onStatusChange}
                onViewHistory={onViewHistory}
              />
            </div>

            {item.status !== 'active' && (
              <div className="mb-3">
                {item.status === 'trial' && (
                  <span
                    className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold font-mono"
                    style={{
                      background:
                        'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    TRIAL
                  </span>
                )}
                {item.status === 'paused' && (
                  <span
                    className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold font-mono"
                    style={{
                      background:
                        'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    PAUSED {item.paused_until && `· ${formatShortDate(item.paused_until)}`}
                  </span>
                )}
                {item.status === 'cancelled' && (
                  <span
                    className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold font-mono"
                    style={{
                      background:
                        'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    CANCELLED{' '}
                    {item.cancellation_date && `· ${formatShortDate(item.cancellation_date)}`}
                  </span>
                )}
                {item.status === 'archived' && (
                  <span
                    className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold font-mono"
                    style={{
                      backgroundColor: 'var(--bg-hover)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-default)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    ARCHIVED
                  </span>
                )}
              </div>
            )}

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
                {BILLING_CYCLE_LABELS[item.billing_cycle]}
              </p>
            </div>

            <div
              className="pt-4 flex items-center justify-between text-sm"
              style={{ borderTop: '1px solid var(--border-muted)' }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>Next billing</span>
              <span
                className="font-mono font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {formatDisplayDate(item.next_billing_date)}
              </span>
            </div>
            {item.status === 'trial' && item.trial_end_date ? (
              <p
                className="mt-2 text-xs font-mono"
                style={{ color: 'var(--text-secondary)' }}
              >
                Trial ends {formatDisplayDate(item.trial_end_date)}
              </p>
            ) : null}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
