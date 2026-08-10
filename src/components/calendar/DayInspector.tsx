import { format } from 'date-fns';
import type { ItemWithCategory } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { sumOccurrences, type Occurrence } from '@/utils/occurrences';

interface DayInspectorProps {
  selectedDate: Date;
  selectedOccurrences: Occurrence[];
  rangeOccurrences: Occurrence[];
  upcoming: Occurrence[];
  onEdit: (item: ItemWithCategory) => void;
}

function OccurrenceRow({
  occurrence,
  onEdit,
  showDate = false,
}: {
  occurrence: Occurrence;
  onEdit: (item: ItemWithCategory) => void;
  showDate?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(occurrence.item)}
      className="w-full flex items-center gap-2.5 py-2 text-left"
      style={{ borderTop: '1px solid var(--border-default)' }}
    >
      <div className="min-w-0 flex-1">
        <p
          className="truncate"
          style={{ fontSize: 13, color: 'var(--text-primary)' }}
        >
          {occurrence.item.name}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          {occurrence.kind === 'trial-end'
            ? 'Trial ends'
            : showDate
              ? format(occurrence.date, 'MMM d')
              : occurrence.item.billing_cycle}
        </p>
      </div>
      {occurrence.kind === 'charge' && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: occurrence.isOverdue ? 'var(--accent-red)' : 'var(--text-primary)',
          }}
        >
          {formatCurrency(occurrence.amount, { currency: occurrence.item.currency })}
        </span>
      )}
    </button>
  );
}

export default function DayInspector({
  selectedDate,
  selectedOccurrences,
  rangeOccurrences,
  upcoming,
  onEdit,
}: DayInspectorProps) {
  // Trial-end markers ride along in `rangeOccurrences` but carry no amount —
  // counting them as "charges" overstates what's actually billed. Both
  // numbers here need to describe the same filtered set.
  const chargeOccurrences = rangeOccurrences.filter((occurrence) => occurrence.kind === 'charge');
  const remaining = chargeOccurrences.filter((occurrence) => !occurrence.isPast).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="card" style={{ padding: 14 }}>
        <p className="label-wide">Due this period</p>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 22,
            fontWeight: 650,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            marginTop: 4,
          }}
        >
          {formatCurrency(sumOccurrences(rangeOccurrences), { display: 'summary' })}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
          {chargeOccurrences.length} charges · {remaining} remaining
        </p>
      </div>

      <div className="card flex-1" style={{ padding: 14 }}>
        <p className="label-wide">
          {selectedOccurrences.length > 0
            ? format(selectedDate, 'EEE, MMM d')
            : 'Next up from today'}
        </p>

        <div style={{ marginTop: 8 }}>
          {selectedOccurrences.length > 0
            ? selectedOccurrences.map((occurrence) => (
                <OccurrenceRow key={occurrence.id} occurrence={occurrence} onEdit={onEdit} />
              ))
            : upcoming.map((occurrence) => (
                <OccurrenceRow
                  key={occurrence.id}
                  occurrence={occurrence}
                  onEdit={onEdit}
                  showDate
                />
              ))}
        </div>
      </div>
    </div>
  );
}
