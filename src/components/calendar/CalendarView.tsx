import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, PanelRight } from 'lucide-react';
import { addDays } from 'date-fns';
import SegmentedControl from '@/components/ui/SegmentedControl';
import type { Category, ItemWithCategory } from '@/types';
import { createCategoryLookup } from '@/utils/categories';
import { formatISODate, getToday } from '@/utils/dates';
import { groupByDay, projectOccurrences, type OccurrenceFilters } from '@/utils/occurrences';
import {
  buildGridDays,
  formatRangeTitle,
  getCalendarRange,
  shiftAnchor,
  type CalendarLens,
} from './calendarRange';
import CalendarFilterBar from './CalendarFilterBar';
import CashFlowStrip from './CashFlowStrip';
import DayInspector from './DayInspector';
import MonthGrid from './MonthGrid';
import { useCalendarNavigation } from './useCalendarNavigation';
import WeekGrid from './WeekGrid';
import YearGrid from './YearGrid';

interface CalendarViewProps {
  items: ItemWithCategory[];
  categories: Category[];
  onEdit: (item: ItemWithCategory) => void;
  /** True while any App-level modal is open; keyboard nav goes quiet. */
  isModalOpen: boolean;
}

const LENS_TABS: Array<{ id: CalendarLens; label: string }> = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

export default function CalendarView({
  items,
  categories,
  onEdit,
  isModalOpen,
}: CalendarViewProps) {
  const [lens, setLens] = useState<CalendarLens>('month');
  const [anchor, setAnchor] = useState<Date>(() => getToday());
  const [selectedDate, setSelectedDate] = useState<Date>(() => getToday());
  const [filters, setFilters] = useState<OccurrenceFilters>({});
  // False until the user deliberately moves the selection (arrow keys,
  // clicking a day, "today", or paging). Landing on the Calendar view, or
  // just switching lens/filters, must not steal focus into the grid.
  const [hasNavigated, setHasNavigated] = useState(false);

  const range = useMemo(() => getCalendarRange(lens, anchor), [lens, anchor]);
  const gridDays = useMemo(
    () => buildGridDays(range.gridStart, range.gridEnd),
    [range.gridStart, range.gridEnd],
  );
  const categoryLookup = useMemo(() => createCategoryLookup(categories), [categories]);

  // Projected over the GRID bounds so padded adjacent-month days render
  // their icons. Headline totals filter back to the range bounds.
  const occurrences = useMemo(
    () => projectOccurrences(items, range.gridStart, range.gridEnd, filters),
    [items, range.gridStart, range.gridEnd, filters],
  );
  const occurrencesByDay = useMemo(() => groupByDay(occurrences), [occurrences]);

  const [railOpen, setRailOpen] = useState(true);
  const [railFits, setRailFits] = useState(() => window.innerWidth >= 1024);

  useEffect(() => {
    const onResize = () => setRailFits(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const showRail = railOpen && railFits;

  // "August" means August, so headline totals use the range bounds even
  // though the engine ran over the padded grid.
  const rangeOccurrences = useMemo(
    () =>
      occurrences.filter(
        (occurrence) =>
          occurrence.date >= range.rangeStart && occurrence.date <= range.rangeEnd,
      ),
    [occurrences, range.rangeStart, range.rangeEnd],
  );

  const selectedOccurrences = useMemo(
    () => occurrencesByDay.get(formatISODate(selectedDate)) ?? [],
    [occurrencesByDay, selectedDate],
  );

  const upcoming = useMemo(() => {
    const today = getToday();
    return projectOccurrences(items, today, addDays(today, 90), filters).slice(0, 5);
  }, [items, filters]);

  // Stable across renders so DayCell's React.memo actually holds — an
  // inline arrow here would hand all 42 cells a fresh prop every render.
  const selectDate = useCallback(
    (date: Date) => {
      setHasNavigated(true);
      setSelectedDate(date);
      // Selecting outside the visible range pages the view and keeps the
      // selection, so arrow keys walk off the edge naturally.
      if (date < range.rangeStart || date > range.rangeEnd) setAnchor(date);
    },
    [range.rangeStart, range.rangeEnd],
  );

  useCalendarNavigation({
    enabled: !isModalOpen,
    lens,
    selectedDate,
    onSelectDate: selectDate,
    onLensChange: setLens,
    onPage: (direction) => {
      setHasNavigated(true);
      setAnchor((current) => shiftAnchor(lens, current, direction));
    },
    onToday: () => {
      setHasNavigated(true);
      const today = getToday();
      setAnchor(today);
      setSelectedDate(today);
    },
    onToggleRail: () => setRailOpen((open) => !open),
    onOpenSelected: () => {
      const first = selectedOccurrences[0];
      if (first) onEdit(first.item);
    },
  });

  const renderLens = () => {
    if (lens === 'year') {
      return (
        <YearGrid
          year={anchor.getFullYear()}
          occurrencesByDay={occurrencesByDay}
          onSelectMonth={(date) => {
            setAnchor(date);
            setLens('month');
          }}
          onSelectDay={(date) => {
            setAnchor(date);
            setSelectedDate(date);
            setLens('month');
          }}
        />
      );
    }

    if (lens === 'week') {
      return (
        <WeekGrid
          gridDays={gridDays}
          occurrencesByDay={occurrencesByDay}
          selectedDate={selectedDate}
          onSelect={selectDate}
          onEdit={onEdit}
        />
      );
    }

    return (
      <div className="flex flex-col gap-2">
        <MonthGrid
          gridDays={gridDays}
          occurrencesByDay={occurrencesByDay}
          categoryLookup={categoryLookup}
          rangeStart={range.rangeStart}
          rangeEnd={range.rangeEnd}
          selectedDate={selectedDate}
          focusedDate={selectedDate}
          onSelect={selectDate}
          shouldFocus={hasNavigated}
        />
        <CashFlowStrip gridDays={gridDays} occurrencesByDay={occurrencesByDay} />
      </div>
    );
  };

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

          {railFits && (
            <button
              type="button"
              aria-label={showRail ? 'Hide details' : 'Show details'}
              aria-pressed={showRail}
              className="nav-item rounded-lg p-1.5"
              onClick={() => setRailOpen((open) => !open)}
            >
              <PanelRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <CalendarFilterBar
        categories={categories}
        filters={filters}
        onChange={setFilters}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showRail ? 'minmax(0, 1fr) 280px' : 'minmax(0, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {renderLens()}

        {showRail && (
          <DayInspector
            selectedDate={selectedDate}
            selectedOccurrences={selectedOccurrences}
            rangeOccurrences={rangeOccurrences}
            upcoming={upcoming}
            onEdit={onEdit}
          />
        )}
      </div>
    </div>
  );
}
