import { useEffect, useState } from 'react';
import { getToday, msUntilNextLocalMidnight } from '@/utils/dates';

/**
 * Local calendar day, refreshed at midnight and when the window wakes.
 * Sleep/wake can skip a timeout, so visibility/focus also recompute.
 */
export function useToday(): Date {
  const [today, setToday] = useState(getToday);

  useEffect(() => {
    let timeoutId = 0;

    const applyToday = () => {
      setToday((current) => {
        const next = getToday();
        return current.getTime() === next.getTime() ? current : next;
      });
    };

    const schedule = () => {
      timeoutId = window.setTimeout(() => {
        applyToday();
        schedule();
      }, msUntilNextLocalMidnight());
    };

    const onResume = () => {
      applyToday();
      window.clearTimeout(timeoutId);
      schedule();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') onResume();
    };

    schedule();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onResume);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onResume);
    };
  }, []);

  return today;
}
