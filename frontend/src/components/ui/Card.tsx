import clsx from 'clsx';
import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function Card({ children, className, padded = true, ...props }: CardProps) {
  return (
    <div
      className={clsx('glass-panel', padded ? 'p-6' : undefined, 'transition-colors', className)}
      {...props}
    >
      {children}
    </div>
  );
}
