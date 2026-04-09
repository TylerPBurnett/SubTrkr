import { useEffect, useRef } from 'react';
import type { ItemType } from '@/types';
import type { View } from '../types';

interface UseGlobalShortcutsOptions {
  enabled: boolean;
  showForm: boolean;
  hasStatusChangeDialog: boolean;
  windowNarrow: boolean;
  onCloseForm: () => void;
  onCancelStatusChange: () => void;
  onAddNew: (itemType: ItemType) => void;
  onNavigateView: (view: View) => void;
  onToggleSidebar: () => void;
}

export function useGlobalShortcuts({
  enabled,
  showForm,
  hasStatusChangeDialog,
  windowNarrow,
  onCloseForm,
  onCancelStatusChange,
  onAddNew,
  onNavigateView,
  onToggleSidebar,
}: UseGlobalShortcutsOptions) {
  const showFormRef = useRef(showForm);
  const hasStatusChangeDialogRef = useRef(hasStatusChangeDialog);
  const windowNarrowRef = useRef(windowNarrow);
  const onCloseFormRef = useRef(onCloseForm);
  const onCancelStatusChangeRef = useRef(onCancelStatusChange);
  const onAddNewRef = useRef(onAddNew);
  const onNavigateViewRef = useRef(onNavigateView);
  const onToggleSidebarRef = useRef(onToggleSidebar);

  showFormRef.current = showForm;
  hasStatusChangeDialogRef.current = hasStatusChangeDialog;
  windowNarrowRef.current = windowNarrow;
  onCloseFormRef.current = onCloseForm;
  onCancelStatusChangeRef.current = onCancelStatusChange;
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

      if (event.key === 'Escape') {
        if (showFormRef.current) {
          onCloseFormRef.current();
          event.preventDefault();
          return;
        }

        if (hasStatusChangeDialogRef.current) {
          onCancelStatusChangeRef.current();
          event.preventDefault();
          return;
        }
      }

      if (mod && event.key === 'n') {
        event.preventDefault();
        onAddNewRef.current('subscription');
        return;
      }

      if (mod && event.key === 'b' && !inInput) {
        event.preventDefault();
        onAddNewRef.current('bill');
        return;
      }

      if (mod && event.key >= '1' && event.key <= '5') {
        event.preventDefault();
        const views: View[] = [
          'dashboard',
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
