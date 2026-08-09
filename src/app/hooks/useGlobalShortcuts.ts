import { useEffect, useRef } from 'react';
import type { ItemType } from '@/types';
import type { View } from '../types';

interface UseGlobalShortcutsOptions {
  enabled: boolean;
  showForm: boolean;
  hasStatusChangeDialog: boolean;
  windowNarrow: boolean;
  onAddNew: (itemType: ItemType) => void;
  onNavigateView: (view: View) => void;
  onToggleSidebar: () => void;
}

export function useGlobalShortcuts({
  enabled,
  showForm,
  hasStatusChangeDialog,
  windowNarrow,
  onAddNew,
  onNavigateView,
  onToggleSidebar,
}: UseGlobalShortcutsOptions) {
  const showFormRef = useRef(showForm);
  const hasStatusChangeDialogRef = useRef(hasStatusChangeDialog);
  const windowNarrowRef = useRef(windowNarrow);
  const onAddNewRef = useRef(onAddNew);
  const onNavigateViewRef = useRef(onNavigateView);
  const onToggleSidebarRef = useRef(onToggleSidebar);

  showFormRef.current = showForm;
  hasStatusChangeDialogRef.current = hasStatusChangeDialog;
  windowNarrowRef.current = windowNarrow;
  onAddNewRef.current = onAddNew;
  onNavigateViewRef.current = onNavigateView;
  onToggleSidebarRef.current = onToggleSidebar;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      const target = event.target as HTMLElement;
      const inInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Escape is owned by the Radix dialogs themselves so that only the
      // topmost layer closes and the close callback fires exactly once.

      if (mod && event.key === 'n') {
        if (showFormRef.current || hasStatusChangeDialogRef.current) {
          return;
        }
        event.preventDefault();
        onAddNewRef.current('subscription');
        return;
      }

      if (mod && event.key === 'b' && !inInput) {
        if (showFormRef.current || hasStatusChangeDialogRef.current) {
          return;
        }
        event.preventDefault();
        onAddNewRef.current('bill');
        return;
      }

      if (mod && event.key >= '1' && event.key <= '6') {
        event.preventDefault();
        const views: View[] = [
          'dashboard',
          'calendar',
          'subscriptions',
          'bills',
          'analytics',
          'settings',
        ];
        const index = parseInt(event.key, 10) - 1;
        if (index < views.length) {
          onNavigateViewRef.current(views[index]);
        }
        return;
      }

      if (mod && event.key === '\\') {
        event.preventDefault();
        if (!windowNarrowRef.current) {
          onToggleSidebarRef.current();
        }
        return;
      }

      if (event.key === '/' && !inInput) {
        event.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="text"][placeholder*="Search"]',
        );
        searchInput?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
