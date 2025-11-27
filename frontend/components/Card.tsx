import type { ReactNode } from 'react';
import classNames from 'classnames';

type CardProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

const Card = ({ title, subtitle, actions, children, className }: CardProps) => (
  <div
    className={classNames(
      'rounded-xl border border-[#1f1f2a] bg-[#111118] p-5 shadow-card',
      className
    )}
  >
    {(title || subtitle || actions) && (
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {title && <h3 className="text-base font-semibold text-white">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    )}
    {children}
  </div>
);

export default Card;
