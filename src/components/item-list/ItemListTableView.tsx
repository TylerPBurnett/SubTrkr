import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import ServiceLogo from '@/components/ui/ServiceLogo';
import { formatDisplayDate, formatShortDate } from '@/utils/dates';
import { resolveItemCategoryDisplay } from '@/utils/categories';
import type { Category, ItemWithCategory, StatusChangeData } from '@/types';
import { BILLING_CYCLE_LABELS, formatCurrency, STATUS_STYLES } from './constants';
import { ItemListActionsMenu } from './ItemListActionsMenu';
import { ItemListStatusPill } from './ItemListStatusPill';

interface ItemListTableViewProps {
  allVisibleSelected: boolean;
  categoryLookup: ReadonlyMap<string, Category>;
  items: ItemWithCategory[];
  onDeleteClick: (item: ItemWithCategory) => void;
  onEdit: (item: ItemWithCategory) => void;
  onSelectAllChange: (checked: boolean | 'indeterminate') => void;
  onSelectItemChange: (itemId: string, checked: boolean | 'indeterminate') => void;
  onToggleActive: (id: string) => void;
  onStatusChange?: (itemId: string, action: StatusChangeData['action']) => void;
  onViewHistory?: (item: ItemWithCategory) => void;
  selectedItemIds: Set<string>;
  someVisibleSelected: boolean;
}

export function ItemListTableView({
  allVisibleSelected,
  categoryLookup,
  items,
  onDeleteClick,
  onEdit,
  onSelectAllChange,
  onSelectItemChange,
  onToggleActive,
  onStatusChange,
  onViewHistory,
  selectedItemIds,
  someVisibleSelected,
}: ItemListTableViewProps) {
  return (
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
                borderBottom: '1px solid var(--border-default)',
              }}
            >
              <tr>
                <th className="pl-4 pr-2 py-3">
                  <Checkbox
                    checked={
                      allVisibleSelected
                        ? true
                        : someVisibleSelected
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={onSelectAllChange}
                    aria-label="Select all"
                    onClick={(event) => event.stopPropagation()}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Renews
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Recurrence
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Cost
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const categoryDisplay = resolveItemCategoryDisplay(item, categoryLookup);
                const categoryColor = categoryDisplay.color;

                return (
                  <motion.tr
                    layout
                    key={item.id}
                    className={`stagger-item group cursor-pointer ${STATUS_STYLES[item.status]}`}
                    style={{
                      borderBottom: '1px solid var(--border-muted)',
                      filter:
                        item.status === 'cancelled' || item.status === 'archived'
                          ? 'grayscale(0.15)'
                          : undefined,
                      animationDelay: `${index * 0.03}s`,
                      transition: 'all 0.15s var(--ease-out-expo)',
                      position: 'relative',
                    }}
                    onClick={() => onEdit(item)}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      if (item.status === 'active') {
                        event.currentTarget.style.boxShadow = `inset 3px 0 0 ${categoryColor}`;
                      }
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = 'transparent';
                      event.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <td className="pl-5 pr-3 py-4" onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        checked={selectedItemIds.has(item.id)}
                        onCheckedChange={(checked) => onSelectItemChange(item.id, checked)}
                        aria-label={`Select ${item.name}`}
                        onClick={(event) => event.stopPropagation()}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3.5 min-w-[240px]">
                        <ServiceLogo
                          logoUrl={item.logo_url}
                          name={item.name}
                          size="sm"
                          itemType={item.item_type}
                          categoryName={categoryDisplay.name}
                          categoryColor={categoryDisplay.color}
                        />
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onEdit(item);
                            }}
                            className="block w-full text-left font-semibold truncate transition-all focus-visible:outline-none group-hover:translate-x-0.5"
                            style={{
                              color: 'var(--text-primary)',
                              fontSize: '0.875rem',
                              letterSpacing: '-0.01em',
                            }}
                            aria-label={`Edit ${item.name}`}
                          >
                            {item.name}
                          </button>
                          <div
                            className="flex items-center gap-1.5 mt-0.5"
                            style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{
                                backgroundColor: categoryColor,
                                boxShadow: `0 0 0 2px ${categoryColor}20`,
                              }}
                            />
                            <span className="font-medium">
                              {categoryDisplay.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      className="px-5 py-4 font-mono font-medium"
                      style={{
                        color: 'var(--text-primary)',
                        fontSize: '0.8125rem',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {formatDisplayDate(item.next_billing_date)}
                    </td>
                    <td className="px-5 py-4 font-medium" style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      {BILLING_CYCLE_LABELS[item.billing_cycle]}
                    </td>
                    <td
                      className="px-5 py-4 font-mono font-bold"
                      style={{
                        color: 'var(--text-primary)',
                        fontSize: '0.9375rem',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {formatCurrency(item.amount, item.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <ItemListStatusPill item={item} />
                        {item.status === 'trial' && item.trial_end_date ? (
                          <span className="text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                            Ends {formatShortDate(item.trial_end_date)}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <ItemListActionsMenu
                        item={item}
                        onDeleteClick={onDeleteClick}
                        onEdit={onEdit}
                        onToggleActive={onToggleActive}
                        onStatusChange={onStatusChange}
                        onViewHistory={onViewHistory}
                      />
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
