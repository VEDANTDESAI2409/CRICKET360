import React from 'react';
import { DaySalesSummary } from '../../shared/types/models';
import { formatPaiseToRupees } from '../utils/currency';

export interface BarChartProps {
  data: DaySalesSummary[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  title = 'Weekly Counter Activity',
  subtitle = 'Last 7 days sales performance',
  className = '',
}) => {
  // Find maximum sales amount to calculate proportional bar height
  const maxSales = Math.max(...data.map((d) => d.salesAmountPaise), 100000); // minimum 1000 rupees as scale

  return (
    <div className={`bg-white rounded-2xl border border-retail-border p-5 shadow-card ${className}`}>
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-retail-text tracking-tight">{title}</h3>
          <p className="text-[11px] text-retail-muted mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* Pill Bars Container */}
      <div className="flex items-end justify-between gap-3 h-40 pt-4 pb-2 px-2">
        {data.map((day, idx) => {
          const heightPercent = Math.max(Math.round((day.salesAmountPaise / maxSales) * 100), 12);
          const isToday = idx === data.length - 1;
          const hasSales = day.salesAmountPaise > 0;

          // Colors matching the visual reference (dark green, light emerald, diagonal striped)
          const barStyle = isToday
            ? 'bg-brand-dark text-white'
            : hasSales
            ? 'bg-brand-primary text-white'
            : 'bg-slate-100 text-slate-400 border border-dashed border-slate-200';

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center h-full justify-end group relative">
              {/* Tooltip on hover */}
              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10 whitespace-nowrap bg-brand-dark text-white text-[10px] py-1 px-2 rounded-md shadow-md">
                {day.dayName} ({day.date}): {formatPaiseToRupees(day.salesAmountPaise)} ({day.invoiceCount} bills)
              </div>

              {/* Active percentage pill indicator if today */}
              {isToday && hasSales && (
                <div className="mb-1 text-[9px] font-bold text-brand-primary bg-brand-light px-1.5 py-0.5 rounded-full border border-brand-primary/20">
                  Today
                </div>
              )}

              {/* Vertical Pill Bar */}
              <div
                style={{ height: `${heightPercent}%` }}
                className={`w-full max-w-[32px] rounded-full transition-all duration-300 ${barStyle} flex items-center justify-center shadow-2xs group-hover:scale-105`}
              />

              {/* Day Label below bar */}
              <span
                className={`text-[11px] font-semibold mt-3 ${
                  isToday ? 'text-brand-dark font-bold' : 'text-retail-muted'
                }`}
              >
                {day.dayName.charAt(0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
