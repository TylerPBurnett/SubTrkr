import { useEffect, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  clampSidebarWidth,
  SIDEBAR_AUTO_COLLAPSE_BREAKPOINT,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAC_COLLAPSED_WIDTH,
  SIDEBAR_MAC_SEAM_TOGGLE_TOP,
  SIDEBAR_SEAM_TOGGLE_TOP,
} from '../constants';

export function useSidebarLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage<boolean>(
    'subtrkr-sidebar-collapsed',
    false,
  );
  const [sidebarWidth, setSidebarWidth] = useLocalStorage<number>(
    'subtrkr-sidebar-width',
    SIDEBAR_DEFAULT_WIDTH,
  );
  const [sidebarResizing, setSidebarResizing] = useState(false);
  const [windowNarrow, setWindowNarrow] = useState(
    () => window.innerWidth < SIDEBAR_AUTO_COLLAPSE_BREAKPOINT,
  );
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(
    clampSidebarWidth(sidebarWidth),
  );
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const isCollapsed = sidebarCollapsed || windowNarrow;
  const collapsedSidebarWidth = isMac
    ? SIDEBAR_MAC_COLLAPSED_WIDTH
    : SIDEBAR_COLLAPSED_WIDTH;
  const sidebarToggleTop = isMac
    ? SIDEBAR_MAC_SEAM_TOGGLE_TOP
    : SIDEBAR_SEAM_TOGGLE_TOP;
  const resolvedSidebarWidth = isCollapsed
    ? collapsedSidebarWidth
    : clampSidebarWidth(sidebarWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowNarrow(window.innerWidth < SIDEBAR_AUTO_COLLAPSE_BREAKPOINT);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const clampedWidth = clampSidebarWidth(sidebarWidth);
    if (sidebarWidth !== clampedWidth) {
      setSidebarWidth(clampedWidth);
    }
  }, [sidebarWidth, setSidebarWidth]);

  useEffect(() => {
    if (!sidebarResizing) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const nextWidth = clampSidebarWidth(
        resizeStartWidth + (event.clientX - resizeStartX),
      );

      setSidebarWidth((current) => (current === nextWidth ? current : nextWidth));
    };

    const stopResizing = () => setSidebarResizing(false);

    document.body.classList.add('sidebar-resizing');
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResizing);
    window.addEventListener('pointercancel', stopResizing);
    window.addEventListener('blur', stopResizing);

    return () => {
      document.body.classList.remove('sidebar-resizing');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResizing);
      window.removeEventListener('pointercancel', stopResizing);
      window.removeEventListener('blur', stopResizing);
    };
  }, [resizeStartWidth, resizeStartX, setSidebarWidth, sidebarResizing]);

  useEffect(() => {
    if (windowNarrow && sidebarResizing) {
      setSidebarResizing(false);
    }
  }, [windowNarrow, sidebarResizing]);

  return {
    isCollapsed,
    windowNarrow,
    resolvedSidebarWidth,
    sidebarResizing,
    sidebarToggleTop,
    toggleSidebarCollapsed: () => {
      setSidebarCollapsed((prev) => !prev);
    },
    handleSidebarResizePointerDown: (
      event: ReactPointerEvent<HTMLButtonElement>,
    ) => {
      if (windowNarrow || isCollapsed) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setResizeStartX(event.clientX);
      setResizeStartWidth(clampSidebarWidth(sidebarWidth));
      setSidebarResizing(true);
    },
  };
}
