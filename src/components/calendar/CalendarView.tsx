import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SegmentedControl from '@/components/ui/SegmentedControl';
import type { Category, ItemWithCategory } from '@/types';
import { createCategoryLookup } from '@/utils/categories';
import { getToday } from '@/utils/dates';
import { groupByDay, projectOccurrences } from '@/utils/occurrences';
import {
  buildGridDays,
  formatRangeTitle,
  getCalendarRange,
  shiftAnchor,
  type CalendarLens,
} from './calendarRange';
import MonthGrid from './MonthGrid';

interface CalendarViewProps {
  items: ItemWithCategory[];
  categories: Category[];
  onEdit: (item: ItemWithCategory) => void;
}

const LENS_TABS: Array<{ id: CalendarLens; label: string }> = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

export default function CalendarView({ items, categories }: CalendarViewProps) {
  const [lens, setLens] = useState<CalendarLens>('month');
  const [anchor, setAnchor] = useState<Date>(() => getToday());
  const [selectedDate, setSelectedDate] = useState<Date>(() => getToday());

  const range = useMemo(() => getCalendarRange(lens, anchor), [lens, anchor]);
  const gridDays = useMemo(
    () => buildGridDays(range.gridStart, range.gridEnd),
    [range.gridStart, range.gridEnd],
  );
  const categoryLookup = useMemo(() => createCategoryLookup(categories), [categories]);

  // Projected over the GRID bounds so padded adjacent-month days render
  // their icons. Headline totals filter back to the range bounds.
  const occurrences = useMemo(
    () => projectOccurrences(items, range.gridStart, range.gridEnd),
    [items, range.gridStart, range.gridEnd],
  );
  const occurrencesByDay = useMemo(() => groupByDay(occurrences), [occurrences]);

  const renderLens = () => (
    <MonthGrid
      gridDays={gridDays}
      occurrencesByDay={occurrencesByDay}
      categoryLookup={categoryLookup}
      rangeStart={range.rangeStart}
      rangeEnd={range.rangeEnd}
      selectedDate={selectedDate}
      focusedDate={selectedDate}
      onSelect={setSelectedDate}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {formatRangeTitle(lens, anchor)}
        </h3>

        <div className="flex items-center gap-2">
          <SegmentedControl tabs={LENS_TABS} activeTab={lens} onTabChange={setLens} />

          <button
            type="button"
            aria-label="Previous"
            className="nav-item rounded-lg p-1.5"
            onClick={() => setAnchor((current) => shiftAnchor(lens, current, -1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="nav-item rounded-lg px-2.5 py-1.5 text-sm"
            onClick={() => {
              const today = getToday();
              setAnchor(today);
              setSelectedDate(today);
            }}
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next"
            className="nav-item rounded-lg p-1.5"
            onClick={() => setAnchor((current) => shiftAnchor(lens, current, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {renderLens()}
    </div>
  );
}
