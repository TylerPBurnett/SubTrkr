import { Check, Filter } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import SegmentedControl from '@/components/ui/SegmentedControl';
import type { Category, ItemType } from '@/types';
import { UNCATEGORIZED_FILTER_ID, type OccurrenceFilters } from '@/utils/occurrences';

interface CalendarFilterBarProps {
  categories: Category[];
  filters: OccurrenceFilters;
  onChange: (filters: OccurrenceFilters) => void;
}

type TypeTab = ItemType | 'all';

const TYPE_TABS: Array<{ id: TypeTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'bill', label: 'Bills' },
  { id: 'subscription', label: 'Subs' },
];

const TYPE_LABELS: Record<string, string> = {
  subscription: 'Subscriptions',
  bill: 'Bills',
};

/**
 * Every filter defaults to "on", so a control that highlights what is selected
 * is fully lit at rest and says nothing. These describe what has been narrowed
 * away instead, which stays empty until the user actually filters something.
 */
export function describeCalendarFilters(
  filters: OccurrenceFilters,
  categories: Category[],
): string[] {
  const parts: string[] = [];

  if (filters.itemType && filters.itemType !== 'all') {
    parts.push(TYPE_LABELS[filters.itemType] ?? filters.itemType);
  }

  if (filters.categoryIds) {
    const total = categories.length + 1; // + uncategorized
    const count = filters.categoryIds.length;
    parts.push(count === 1 ? '1 category' : `${count} of ${total} categories`);
  }

  if (filters.includePaused === false) parts.push('no paused');
  if (filters.includeCancelled === false) parts.push('no cancelled');
  if (filters.includeArchived === true) parts.push('with archived');

  return parts;
}

/**
 * A macOS-style menu row: a checkmark in a fixed gutter, the whole row as the
 * hit target. No checkbox square — the context already says it is clickable.
 */
function CheckRow({
  checked,
  label,
  onToggle,
  swatch,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
  swatch?: string;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={onToggle}
      className="w-full flex items-center gap-1.5 px-2.5 py-1 text-left transition-colors"
      onMouseEnter={(event) => {
        event.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent';
      }}
    >
      <span
        aria-hidden="true"
        className="flex items-center shrink-0"
        style={{ width: 16, color: 'var(--brand-text)' }}
      >
        {checked && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
      </span>
      {swatch && (
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: swatch,
            flexShrink: 0,
            marginRight: 2,
          }}
        />
      )}
      <span
        className="truncate"
        style={{
          fontSize: 12.5,
          color: checked ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}
      >
        {label}
      </span>
    </button>
  );
}

export default function CalendarFilterBar({
  categories,
  filters,
  onChange,
}: CalendarFilterBarProps) {
  const selected = filters.categoryIds;

  // Counts narrowed GROUPS, not individual boxes, so deselecting six
  // categories reads as 1 rather than climbing to 6. The full detail lives
  // beside the range title.
  const activeCount = describeCalendarFilters(filters, categories).length;
  const isFiltered = activeCount > 0;

  const everyCategoryId = [
    ...categories.map((category) => category.id),
    UNCATEGORIZED_FILTER_ID,
  ];

  const toggleCategory = (id: string) => {
    const current = selected ?? everyCategoryId;
    const next = current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id];

    onChange({
      ...filters,
      categoryIds: next.length === everyCategoryId.length ? null : next,
    });
  };

  const isCategoryChecked = (id: string) => !selected || selected.includes(id);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            isFiltered
              ? `Filter — ${describeCalendarFilters(filters, categories).join(', ')}`
              : 'Filter'
          }
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors"
          style={{
            border: `1px solid ${isFiltered ? 'var(--brand-primary)' : 'var(--border-default)'}`,
            background: isFiltered ? 'var(--brand-primary-light)' : 'transparent',
            color: isFiltered ? 'var(--brand-text)' : 'var(--text-secondary)',
          }}
        >
          <Filter className="w-3.5 h-3.5" />
          {isFiltered && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-56 p-0 overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div className="p-2">
          <SegmentedControl
            tabs={TYPE_TABS}
            activeTab={(filters.itemType ?? 'all') as TypeTab}
            onTabChange={(id) => onChange({ ...filters, itemType: id })}
          />
        </div>

        <div
          className="py-1 overflow-y-auto"
          style={{ borderTop: '1px solid var(--border-default)', maxHeight: 176 }}
        >
          {categories.map((category) => (
            <CheckRow
              key={category.id}
              label={category.name}
              swatch={category.color}
              checked={isCategoryChecked(category.id)}
              onToggle={() => toggleCategory(category.id)}
            />
          ))}
          <CheckRow
            label="Uncategorized"
            checked={isCategoryChecked(UNCATEGORIZED_FILTER_ID)}
            onToggle={() => toggleCategory(UNCATEGORIZED_FILTER_ID)}
          />
        </div>

        <div className="py-1" style={{ borderTop: '1px solid var(--border-default)' }}>
          <CheckRow
            label="Paused"
            checked={filters.includePaused !== false}
            onToggle={() =>
              onChange({ ...filters, includePaused: filters.includePaused === false })
            }
          />
          <CheckRow
            label="Cancelled"
            checked={filters.includeCancelled !== false}
            onToggle={() =>
              onChange({
                ...filters,
                includeCancelled: filters.includeCancelled === false,
              })
            }
          />
          <CheckRow
            label="Archived"
            checked={filters.includeArchived === true}
            onToggle={() =>
              onChange({ ...filters, includeArchived: filters.includeArchived !== true })
            }
          />
        </div>

        {isFiltered && (
          <div className="py-1" style={{ borderTop: '1px solid var(--border-default)' }}>
            <button
              type="button"
              onClick={() => onChange({})}
              className="w-full flex items-center gap-1.5 px-2.5 py-1 text-left transition-colors"
              onMouseEnter={(event) => {
                event.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = 'transparent';
              }}
            >
              <span aria-hidden="true" style={{ width: 16, flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                Clear filters
              </span>
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
