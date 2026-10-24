import React from 'react';

export interface ProgressDonutProps {
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  title?: string;
  className?: string;
}

export const ProgressDonut: React.FC<ProgressDonutProps> = ({
  inStockCount,
  lowStockCount,
  outOfStockCount,
  title = 'Stock Health & Availability',
  className = '',
}) => {
  const total = inStockCount + lowStockCount + outOfStockCount;
  const inStockPct = total > 0 ? Math.round((inStockCount / total) * 100) : 100;
  const lowStockPct = total > 0 ? Math.round((lowStockCount / total) * 100) : 0;
  const outOfStockPct = total > 0 ? Math.round((outOfStockCount / total) * 100) : 0;

  // Arc calculation for SVG semi-circle gauge (radius 70, strokeWidth 14)
  const radius = 60;
  const circumference = Math.PI * radius; // Half-circle circumference

  const inStockStroke = (inStockPct / 100) * circumference;
  const lowStockStroke = (lowStockPct / 100) * circumference;

  return (
    <div className={`bg-white rounded-2xl border border-retail-border p-5 shadow-card flex flex-col justify-between ${className}`}>
      {/* Title */}
      <div className="mb-2">
        <h3 className="text-sm font-bold text-retail-text tracking-tight">{title}</h3>
        <p className="text-[11px] text-retail-muted mt-0.5">Inventory fulfillment ratio</p>
      </div>

      {/* Semicircular Gauge */}
      <div className="relative flex flex-col items-center justify-center my-auto py-2">
        <svg viewBox="0 0 160 90" className="w-48 overflow-visible">
          {/* Background track */}
          <path
            d="M 15 80 A 65 65 0 0 1 145 80"
            fill="none"
            stroke="#E3E9E5"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Out of stock segment (Red/Rose) */}
          {outOfStockPct > 0 && (
            <path
              d="M 15 80 A 65 65 0 0 1 145 80"
              fill="none"
              stroke="#C83E4D"
              strokeWidth="16"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={0}
              strokeLinecap="round"
            />
          )}

          {/* Low stock segment (Amber) */}
          {lowStockPct > 0 && (
            <path
              d="M 15 80 A 65 65 0 0 1 145 80"
              fill="none"
              stroke="#167A53"
              strokeWidth="16"
              strokeDasharray={`${lowStockStroke + inStockStroke} ${circumference}`}
              strokeDashoffset={0}
              strokeLinecap="round"
            />
          )}

          {/* In stock segment (Forest Green) */}
          <path
            d="M 15 80 A 65 65 0 0 1 145 80"
            fill="none"
            stroke="#124B36"
            strokeWidth="16"
            strokeDasharray={`${inStockStroke} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute bottom-1 text-center">
          <div className="text-2xl font-extrabold text-brand-dark tracking-tight leading-none">
            {inStockPct}%
          </div>
          <div className="text-[10px] text-retail-muted font-medium mt-1">In Stock</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[11px] pt-3 border-t border-retail-border/60">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand-dark"></span>
          <span className="text-retail-text font-medium">In Stock ({inStockCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand-primary"></span>
          <span className="text-retail-muted font-medium">Low ({lowStockCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-retail-error"></span>
          <span className="text-retail-muted font-medium">Out ({outOfStockCount})</span>
        </div>
      </div>
    </div>
  );
};
