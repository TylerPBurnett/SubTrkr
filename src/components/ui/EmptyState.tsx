import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  preview?: React.ReactNode;
  compact?: boolean;
}

export default function EmptyState({ icon: Icon, title, description, action, preview, compact = false }: EmptyStateProps) {
  const iconSize = compact ? 'w-10 h-10' : preview ? 'w-12 h-12' : 'w-24 h-24';
  const innerIconSize = compact ? 'w-5 h-5' : preview ? 'w-6 h-6' : 'w-12 h-12';
  const iconRadius = compact ? 'rounded-xl' : 'rounded-2xl';
  const titleClass = compact ? 'text-base' : 'text-2xl';
  const padding = compact ? 'py-6 px-4' : 'py-16 px-4';
  const iconMargin = compact ? 'mb-3' : 'mb-6';

  return (
    <div className={`empty-state-enter flex flex-col items-center justify-center ${padding}`}>
      {/* Icon with gradient */}
      <div className={`relative ${iconMargin}`}>
        {!compact && (
          <div
            className="absolute inset-0 rounded-full blur-2xl scale-150"
            style={{
              background: 'radial-gradient(circle, var(--brand-primary) 0%, transparent 70%)',
              opacity: 0.15,
            }}
          />
        )}
        <div
          className={`relative ${iconSize} ${iconRadius} flex items-center justify-center`}
          style={{
            background: 'linear-gradient(135deg, var(--brand-primary) 0%, #16a34a 100%)',
            boxShadow: compact ? undefined : '0 4px 14px -3px rgba(34, 197, 94, 0.35)',
          }}
        >
          <Icon className={`${innerIconSize} text-white`} />
        </div>
      </div>

      {/* Text */}
      <h3
        className={`${titleClass} mb-1 text-center`}
        style={{ color: 'var(--text-primary)', fontWeight: compact ? 700 : 800 }}
      >
        {title}
      </h3>
      <p
        className={`text-center max-w-sm ${compact ? 'text-sm mb-4' : 'mb-6'}`}
        style={{ color: 'var(--text-secondary)' }}
      >
        {description}
      </p>

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          className={`btn-primary rounded-xl font-bold transition-all duration-200 ${compact ? 'px-4 py-2 text-sm' : 'px-6 py-3'}`}
        >
          {action.label}
        </button>
      )}

      {/* Ghost preview */}
      {preview && (
        <div
          className={`w-full ${action ? 'mt-6' : 'mt-2'}`}
          aria-hidden="true"
          role="presentation"
          style={{ pointerEvents: 'none' }}
        >
          {preview}
        </div>
      )}
    </div>
  );
}
