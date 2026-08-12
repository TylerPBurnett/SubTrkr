import { formatShortDate } from '@/utils/dates';
import type { ItemWithCategory } from '@/types';

interface ItemListStatusPillProps {
  item: ItemWithCategory;
}

export function ItemListStatusPill({ item }: ItemListStatusPillProps) {
  const statusMeta = (() => {
    switch (item.status) {
      case 'trial':
        return {
          label: 'Trial',
          date: null,
          background: 'var(--accent-blue-muted)',
          color: 'var(--accent-blue-text)',
        };
      case 'paused':
        return {
          label: 'Paused',
          date: item.paused_until ? formatShortDate(item.paused_until) : null,
          background: 'var(--accent-amber-muted)',
          color: 'var(--accent-amber-text)',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          date: item.cancellation_date
            ? formatShortDate(item.cancellation_date)
            : null,
          background: 'var(--accent-red-muted)',
          color: 'var(--accent-red-text)',
        };
      case 'archived':
        return {
          label: 'Archived',
          date: null,
          background: 'var(--bg-hover)',
          color: 'var(--text-muted)',
        };
      default:
        return {
          label: 'Active',
          date: null,
          background: 'var(--brand-primary-light)',
          color: 'var(--brand-text)',
        };
    }
  })();

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-mono"
      style={{
        backgroundColor: statusMeta.background,
        color: statusMeta.color,
        letterSpacing: '0.02em',
      }}
    >
      {statusMeta.label}
      {statusMeta.date ? <span className="opacity-80">· {statusMeta.date}</span> : null}
    </span>
  );
}
