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
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Decorative background */}
      <div className="relative mb-6">
        <div 
          className="absolute inset-0 rounded-full blur-2xl scale-150" 
          style={{ backgroundColor: 'var(--brand-muted)' }}
        />
        <div 
          className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--brand-muted)' }}
        >
          <Icon className="w-10 h-10" style={{ color: 'var(--brand-primary)' }} />
        </div>
      </div>

      {/* Text */}
      <h3 className="text-xl font-semibold mb-2 text-center" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="text-center max-w-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </p>

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary px-6 py-2.5 rounded-xl font-medium transition-all duration-200"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
