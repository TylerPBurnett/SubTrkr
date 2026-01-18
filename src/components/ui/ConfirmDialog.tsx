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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div 
        className="relative w-full max-w-md rounded-2xl shadow-xl animate-in zoom-in-95 fade-in duration-200"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
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
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            {message}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="btn-secondary flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 text-white rounded-xl font-medium shadow-lg transition-all hover:opacity-90"
              style={{ backgroundColor: styles.buttonBg }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
