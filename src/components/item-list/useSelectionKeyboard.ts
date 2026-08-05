import { useEffect } from 'react';

interface UseSelectionKeyboardOptions {
  /** false while a modal is open; non-modal overlays rely on the defaultPrevented check */
  enabled: boolean;
  hasSelection: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onDelete: () => void;
}

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;

  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

export function useSelectionKeyboard({
  enabled,
  hasSelection,
  onSelectAll,
  onClear,
  onDelete,
}: UseSelectionKeyboardOptions) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextEntry(event.target)) {
        return;
      }

      if (event.defaultPrevented) {
        return;
      }

      const isModified = event.metaKey || event.ctrlKey;

      if (isModified && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        onSelectAll();
        return;
      }

      if (!hasSelection) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onClear();
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        onDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, hasSelection, onClear, onDelete, onSelectAll]);
}
