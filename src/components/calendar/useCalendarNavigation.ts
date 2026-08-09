import { useEffect, useRef } from 'react';
import { addDays, addMonths, addWeeks } from 'date-fns';
import type { CalendarLens } from './calendarRange';

export interface UseCalendarNavigationOptions {
  enabled: boolean;
  lens: CalendarLens;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onLensChange: (lens: CalendarLens) => void;
  onPage: (direction: -1 | 1) => void;
  onToday: () => void;
  onToggleRail: () => void;
  onOpenSelected: () => void;
}

/** In year lens the vertical step is a month; elsewhere it is a week. */
function stepBy(lens: CalendarLens, date: Date, days: number, rows: number): Date {
  if (days !== 0) return addDays(date, days);
  return lens === 'year' ? addMonths(date, rows) : addWeeks(date, rows);
}

export function useCalendarNavigation(options: UseCalendarNavigationOptions): void {
  const ref = useRef(options);
  ref.current = options;

  useEffect(() => {
    if (!options.enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const current = ref.current;
      if (!current.enabled) return;

      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const mod = event.metaKey || event.ctrlKey;

      if (mod && event.key === '.') {
        event.preventDefault();
        current.onToggleRail();
        return;
      }

      // Everything below is unmodified — never swallow the app's ⌘N, ⌘B,
      // ⌘1–6, or ⌘\ shortcuts.
      if (mod || event.altKey) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          current.onSelectDate(stepBy(current.lens, current.selectedDate, -1, 0));
          return;
        case 'ArrowRight':
          event.preventDefault();
          current.onSelectDate(stepBy(current.lens, current.selectedDate, 1, 0));
          return;
        case 'ArrowUp':
          event.preventDefault();
          current.onSelectDate(stepBy(current.lens, current.selectedDate, 0, -1));
          return;
        case 'ArrowDown':
          event.preventDefault();
          current.onSelectDate(stepBy(current.lens, current.selectedDate, 0, 1));
          return;
        case '[':
          event.preventDefault();
          current.onPage(-1);
          return;
        case ']':
          event.preventDefault();
          current.onPage(1);
          return;
        case 'Enter':
          event.preventDefault();
          current.onOpenSelected();
          return;
        default:
          break;
      }

      switch (event.key.toLowerCase()) {
        case 'w':
          event.preventDefault();
          current.onLensChange('week');
          return;
        case 'm':
          event.preventDefault();
          current.onLensChange('month');
          return;
        case 'y':
          event.preventDefault();
          current.onLensChange('year');
          return;
        case 't':
          event.preventDefault();
          current.onToday();
          return;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options.enabled]);
}
