import type { Category, ItemWithCategory } from '@/types';

interface CalendarViewProps {
  items: ItemWithCategory[];
  categories: Category[];
  onEdit: (item: ItemWithCategory) => void;
}

export default function CalendarView({ items }: CalendarViewProps) {
  return (
    <div className="card">
      <p style={{ color: 'var(--text-secondary)' }}>
        {items.length} items ready to project.
      </p>
    </div>
  );
}
