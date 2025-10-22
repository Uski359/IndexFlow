import clsx from 'clsx';
import { HTMLAttributes } from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral';

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  danger: 'bg-danger/20 text-danger',
  neutral: 'bg-white/10 text-white/80'
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ children, variant = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
