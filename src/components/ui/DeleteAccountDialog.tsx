import { useEffect, useRef, useState } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { AlertTriangle, X } from 'lucide-react';

const CONFIRM_PHRASE = 'DELETE';

interface DeleteAccountDialogProps {
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteAccountDialog({
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteAccountDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Every open starts from a clean slate -- a previously typed DELETE must
  // never carry over and arm the destructive button before the user reads the
  // dialog again.
  useEffect(() => {
    if (isOpen) setConfirmText('');
  }, [isOpen]);

  if (!isOpen) return null;

  const canDelete = confirmText === CONFIRM_PHRASE && !isDeleting;

  // Closing is blocked while the request is in flight: the account may already
  // be gone by the time the dialog would disappear.
  const requestClose = () => {
    if (isDeleting) return;
    onCancel();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canDelete) return;
    onConfirm();
  };

  return (
    <AlertDialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      <AlertDialog.Portal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <AlertDialog.Overlay
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={requestClose}
          />

          {/* Dialog */}
          <AlertDialog.Content
            aria-modal="true"
            className="relative w-full max-w-md rounded-2xl shadow-xl animate-in zoom-in-95 fade-in duration-200"
            style={{ backgroundColor: 'var(--bg-surface)' }}
            onOpenAutoFocus={(event) => {
              // Radix focuses the first tabbable node, which here is the X
              // button. The confirmation field is what the user needs.
              event.preventDefault();
              inputRef.current?.focus();
            }}
          >
            {/* Close button */}
            <button
              onClick={requestClose}
              disabled={isDeleting}
              aria-label="Close dialog"
              className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: 'var(--accent-red-muted)' }}
              >
                <AlertTriangle className="w-6 h-6" style={{ color: 'var(--accent-red)' }} />
              </div>

              {/* Content */}
              <AlertDialog.Title asChild>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Delete your account?
                </h3>
              </AlertDialog.Title>
              <AlertDialog.Description className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                This permanently deletes your account and everything in it. It cannot be undone,
                and support cannot restore it.
              </AlertDialog.Description>

              <ul className="mb-5 space-y-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {[
                  'All subscriptions and bills',
                  'All categories',
                  'All status and payment history',
                  'All notification channels and preferences',
                ].map((entry) => (
                  <li key={entry} className="flex items-start gap-2">
                    <span className="shrink-0 select-none" style={{ color: 'var(--accent-red-text)' }}>
                      {'•'}
                    </span>
                    <span>{entry}</span>
                  </li>
                ))}
              </ul>

              {/* Type-to-confirm */}
              <label
                htmlFor="delete-account-confirm"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Type <span style={{ color: 'var(--accent-red-text)', fontWeight: 600 }}>{CONFIRM_PHRASE}</span> to confirm
              </label>
              <input
                id="delete-account-confirm"
                ref={inputRef}
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={isDeleting}
                placeholder={CONFIRM_PHRASE}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="input w-full px-4 py-2.5 rounded-xl mb-6 disabled:opacity-60 disabled:cursor-not-allowed"
              />

              {/* Actions */}
              <div className="flex gap-3">
                <AlertDialog.Cancel asChild>
                  <button
                    type="button"
                    disabled={isDeleting}
                    className="btn-secondary flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </AlertDialog.Cancel>
                <button
                  type="submit"
                  disabled={!canDelete}
                  className="flex-1 px-4 py-2.5 text-white rounded-xl font-medium shadow-lg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50"
                  style={{ backgroundColor: 'var(--accent-red)' }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete account'}
                </button>
              </div>
            </form>
          </AlertDialog.Content>
        </div>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
