import React from 'react';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Receipt,
  ShoppingCart,
  Users,
  Building2,
  CreditCard,
  RotateCcw,
  BarChart3,
  Wallet,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export type NavModule =
  | 'dashboard'
  | 'products'
  | 'inventory'
  | 'billing'
  | 'purchases'
  | 'customers'
  | 'suppliers'
  | 'payments'
  | 'returns'
  | 'reports'
  | 'expenses'
  | 'settings';

interface SidebarProps {
  currentModule: NavModule;
  onSelectModule: (module: NavModule) => void;
  appVersion?: string;
  lowStockCount?: number;
}

interface NavItem {
  id: NavModule;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  status?: 'active' | 'planned';
  section: 'menu' | 'general';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  appVersion = 'v1.0.0',
  lowStockCount = 0,
}) => {
  const navItems: NavItem[] = [
    // Menu (Core retail operations)
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, status: 'active', section: 'menu' },
    { id: 'billing', label: 'POS Billing', icon: <Receipt size={18} />, badge: 'F2', status: 'active', section: 'menu' },
    { id: 'products', label: 'Products & Catalog', icon: <Package size={18} />, status: 'active', section: 'menu' },
    { id: 'inventory', label: 'Inventory & Stock', icon: <Boxes size={18} />, badge: lowStockCount > 0 ? `${lowStockCount}` : undefined, status: 'active', section: 'menu' },
    { id: 'purchases', label: 'Purchases', icon: <ShoppingCart size={18} />, status: 'planned', section: 'menu' },
    { id: 'customers', label: 'Customers (Khata)', icon: <Users size={18} />, status: 'planned', section: 'menu' },
    { id: 'suppliers', label: 'Suppliers', icon: <Building2 size={18} />, status: 'planned', section: 'menu' },
    { id: 'payments', label: 'Payments', icon: <CreditCard size={18} />, status: 'planned', section: 'menu' },
    { id: 'returns', label: 'Returns & Refunds', icon: <RotateCcw size={18} />, status: 'planned', section: 'menu' },

    // General (Analytics & settings)
    { id: 'reports', label: 'Reports & Analytics', icon: <BarChart3 size={18} />, status: 'planned', section: 'general' },
    { id: 'expenses', label: 'Expenses', icon: <Wallet size={18} />, status: 'planned', section: 'general' },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} />, status: 'active', section: 'general' },
  ];

  const renderSection = (title: string, items: NavItem[]) => (
    <div className="mb-5">
      <div className="px-4 mb-2 text-[10px] font-bold tracking-wider text-retail-muted/70 uppercase select-none">
        {title}
      </div>
      <div className="space-y-1 px-3">
        {items.map((item) => {
          const isActive = currentModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              className={`
                group relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 select-none
                ${isActive
                  ? 'bg-brand-light text-brand-dark font-semibold shadow-2xs'
                  : 'text-retail-muted hover:bg-retail-bg hover:text-retail-text'}
              `}
            >
              {/* Left active pill indicator */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-brand-primary rounded-r-full" />
              )}

              <div className="flex items-center gap-3 truncate pl-1">
                <span className={`transition-colors ${isActive ? 'text-brand-primary' : 'text-retail-muted group-hover:text-retail-text'}`}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.status === 'planned' && !isActive && !item.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 text-retail-muted/70 bg-retail-bg border border-retail-border rounded font-normal">
                    Planned
                  </span>
                )}
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                      isActive
                        ? 'bg-brand-primary text-white'
                        : item.id === 'inventory' && lowStockCount > 0
                        ? 'bg-retail-warning/15 text-retail-warning font-bold'
                        : 'bg-retail-bg text-retail-muted border border-retail-border'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside className="w-64 bg-white flex flex-col h-full select-none border-r border-retail-border">
      {/* Brand Header */}
      <div className="h-18 px-5 flex items-center gap-3 border-b border-retail-border titlebar-drag-region">
        <div className="w-9 h-9 rounded-xl bg-brand-primary flex items-center justify-center shadow-sm titlebar-no-drag">
          <Sparkles size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0 titlebar-no-drag">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-tight text-retail-text">CRICKET360</span>
            <span className="text-[9px] px-1.5 py-0.2 bg-brand-light text-brand-dark rounded font-bold border border-brand-primary/20">
              PRO
            </span>
          </div>
          <p className="text-[10px] text-retail-muted truncate">Sports Shop Management</p>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-4">
        {renderSection('Menu', navItems.filter((i) => i.section === 'menu'))}
        {renderSection('General', navItems.filter((i) => i.section === 'general'))}
      </div>

      {/* Bottom Promo / Offline Status Card (matching reference screenshot) */}
      <div className="p-3 border-t border-retail-border">
        <div className="bg-brand-dark rounded-2xl p-4 text-white relative overflow-hidden shadow-card border border-[#165a41]">
          {/* Subtle decorative background circle */}
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-brand-primary/20 pointer-events-none blur-sm" />

          <div className="relative z-10">
            <div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-semibold mb-1">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Offline SQLite POS</span>
            </div>
            <p className="text-[10px] text-white/70 mb-3 leading-snug">
              Local ACID database with zero cloud latency.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-white/60 bg-white/10 px-2 py-0.5 rounded">
                {appVersion}
              </span>
              <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Active & Ready
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
