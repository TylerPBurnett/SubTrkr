import type { Category, ItemType } from '@/types';
import { UNCATEGORIZED_FILTER_ID, type OccurrenceFilters } from '@/utils/occurrences';

interface CalendarFilterBarProps {
  categories: Category[];
  filters: OccurrenceFilters;
  onChange: (filters: OccurrenceFilters) => void;
}

const TYPES: Array<{ id: ItemType | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'subscription', label: 'Subscriptions' },
  { id: 'bill', label: 'Bills' },
];

function Chip({
  active,
  label,
  onClick,
  swatch,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  swatch?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{
        fontSize: 12,
        background: active ? 'var(--brand-primary-light)' : 'var(--bg-hover)',
        color: active ? 'var(--brand-text)' : 'var(--text-secondary)',
        border: `1px solid ${active ? 'var(--brand-primary)' : 'transparent'}`,
      }}
    >
      {swatch && (
        <span
          aria-hidden="true"
          style={{ width: 7, height: 7, borderRadius: 999, background: swatch }}
        />
      )}
      {label}
    </button>
  );
}

export default function CalendarFilterBar({
  categories,
  filters,
  onChange,
}: CalendarFilterBarProps) {
  const selected = filters.categoryIds;

  const toggleCategory = (id: string) => {
    const everyId = [...categories.map((category) => category.id), UNCATEGORIZED_FILTER_ID];
    const current = selected ?? everyId;
    const next = current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id];

    onChange({ ...filters, categoryIds: next.length === everyId.length ? null : next });
  };

  const isCategoryActive = (id: string) => selected === null || selected === undefined || selected.includes(id);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TYPES.map((type) => (
        <Chip
          key={type.id}
          label={type.label}
          active={(filters.itemType ?? 'all') === type.id}
          onClick={() => onChange({ ...filters, itemType: type.id })}
        />
      ))}

      <span
        aria-hidden="true"
        style={{ width: 1, height: 18, background: 'var(--border-default)', margin: '0 4px' }}
      />

      {categories.map((category) => (
        <Chip
          key={category.id}
          label={category.name}
          swatch={category.color}
          active={isCategoryActive(category.id)}
          onClick={() => toggleCategory(category.id)}
        />
      ))}
      <Chip
        label="Uncategorized"
        active={isCategoryActive(UNCATEGORIZED_FILTER_ID)}
        onClick={() => toggleCategory(UNCATEGORIZED_FILTER_ID)}
      />

      <span
        aria-hidden="true"
        style={{ width: 1, height: 18, background: 'var(--border-default)', margin: '0 4px' }}
      />

      <Chip
        label="Paused"
        active={filters.includePaused !== false}
        onClick={() => onChange({ ...filters, includePaused: filters.includePaused === false })}
      />
      <Chip
        label="Cancelled"
        active={filters.includeCancelled !== false}
        onClick={() =>
          onChange({ ...filters, includeCancelled: filters.includeCancelled === false })
        }
      />
      <Chip
        label="Archived"
        active={filters.includeArchived === true}
        onClick={() => onChange({ ...filters, includeArchived: filters.includeArchived !== true })}
      />
    </div>
  );
}
