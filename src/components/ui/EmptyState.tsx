import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="zoom-in-95 flex flex-col items-center justify-center py-16 px-4">
      {/* Decorative background with gradient */}
      <div className="relative mb-6">
        <div
          className="absolute inset-0 rounded-full blur-2xl scale-150"
          style={{
            background: 'radial-gradient(circle, var(--brand-primary) 0%, transparent 70%)',
            opacity: 0.15
          }}
        />
        <div
          className="relative w-24 h-24 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, var(--brand-primary) 0%, #16a34a 100%)',
            boxShadow: '0 4px 14px -3px rgba(34, 197, 94, 0.35)'
          }}
        >
          <Icon className="w-12 h-12 text-white" />
        </div>
      </div>

      {/* Text */}
      <h3 className="text-2xl mb-2 text-center" style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
        {title}
      </h3>
      <p className="text-center max-w-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </p>

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary px-6 py-3 rounded-xl font-bold transition-all duration-200"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
