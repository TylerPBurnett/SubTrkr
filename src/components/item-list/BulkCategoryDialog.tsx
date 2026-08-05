import { useRef, useState } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { X } from 'lucide-react';
import type { Category } from '@/types';

interface BulkCategoryDialogProps {
  isOpen: boolean;
  categories: Category[];
  itemCount: number;
  onConfirm: (categoryId: string | null) => Promise<void>;
  onCancel: () => void;
}

/**
 * Category picker for the bulk-select HUD. `ConfirmDialog` doesn't accept
 * children, so this builds its own Radix AlertDialog shell — same portal
 * layer, surface color, and rounded/padding rhythm as ConfirmDialog, with a
 * scrollable list of categories in place of a plain message.
 *
 * `selectedId` starts as `undefined` ("nothing chosen") rather than `null`
 * ("explicitly clear the category") so Apply can't fire before the user
 * picks something.
 */
export function BulkCategoryDialog({
  isOpen,
  categories,
  itemCount,
  onConfirm,
  onCancel,
}: BulkCategoryDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null | undefined>(
    undefined,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Mirrors the ref latch in ItemList's handleBulkDeleteConfirm: the ref
  // flips synchronously so a second click can't slip through in the window
  // before React re-renders the disabled button. The state exists only to
  // drive that re-render (busy label, disabled attributes).
  const inFlight = useRef(false);

  if (!isOpen) {
    return null;
  }

  const itemLabel = itemCount === 1 ? 'item' : 'items';

  const handleConfirm = async () => {
    if (inFlight.current || selectedId === undefined) {
      return;
    }

    inFlight.current = true;
    setIsSubmitting(true);

    try {
      await onConfirm(selectedId);
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) {
      return;
    }

    onCancel();
  };

  return (
    <AlertDialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) handleCancel();
      }}
    >
      <AlertDialog.Portal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <AlertDialog.Overlay
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => {
              if (!isSubmitting) handleCancel();
            }}
          />

          <AlertDialog.Content
            aria-modal="true"
            className="relative w-full max-w-md rounded-2xl shadow-xl animate-in zoom-in-95 fade-in duration-200"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              aria-label="Close dialog"
              className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed interactive-hover-bg"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6">
              <AlertDialog.Title asChild>
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Change category for {itemCount} {itemLabel}
                </h3>
              </AlertDialog.Title>
              <AlertDialog.Description
                className="mb-4 text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Pick the category to apply to every selected item.
              </AlertDialog.Description>

              <div className="max-h-64 overflow-y-auto flex flex-col gap-1 mb-6">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  disabled={isSubmitting}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors interactive-hover-bg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor:
                      selectedId === null ? 'var(--bg-active)' : 'transparent',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: 'var(--accent-gray)' }}
                  />
                  No category
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedId(category.id)}
                    disabled={isSubmitting}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors interactive-hover-bg disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor:
                        selectedId === category.id
                          ? 'var(--bg-active)'
                          : 'transparent',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <AlertDialog.Cancel asChild>
                  <button
                    disabled={isSubmitting}
                    className="btn-secondary flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </AlertDialog.Cancel>
                <button
                  onClick={handleConfirm}
                  disabled={isSubmitting || selectedId === undefined}
                  aria-busy={isSubmitting}
                  className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium shadow-lg transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:hover:opacity-100 disabled:opacity-50 ${
                    isSubmitting ? 'animate-pulse' : ''
                  }`}
                  style={{
                    backgroundColor: 'var(--brand-primary)',
                    opacity: isSubmitting ? 0.7 : undefined,
                  }}
                >
                  {isSubmitting ? 'Applying...' : 'Apply'}
                </button>
              </div>
            </div>
          </AlertDialog.Content>
        </div>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
