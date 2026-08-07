import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import ServiceLogo from '@/components/ui/ServiceLogo';
import { formatDisplayDate } from '@/utils/dates';
import { resolveItemCategoryDisplay } from '@/utils/categories';
import type { Category, ItemWithCategory, StatusChangeData } from '@/types';
import { BILLING_CYCLE_LABELS, formatCurrency, STATUS_STYLES } from './constants';
import { ItemListActionsMenu } from './ItemListActionsMenu';
import { ItemListStatusPill } from './ItemListStatusPill';

interface ItemListGridViewProps {
  categoryLookup: ReadonlyMap<string, Category>;
  items: ItemWithCategory[];
  onDeleteClick: (item: ItemWithCategory) => void;
  onEdit: (item: ItemWithCategory) => void;
  onToggleActive: (id: string) => void;
  onStatusChange?: (itemId: string, action: StatusChangeData['action']) => void;
  onViewHistory?: (item: ItemWithCategory) => void;
  onSelectItemChange: (
    itemId: string,
    checked: boolean | 'indeterminate',
    options?: { extendRange?: boolean },
  ) => void;
  /** Reports a row's actions menu opening/closing, so the list can gate its shortcuts. */
  onActionsMenuOpenChange?: (open: boolean) => void;
  selectedItemIds: Set<string>;
}

export function ItemListGridView({
  categoryLookup,
  items,
  onDeleteClick,
  onEdit,
  onToggleActive,
  onStatusChange,
  onViewHistory,
  onSelectItemChange,
  onActionsMenuOpenChange,
  selectedItemIds,
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
        const categoryDisplay = resolveItemCategoryDisplay(item, categoryLookup);
        const categoryColor = categoryDisplay.color;
        const isSelected = selectedItemIds.has(item.id);
        const hasSelection = selectedItemIds.size > 0;

        return (
          <motion.div
            layout
            key={item.id}
            className={`stagger-item card group relative cursor-pointer ${STATUS_STYLES[item.status]}`}
            style={{
              filter:
                item.status === 'cancelled' || item.status === 'archived'
                  ? 'grayscale(0.15)'
                  : undefined,
              animationDelay: `${index * 0.05}s`,
              transition: 'all 0.2s var(--ease-out-expo)',
              boxShadow: isSelected ? '0 0 0 2px var(--ring)' : undefined,
              borderColor: isSelected ? 'transparent' : undefined,
            }}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey) {
                event.preventDefault();
                onSelectItemChange(item.id, !isSelected);
                return;
              }

              if (event.shiftKey) {
                event.preventDefault();
                onSelectItemChange(item.id, true, { extendRange: true });
                return;
              }

              onEdit(item);
            }}
            onMouseEnter={(event) => {
              if (item.status === 'active' && !isSelected) {
                event.currentTarget.style.boxShadow =
                  'var(--shadow-elevated), 0 10px 28px -10px rgba(0, 0, 0, 0.22)';
                event.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.boxShadow = isSelected ? '0 0 0 2px var(--ring)' : '';
              event.currentTarget.style.transform = '';
            }}
          >
            <div
              className={`absolute top-2.5 left-2.5 z-10 p-[3px] rounded-[7px] transition-opacity ${
                hasSelection
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
              }`}
              style={{
                backgroundColor: 'color-mix(in srgb, var(--bg-base) 70%, transparent)',
                backdropFilter: 'blur(10px) saturate(160%)',
                WebkitBackdropFilter: 'blur(10px) saturate(160%)',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.4)',
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelectItemChange(item.id, checked)}
                aria-label={`Select ${item.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  if (event.shiftKey) {
                    event.preventDefault();
                    onSelectItemChange(item.id, true, { extendRange: true });
                  }
                }}
              />
            </div>
            <div className="flex items-start gap-3 mb-3">
              <ServiceLogo
                logoUrl={item.logo_url}
                name={item.name}
                size="md"
                itemType={item.item_type}
                categoryName={categoryDisplay.name}
                categoryColor={categoryDisplay.color}
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
                    {categoryDisplay.name}
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
                onOpenChange={onActionsMenuOpenChange}
              />
            </div>

            {item.status !== 'active' && (
              <div className="mb-3">
                <ItemListStatusPill item={item} />
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
