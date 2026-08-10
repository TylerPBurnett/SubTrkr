import { Filter, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Category, ItemType } from '@/types';
import { UNCATEGORIZED_FILTER_ID, type OccurrenceFilters } from '@/utils/occurrences';

interface CalendarFilterBarProps {
  categories: Category[];
  filters: OccurrenceFilters;
  onChange: (filters: OccurrenceFilters) => void;
}

const TYPES: Array<{ id: ItemType | 'all'; label: string }> = [
  { id: 'all', label: 'All items' },
  { id: 'subscription', label: 'Subscriptions' },
  { id: 'bill', label: 'Bills' },
];

const TYPE_LABELS: Record<string, string> = {
  subscription: 'Subscriptions',
  bill: 'Bills',
};

/**
 * Every filter defaults to "on", so a control that highlights what is selected
 * is fully lit at rest and says nothing. These describe what has been narrowed
 * away instead, which is empty until the user actually filters something.
 */
function describeFilters(
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="label-wide"
      style={{ marginBottom: 8, color: 'var(--text-secondary)' }}
    >
      {children}
    </p>
  );
}

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
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className="w-full flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors"
      style={{ background: 'transparent' }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent';
      }}
    >
      <Checkbox checked={checked} tabIndex={-1} aria-hidden="true" />
      {swatch && (
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: swatch,
            flexShrink: 0,
          }}
        />
      )}
      <span
        className="truncate"
        style={{ fontSize: 13, color: 'var(--text-primary)' }}
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
  const summary = describeFilters(filters, categories);
  const isFiltered = summary.length > 0;

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

  const clearFilters = () => onChange({});

  return (
    <Popover>
      <div className="flex items-center">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={isFiltered ? `Filters: ${summary.join(', ')}` : 'Filter'}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors"
            style={{
              fontSize: 12,
              border: `1px solid ${isFiltered ? 'var(--brand-primary)' : 'var(--border-default)'}`,
              background: isFiltered ? 'var(--brand-primary-light)' : 'transparent',
              color: isFiltered ? 'var(--brand-text)' : 'var(--text-secondary)',
              borderTopRightRadius: isFiltered ? 0 : undefined,
              borderBottomRightRadius: isFiltered ? 0 : undefined,
              borderRightWidth: isFiltered ? 0 : 1,
            }}
          >
            <Filter className="w-3.5 h-3.5" />
            {isFiltered ? summary.join(' · ') : 'Filter'}
          </button>
        </PopoverTrigger>

        {isFiltered && (
          <button
            type="button"
            aria-label="Clear filters"
            onClick={clearFilters}
            className="flex items-center rounded-lg px-1.5 py-1.5 transition-colors"
            style={{
              border: '1px solid var(--brand-primary)',
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              background: 'var(--brand-primary-light)',
              color: 'var(--brand-text)',
              alignSelf: 'stretch',
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <PopoverContent
        align="end"
        className="w-64 p-0"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div className="p-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <SectionLabel>Show</SectionLabel>
          <div className="flex flex-col gap-0.5">
            {TYPES.map((type) => (
              <CheckRow
                key={type.id}
                label={type.label}
                checked={(filters.itemType ?? 'all') === type.id}
                onToggle={() => onChange({ ...filters, itemType: type.id })}
              />
            ))}
          </div>
        </div>

        <div
          className="p-3"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <SectionLabel>Categories</SectionLabel>
          <div
            className="flex flex-col gap-0.5 overflow-y-auto"
            style={{ maxHeight: 168 }}
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
        </div>

        <div className="p-3">
          <SectionLabel>Include</SectionLabel>
          <div className="flex flex-col gap-0.5">
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
            <button
              type="button"
              onClick={clearFilters}
              className="w-full mt-2 rounded-md py-1.5 transition-colors"
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
