import React from 'react';
import { Bell, Receipt, Mail } from 'lucide-react';
import { Button } from './Button';
import { SearchInput } from './SearchInput';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onOpenPos?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  lowStockCount?: number;
  onNotificationsClick?: () => void;
  shopName?: string;
  activeCashier?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onOpenPos,
  searchQuery = '',
  onSearchChange,
  lowStockCount = 0,
  onNotificationsClick,
  shopName = 'Cricket360 Pro Shop',
  activeCashier = 'Vedant Desai',
}) => {
  return (
    <header className="h-16 bg-white border-b border-retail-border px-6 flex items-center justify-between select-none titlebar-drag-region">
      {/* Optional Title/Subtitle for specific screens or tests */}
      {title && (
        <div className="mr-6 titlebar-no-drag hidden sm:block">
          <h1 className="text-sm font-bold text-retail-text tracking-tight leading-tight">{title}</h1>
          {subtitle && <p className="text-[10px] text-retail-muted">{subtitle}</p>}
        </div>
      )}

      {/* Global Product & Inventory Search */}
      <div className="flex-1 max-w-md titlebar-no-drag">
        <SearchInput
          value={searchQuery}
          onChange={(q) => onSearchChange?.(q)}
          placeholder="Search products, SKU, brand, or barcode (F4)..."
          shortcutBadge="F4"
        />
      </div>

      {/* Right Controls: POS Button, Notification Bell & Cashier Profile */}
      <div className="flex items-center gap-3.5 titlebar-no-drag">
        {onOpenPos && (
          <Button
            size="sm"
            variant="primary"
            icon={<Receipt size={14} />}
            onClick={onOpenPos}
            className="shadow-sm font-semibold rounded-full px-4"
          >
            Quick POS (F2)
          </Button>
        )}

        {/* Mail / System Status Icon */}
        <button
          aria-label="Messages & Store Status"
          title="Store Communications"
          className="w-9 h-9 rounded-full border border-retail-border flex items-center justify-center text-retail-muted hover:text-retail-text hover:bg-retail-bg transition-colors"
        >
          <Mail size={16} />
        </button>

        {/* Low-stock Notification Bell */}
        <button
          onClick={onNotificationsClick}
          aria-label="Stock Notifications"
          title={lowStockCount > 0 ? `${lowStockCount} items need reorder` : 'All items in stock'}
          className="w-9 h-9 rounded-full border border-retail-border flex items-center justify-center text-retail-muted hover:text-retail-text hover:bg-retail-bg transition-colors relative"
        >
          <Bell size={16} />
          {lowStockCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-retail-error text-white text-[10px] font-bold flex items-center justify-center shadow-2xs">
              {lowStockCount > 99 ? '99+' : lowStockCount}
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-retail-border mx-0.5" />

        {/* Cashier Profile Avatar & Details */}
        <div className="flex items-center gap-3 pl-1">
          <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center text-brand-dark font-bold text-xs border border-brand-primary/20 shadow-2xs">
            VD
          </div>
          <div className="text-left hidden md:block">
            <div className="text-xs font-bold text-retail-text leading-tight">{activeCashier}</div>
            <div className="text-[10px] text-retail-muted truncate max-w-[130px]">{shopName}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
