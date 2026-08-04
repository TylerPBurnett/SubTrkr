import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * Set while an async `onConfirm` is in flight: disables both buttons and
   * every dismissal path, and swaps the confirm label for a busy one. Defaults
   * to false, so callers with a synchronous `onConfirm` behave exactly as
   * before. Mirrors StatusChangeDialog's isSubmitting handling.
   */
  isSubmitting?: boolean;
  /** Busy label shown in place of `confirmLabel` while submitting. */
  submittingLabel?: string;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  isSubmitting = false,
  submittingLabel = 'Processing...',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'var(--accent-red-muted)',
          iconColor: 'var(--accent-red)',
          buttonBg: 'var(--accent-red)',
        };
      case 'warning':
        return {
          iconBg: 'var(--accent-amber-muted)',
          iconColor: 'var(--accent-amber)',
          buttonBg: 'var(--accent-amber)',
        };
      case 'info':
      default:
        return {
          iconBg: 'var(--accent-blue-muted)',
          iconColor: 'var(--accent-blue)',
          buttonBg: 'var(--accent-blue)',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <AlertDialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onCancel();
      }}
    >
      <AlertDialog.Portal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <AlertDialog.Overlay
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => {
              if (!isSubmitting) onCancel();
            }}
          />

          {/* Dialog */}
          <AlertDialog.Content
            aria-modal="true"
            className="relative w-full max-w-md rounded-2xl shadow-xl animate-in zoom-in-95 fade-in duration-200"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              aria-label="Close dialog"
              className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6">
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: styles.iconBg }}
              >
                <AlertTriangle className="w-6 h-6" style={{ color: styles.iconColor }} />
              </div>

              {/* Content */}
              <AlertDialog.Title asChild>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {title}
                </h3>
              </AlertDialog.Title>
              <AlertDialog.Description className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                {message}
              </AlertDialog.Description>

              {/* Actions */}
              <div className="flex gap-3">
                <AlertDialog.Cancel asChild>
                  <button
                    disabled={isSubmitting}
                    className="btn-secondary flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancelLabel}
                  </button>
                </AlertDialog.Cancel>
                <button
                  onClick={onConfirm}
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium shadow-lg transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:hover:opacity-100 ${
                    isSubmitting ? 'animate-pulse' : ''
                  }`}
                  style={{
                    backgroundColor: styles.buttonBg,
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? submittingLabel : confirmLabel}
                </button>
              </div>
            </div>
          </AlertDialog.Content>
        </div>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
