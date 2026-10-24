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
}

interface NavItem {
  id: NavModule;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  section: 'core' | 'operations' | 'management';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  appVersion = 'v1.0.0',
}) => {
  const navItems: NavItem[] = [
    // Core
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, section: 'core' },
    { id: 'billing', label: 'POS Billing', icon: <Receipt size={18} />, badge: 'F2', section: 'core' },
    { id: 'products', label: 'Products & Catalog', icon: <Package size={18} />, section: 'core' },
    { id: 'inventory', label: 'Inventory & Stock', icon: <Boxes size={18} />, section: 'core' },
    
    // Operations
    { id: 'purchases', label: 'Purchases', icon: <ShoppingCart size={18} />, section: 'operations' },
    { id: 'customers', label: 'Customers (Khata)', icon: <Users size={18} />, section: 'operations' },
    { id: 'suppliers', label: 'Suppliers', icon: <Building2 size={18} />, section: 'operations' },
    { id: 'payments', label: 'Payments', icon: <CreditCard size={18} />, section: 'operations' },
    { id: 'returns', label: 'Returns & Refunds', icon: <RotateCcw size={18} />, section: 'operations' },
    
    // Management
    { id: 'reports', label: 'Reports & Analytics', icon: <BarChart3 size={18} />, section: 'management' },
    { id: 'expenses', label: 'Expenses', icon: <Wallet size={18} />, section: 'management' },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} />, section: 'management' },
  ];

  const renderSection = (title: string, items: NavItem[]) => (
    <div className="mb-4">
      <div className="px-4 mb-1.5 text-[10px] font-semibold tracking-wider text-white/50 uppercase">
        {title}
      </div>
      <div className="space-y-0.5 px-2">
        {items.map((item) => {
          const isActive = currentModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              className={`
                w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150
                ${isActive
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'}
              `}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className={isActive ? 'text-white' : 'text-white/70'}>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isActive ? 'bg-black/20 text-white' : 'bg-white/10 text-white/70'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside className="w-60 bg-brand-dark flex flex-col h-full text-white select-none border-r border-[#165a41]">
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center gap-3 border-b border-white/10 titlebar-drag-region">
        <div className="w-9 h-9 rounded-xl bg-brand-primary flex items-center justify-center shadow-md border border-white/20 titlebar-no-drag">
          <Sparkles size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0 titlebar-no-drag">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight text-white">CRICKET360</span>
            <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-semibold border border-emerald-400/30">
              PRO
            </span>
          </div>
          <p className="text-[10px] text-white/60 truncate">Sports Shop Management</p>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-3">
        {renderSection('Core Operations', navItems.filter((i) => i.section === 'core'))}
        {renderSection('Transactions & Parties', navItems.filter((i) => i.section === 'operations'))}
        {renderSection('Business Intelligence', navItems.filter((i) => i.section === 'management'))}
      </div>

      {/* Footer / Offline Status */}
      <div className="p-3 border-t border-white/10 bg-black/10">
        <div className="flex items-center justify-between text-xs text-white/70">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="text-[11px] font-medium text-emerald-300">Offline SQLite</span>
          </div>
          <span className="text-[10px] text-white/50 font-mono">{appVersion}</span>
        </div>
      </div>
    </aside>
  );
};
