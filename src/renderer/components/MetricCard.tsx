import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  badgeText?: string;
  badgeIcon?: React.ReactNode;
  variant?: 'featured' | 'standard';
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  badgeText,
  badgeIcon,
  variant = 'standard',
  icon,
  onClick,
  className = '',
}) => {
  const isFeatured = variant === 'featured';

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-2xl p-5 transition-all duration-200 select-none
        ${isFeatured
          ? 'bg-gradient-to-br from-brand-dark to-[#165a41] text-white shadow-subtle'
          : 'bg-retail-card text-retail-text border border-retail-border shadow-card hover:border-brand-primary/30'}
        ${onClick ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]' : ''}
        ${className}
      `}
    >
      {/* Top Header: Title & Action Arrow */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-xs font-semibold tracking-tight ${
            isFeatured ? 'text-white/80' : 'text-retail-muted'
          }`}
        >
          {title}
        </span>
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors ${
            isFeatured
              ? 'border-white/20 bg-white/10 text-white'
              : 'border-retail-border bg-retail-bg text-retail-muted hover:text-retail-text hover:bg-white'
          }`}
        >
          {icon || <ArrowUpRight size={14} />}
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="mb-3">
        <div
          className={`text-3xl font-extrabold tracking-tight font-sans ${
            isFeatured ? 'text-white' : 'text-retail-text'
          }`}
        >
          {value}
        </div>
      </div>

      {/* Bottom Subtext / Status Pill */}
      {badgeText && (
        <div className="flex items-center gap-1.5">
          <div
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
              isFeatured
                ? 'bg-white/15 text-emerald-200 border border-white/10'
                : 'bg-retail-bg text-retail-muted border border-retail-border'
            }`}
          >
            {badgeIcon}
            <span>{badgeText}</span>
          </div>
        </div>
      )}
    </div>
  );
};
