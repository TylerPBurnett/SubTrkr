import * as React from 'react';
import { motion } from 'framer-motion';

interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, disabled = false, className = '', ...props }, ref) => {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        ref={ref}
        onClick={() => onCheckedChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-card)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        style={{
          // Off state uses a darker, defined track color like macOS
          backgroundColor: checked ? 'var(--brand-primary)' : 'var(--bg-default)',
          boxShadow: checked ? 'none' : 'inset 0 1px 4px rgba(0,0,0,0.1)'
        }}
        {...props}
      >
        <motion.div
          layout
          initial={false}
          transition={{ type: "spring", stiffness: 600, damping: 24, mass: 0.8 }}
          // Apple switch thumb stretching effect when pressed (using width so it pushes properly against the container edge)
          whileTap={{ width: 26 }}
          className="pointer-events-none block h-5 rounded-full bg-white ring-0"
          style={{
            width: 20,
            boxShadow: '0 3px 8px rgba(0,0,0,0.15), 0 3px 1px rgba(0,0,0,0.06)',
            marginLeft: checked ? 'auto' : '2px',
            marginRight: checked ? '2px' : 'auto'
          }}
        />
      </button>
    );
  }
);

Switch.displayName = 'Switch';
