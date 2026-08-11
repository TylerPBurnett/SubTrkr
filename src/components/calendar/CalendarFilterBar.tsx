import { Filter } from 'lucide-react';
import {
  FILTER_POPOVER_CLASS,
  FILTER_POPOVER_SURFACE,
  FilterActionRow,
  FilterCheckRow,
  FilterCountBadge,
  FilterScrollArea,
  FilterSection,
} from '@/components/ui/FilterMenu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import SegmentedControl from '@/components/ui/SegmentedControl';
import type { Category, ItemType } from '@/types';
import {
  allCategoriesState,
  describeCategorySelection,
  everySelectableCategoryId,
  isCategorySelected,
  onlyCategory,
  toggleAllCategories,
  toggleCategory,
} from '@/utils/categorySelection';
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

  const categoryPart = describeCategorySelection(
    filters.categoryIds ?? null,
    everySelectableCategoryId(categories),
  );
  if (categoryPart) parts.push(categoryPart);

  if (filters.includePaused === false) parts.push('no paused');
  if (filters.includeCancelled === false) parts.push('no cancelled');
  if (filters.includeArchived === true) parts.push('with archived');

  return parts;
}

export default function CalendarFilterBar({
  categories,
  filters,
  onChange,
}: CalendarFilterBarProps) {
  const selected = filters.categoryIds ?? null;
  const summary = describeCalendarFilters(filters, categories);
  const isFiltered = summary.length > 0;

  const everyId = everySelectableCategoryId(categories);
  const allState = allCategoriesState(selected, everyId);

  const setCategories = (categoryIds: string[] | null) =>
    onChange({ ...filters, categoryIds });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={isFiltered ? `Filter — ${summary.join(', ')}` : 'Filter'}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors"
          style={{
            border: `1px solid ${isFiltered ? 'var(--brand-primary)' : 'var(--border-default)'}`,
            background: isFiltered ? 'var(--brand-primary-light)' : 'transparent',
            color: isFiltered ? 'var(--brand-text)' : 'var(--text-secondary)',
          }}
        >
          <Filter className="w-3.5 h-3.5" />
          <FilterCountBadge count={summary.length} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className={FILTER_POPOVER_CLASS}
        style={FILTER_POPOVER_SURFACE}
      >
        <FilterSection label="Type" divider={false}>
          <div className="px-2 py-1">
            <SegmentedControl
              tabs={TYPE_TABS}
              activeTab={(filters.itemType ?? 'all') as TypeTab}
              onTabChange={(id) => onChange({ ...filters, itemType: id })}
            />
          </div>
        </FilterSection>

        <FilterSection label="Categories">
          <FilterCheckRow
            label="All Categories"
            checked={allState === 'all'}
            indeterminate={allState === 'partial'}
            onToggle={() => setCategories(toggleAllCategories(selected, everyId))}
          />
          <FilterScrollArea>
            {categories.map((category) => (
              <FilterCheckRow
                key={category.id}
                label={category.name}
                swatch={category.color}
                checked={isCategorySelected(selected, category.id)}
                onToggle={() =>
                  setCategories(toggleCategory(selected, category.id, everyId))
                }
                onOnly={() => setCategories(onlyCategory(category.id, everyId))}
              />
            ))}
            <FilterCheckRow
              label="Uncategorized"
              checked={isCategorySelected(selected, UNCATEGORIZED_FILTER_ID)}
              onToggle={() =>
                setCategories(toggleCategory(selected, UNCATEGORIZED_FILTER_ID, everyId))
              }
              onOnly={() => setCategories(onlyCategory(UNCATEGORIZED_FILTER_ID, everyId))}
            />
          </FilterScrollArea>
        </FilterSection>

        <FilterSection label="Lifecycle">
          <FilterCheckRow
            label="Paused"
            checked={filters.includePaused !== false}
            onToggle={() =>
              onChange({ ...filters, includePaused: filters.includePaused === false })
            }
          />
          <FilterCheckRow
            label="Cancelled"
            checked={filters.includeCancelled !== false}
            onToggle={() =>
              onChange({
                ...filters,
                includeCancelled: filters.includeCancelled === false,
              })
            }
          />
          <FilterCheckRow
            label="Archived"
            checked={filters.includeArchived === true}
            onToggle={() =>
              onChange({ ...filters, includeArchived: filters.includeArchived !== true })
            }
          />
        </FilterSection>

        {isFiltered && (
          <FilterSection>
            <FilterActionRow label="Clear filters" onClick={() => onChange({})} />
          </FilterSection>
        )}
      </PopoverContent>
    </Popover>
  );
}
