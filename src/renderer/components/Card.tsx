import React from 'react';

export interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  noPadding = false,
}) => {
  return (
    <div className={`bg-retail-card rounded-xl border border-retail-border shadow-card overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-5 py-4 border-b border-retail-border flex items-center justify-between">
          <div>
            {title && <h3 className="text-sm font-semibold text-retail-text tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-retail-muted mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  );
};
