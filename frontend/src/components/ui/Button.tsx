import clsx from 'clsx';
import { ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'md' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const baseStyles =
  'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f1a] disabled:cursor-not-allowed disabled:opacity-60';

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark shadow-glass',
  secondary: 'bg-white/10 text-white hover:bg-white/20',
  ghost: 'bg-transparent text-white hover:bg-white/10'
};

const sizeStyles: Record<ButtonSize, string> = {
  md: 'px-4 py-2 text-sm',
  sm: 'px-3 py-1.5 text-xs'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', loading, className, ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? 'Processing...' : children}
    </button>
  )
);

Button.displayName = 'Button';
