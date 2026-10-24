import React from 'react';
import { Search, Bell, User, Receipt } from 'lucide-react';
import { Button } from './Button';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenPos?: () => void;
  shopName?: string;
  activeCashier?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onOpenPos,
  shopName = 'Cricket360 Pro Shop',
  activeCashier = 'Admin (Vedant)',
}) => {
  return (
    <header className="h-16 bg-white border-b border-retail-border px-6 flex items-center justify-between select-none titlebar-drag-region">
      {/* Title & Shop Details */}
      <div className="flex items-center gap-4 titlebar-no-drag">
        <div>
          <h1 className="text-base font-bold text-retail-text tracking-tight flex items-center gap-2">
            {title}
          </h1>
          {subtitle && <p className="text-xs text-retail-muted">{subtitle}</p>}
        </div>
      </div>

      {/* Center Search / POS Barcode Scanner Emulator */}
      <div className="flex-1 max-w-md mx-6 titlebar-no-drag">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-retail-muted">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Scan barcode or search products, SKU, brand (Press F4)..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-retail-bg border border-retail-border rounded-lg text-retail-text placeholder:text-retail-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-150"
          />
        </div>
      </div>

      {/* Right Quick Actions & Cashier Profile */}
      <div className="flex items-center gap-3 titlebar-no-drag">
        {onOpenPos && (
          <Button
            size="sm"
            variant="primary"
            icon={<Receipt size={14} />}
            onClick={onOpenPos}
            className="shadow-sm font-semibold"
          >
            Quick POS (F2)
          </Button>
        )}

        <button
          aria-label="Stock Notifications"
          className="w-8 h-8 rounded-lg border border-retail-border flex items-center justify-center text-retail-muted hover:text-retail-text hover:bg-retail-bg transition-colors relative"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-primary"></span>
        </button>

        <div className="h-6 w-px bg-retail-border mx-1"></div>

        <div className="flex items-center gap-2 pl-1">
          <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center text-brand-dark border border-brand-primary/20">
            <User size={16} />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-semibold text-retail-text leading-tight">{activeCashier}</div>
            <div className="text-[10px] text-retail-muted truncate max-w-[120px]">{shopName}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
