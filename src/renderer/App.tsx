import React, { useState, useEffect } from 'react';
import { Sidebar, NavModule } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './features/dashboard/Dashboard';
import { ProductCatalog } from './features/products/ProductCatalog';
import { InventoryManagement } from './features/inventory/InventoryManagement';
import { PosBilling } from './features/billing/PosBilling';
import { Purchases } from './features/purchases/Purchases';
import { Suppliers } from './features/suppliers/Suppliers';
import { Customers } from './features/customers/Customers';
import { PaymentsRegister } from './features/payments/PaymentsRegister';
import { Returns } from './features/returns/Returns';
import { Expenses } from './features/expenses/Expenses';
import { Reports } from './features/reports/Reports';
import { Settings } from './features/settings/Settings';
import { Button } from './components/Button';
import {
  AppInfo,
  ProductWithDetails,
} from '../shared/types/models';
import { FileCode2 } from 'lucide-react';

export const App: React.FC = () => {
  const [currentModule, setCurrentModule] = useState<NavModule>('dashboard');
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [productForAdjustment, setProductForAdjustment] = useState<ProductWithDetails | null>(null);

  const loadSystemInfo = async () => {
    if (!window.api) {
      setAppInfo({
        name: 'Cricket360 (Browser Preview)',
        version: '1.0.0-dev',
        platform: 'win32',
        dbPath: '%APPDATA%/Cricket360/database/cricket360.sqlite',
        isPackaged: false,
        walEnabled: true,
        foreignKeysEnabled: true,
      });
      setLowStockCount(2);
      return;
    }

    try {
      const [infoRes, metricsRes] = await Promise.all([
        window.api.app.getInfo(),
        window.api.dashboard.getMetrics(),
      ]);

      if (infoRes.success) setAppInfo(infoRes.data);
      if (metricsRes.success) {
        setLowStockCount(metricsRes.data.lowStockCount);
      }
    } catch (err) {
      console.error('Failed to load system info:', err);
    }
  };

  useEffect(() => {
    loadSystemInfo();

    // Global keyboard shortcuts (F1: Dashboard, F2: Billing, F4: Search)
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInputActive =
        activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      // Avoid intercepting keystrokes when the user is typing in form inputs
      if (isInputActive) {
        return;
      }

      if (e.key === 'F1') {
        e.preventDefault();
        setCurrentModule('dashboard');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setCurrentModule('billing');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getModuleMeta = (mod: NavModule) => {
    switch (mod) {
      case 'dashboard':
        return {
          title: 'Store Dashboard',
          subtitle: 'Live cricket inventory, daily revenue, and stock alerts',
        };
      case 'billing':
        return {
          title: 'Sales & Billing (POS)',
          subtitle: 'Barcode counter checkout, GST invoice generation, and thermal printing',
          milestone: 'Milestone 4',
        };
      case 'products':
        return {
          title: 'Products & Catalog',
          subtitle: 'Manage cricket bats, balls, protective gear, variants, and barcodes',
          milestone: 'Milestone 3',
        };
      case 'inventory':
        return {
          title: 'Inventory & Stock Audits',
          subtitle: 'Stock adjustments, reorder alerts, and immutable movement ledger',
          milestone: 'Milestone 3',
        };
      case 'purchases':
        return {
          title: 'Purchases & Inward Goods',
          subtitle: 'Supplier purchase bills, tax input credits, and cost updates',
          milestone: 'Milestone 5',
        };
      case 'customers':
        return {
          title: 'Customers & Khata Ledger',
          subtitle: 'Customer accounts, credit balance tracking, and purchase history',
          milestone: 'Milestone 6',
        };
      case 'suppliers':
        return {
          title: 'Supplier Directory',
          subtitle: 'Cricket manufacturers, distributor accounts, and payment terms',
          milestone: 'Milestone 5',
        };
      case 'payments':
        return {
          title: 'Payments & Settlements',
          subtitle: 'Cash, UPI, card, and split payment tracking',
          milestone: 'Milestone 6',
        };
      case 'returns':
        return {
          title: 'Returns & Credit Notes',
          subtitle: 'Customer sales returns, damaged goods write-offs, and replacements',
          milestone: 'Milestone 6',
        };
      case 'reports':
        return {
          title: 'Reports & GST Analytics',
          subtitle: 'GSTR-1, GSTR-3B summaries, daily closing registers, and P&L analysis',
          milestone: 'Milestone 7',
        };
      case 'expenses':
        return {
          title: 'Operating Expenses',
          subtitle: 'Shop utilities, rent, maintenance, and petty cash register',
          milestone: 'Milestone 7',
        };
      case 'settings':
        return {
          title: 'Settings & Administration',
          subtitle: 'Store profile, GSTIN, invoice prefixes, and database management',
          milestone: 'Milestone 1 / 8',
        };
    }
  };

  const meta = getModuleMeta(currentModule);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-retail-bg font-sans">
      {/* 1. Left Navigation Sidebar */}
      <Sidebar
        currentModule={currentModule}
        onSelectModule={(mod) => {
          if (mod !== 'inventory') setProductForAdjustment(null);
          setCurrentModule(mod);
        }}
        appVersion={appInfo?.version ? `v${appInfo.version}` : 'v1.0.0'}
        lowStockCount={lowStockCount}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <Header
          onOpenPos={() => setCurrentModule('billing')}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          lowStockCount={lowStockCount}
          onNotificationsClick={() => {
            if (currentModule !== 'dashboard') {
              setCurrentModule('dashboard');
            }
            setTimeout(() => {
              const tableElem = document.getElementById('low-stock-table-anchor');
              tableElem?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
          shopName="Cricket360 Pro Shop"
          activeCashier="Vedant Desai (Admin)"
        />

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6">
          {currentModule === 'dashboard' ? (
            <Dashboard
              onNavigateToModule={setCurrentModule}
              externalSearchQuery={globalSearch}
            />
          ) : currentModule === 'billing' ? (
            <PosBilling />
          ) : currentModule === 'products' ? (
            <ProductCatalog
              onNavigateToModule={setCurrentModule}
              onOpenAdjustStock={(p) => {
                setProductForAdjustment(p);
                setCurrentModule('inventory');
              }}
            />
          ) : currentModule === 'inventory' ? (
            <InventoryManagement
              onNavigateToModule={setCurrentModule}
              initialSelectedProduct={productForAdjustment}
            />
          ) : currentModule === 'purchases' ? (
            <Purchases />
          ) : currentModule === 'suppliers' ? (
            <Suppliers />
          ) : currentModule === 'customers' ? (
            <Customers />
          ) : currentModule === 'payments' ? (
            <PaymentsRegister />
          ) : currentModule === 'returns' ? (
            <Returns />
          ) : currentModule === 'expenses' ? (
            <Expenses />
          ) : currentModule === 'reports' ? (
            <Reports />
          ) : currentModule === 'settings' ? (
            <Settings />
          ) : (
            /* Professional Planned Module Shell */
            <div className="max-w-xl mx-auto py-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-light mx-auto flex items-center justify-center text-brand-dark border border-brand-primary/20 shadow-sm">
                <FileCode2 size={28} />
              </div>
              <h2 className="text-lg font-bold text-retail-text">
                {meta.title} — {meta.milestone || 'Planned'}
              </h2>
              <p className="text-xs text-retail-muted max-w-md mx-auto leading-relaxed">
                {meta.subtitle}. Database tables, stock audit ledger, and IPC contracts have been established.
              </p>
              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentModule('dashboard')}
                >
                  Return to Dashboard
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
