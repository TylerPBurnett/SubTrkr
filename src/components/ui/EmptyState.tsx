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
        <div className="absolute inset-0 bg-brand-500/10 rounded-full blur-2xl scale-150" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 dark:from-brand-900/40 dark:to-brand-900/20 flex items-center justify-center">
          <Icon className="w-10 h-10 text-brand-500 dark:text-brand-400" />
        </div>
      </div>

      {/* Text */}
      <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2 text-center">
        {title}
      </h3>
      <p className="text-neutral-500 dark:text-neutral-400 text-center max-w-sm mb-6">
        {description}
      </p>

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all duration-200"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
