import { useCallback, useEffect, useRef } from 'react';

/**
 * Reports a Radix dropdown's open state upward, and — crucially — reports
 * `false` if the menu unmounts while still open.
 *
 * Row menus and the HUD overflow menu both unmount out from under an open
 * dropdown (a filter change drops the row, clearing the selection drops the
 * HUD). Radix fires no `onOpenChange` in that case, so without the unmount
 * report the listener's flag would latch on and permanently disable the
 * selection shortcuts.
 */
export function useMenuOpenReporter(onOpenChange?: (open: boolean) => void) {
  const isOpenRef = useRef(false);
  const callbackRef = useRef(onOpenChange);
  callbackRef.current = onOpenChange;

  useEffect(
    () => () => {
      if (isOpenRef.current) {
        isOpenRef.current = false;
        callbackRef.current?.(false);
      }
    },
    [],
  );

  return useCallback((open: boolean) => {
    isOpenRef.current = open;
    callbackRef.current?.(open);
  }, []);
}
