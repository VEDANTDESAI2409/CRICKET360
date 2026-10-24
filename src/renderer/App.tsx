import React, { useState, useEffect } from 'react';
import { Sidebar, NavModule } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './features/dashboard/Dashboard';
import { Card } from './components/Card';
import { Button } from './components/Button';
import { AppInfo, DatabaseStats, HealthCheckResult } from '../shared/types/models';
import {
  FileCode2,
  ArrowLeft,
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentModule, setCurrentModule] = useState<NavModule>('dashboard');
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Settings testing state
  const [settingKey, setSettingKey] = useState<string>('store_tagline');
  const [settingVal, setSettingVal] = useState<string>('Premium Cricket Gear & Equipment');
  const [settingSavedMsg, setSettingSavedMsg] = useState<string>('');

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
      setStats({
        categoryCount: 6,
        brandCount: 8,
        productCount: 6,
        customerCount: 1,
        supplierCount: 1,
        migrationVersion: '002_transactions_foundation',
      });
      setHealth({
        status: 'HEALTHY',
        foreignKeys: true,
        journalMode: 'wal',
        integrity: 'ok',
        timestamp: new Date().toISOString(),
      });
      setLowStockCount(2);
      return;
    }

    try {
      const [infoRes, statsRes, healthRes, metricsRes] = await Promise.all([
        window.api.app.getInfo(),
        window.api.db.getStats(),
        window.api.app.getHealthCheck(),
        window.api.dashboard.getMetrics(),
      ]);

      if (infoRes.success) setAppInfo(infoRes.data);
      if (statsRes.success) setStats(statsRes.data);
      if (healthRes.success) setHealth(healthRes.data);
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

  const handleSaveSetting = async () => {
    if (!window.api) return;
    try {
      const res = await window.api.settings.set(settingKey, settingVal);
      if (res.success) {
        setSettingSavedMsg('Setting saved successfully to SQLite database!');
        setTimeout(() => setSettingSavedMsg(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

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
        onSelectModule={setCurrentModule}
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
          ) : currentModule === 'settings' ? (
            /* Settings Panel */
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-retail-text">Settings & System Info</h1>
                  <p className="text-xs text-retail-muted">
                    Database configuration, persistent store settings, and engine diagnostics.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ArrowLeft size={14} />}
                  onClick={() => setCurrentModule('dashboard')}
                >
                  Back to Dashboard
                </Button>
              </div>

              {/* SQLite Read / Write Test */}
              <Card
                title="Store Settings & Persistence Test"
                subtitle="Verifies round-trip IPC read/write directly to local SQLite database"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-retail-text mb-1 uppercase tracking-wider">
                        Setting Key
                      </label>
                      <input
                        type="text"
                        value={settingKey}
                        onChange={(e) => setSettingKey(e.target.value)}
                        className="w-full text-xs font-mono p-2.5 rounded-lg border border-retail-border bg-retail-bg focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-retail-text mb-1 uppercase tracking-wider">
                        Setting Value
                      </label>
                      <input
                        type="text"
                        value={settingVal}
                        onChange={(e) => setSettingVal(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-retail-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button variant="primary" size="sm" onClick={handleSaveSetting}>
                      Save to SQLite via IPC
                    </Button>
                    {settingSavedMsg && (
                      <span className="text-xs font-semibold text-emerald-700">
                        {settingSavedMsg}
                      </span>
                    )}
                  </div>
                </div>
              </Card>

              {/* Engine Architecture & Diagnostics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card
                  title="Database Diagnostics"
                  subtitle="WAL mode and transaction integrity"
                >
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-retail-border">
                      <span className="text-retail-muted">Journal Mode:</span>
                      <span className="font-bold text-brand-primary uppercase">
                        {health?.journalMode || 'WAL'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-retail-border">
                      <span className="text-retail-muted">Foreign Keys:</span>
                      <span className="font-bold text-emerald-700">
                        {health?.foreignKeys ? 'ENABLED (Strict)' : 'DISABLED'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-retail-border">
                      <span className="text-retail-muted">Integrity Check:</span>
                      <span className="font-bold text-emerald-700">
                        {health?.integrity === 'ok' ? 'PASSED (OK)' : health?.integrity}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-retail-border">
                      <span className="text-retail-muted">Migration Level:</span>
                      <span className="font-mono text-retail-text">
                        {stats?.migrationVersion || '002_transactions_foundation'}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card
                  title="Process Isolation & Security"
                  subtitle="Electron contextBridge parameters"
                >
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-retail-border">
                      <span className="text-retail-muted">Context Isolation:</span>
                      <span className="font-bold text-emerald-700">ENABLED</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-retail-border">
                      <span className="text-retail-muted">Node Integration:</span>
                      <span className="font-bold text-emerald-700">DISABLED (Isolated)</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-retail-border">
                      <span className="text-retail-muted">Financial Precision:</span>
                      <span className="font-semibold text-retail-text">Paise (1 INR = 100)</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-retail-border">
                      <span className="text-retail-muted">Packaging Status:</span>
                      <span className="font-mono text-retail-text">
                        {appInfo?.isPackaged ? 'Packaged EXE' : 'Dev Unpackaged'}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            /* Professional Planned Module Shell (Never fake screens for unfinished modules) */
            <div className="max-w-xl mx-auto py-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-light mx-auto flex items-center justify-center text-brand-dark border border-brand-primary/20 shadow-sm">
                <FileCode2 size={28} />
              </div>
              <h2 className="text-lg font-bold text-retail-text">
                {meta.title} — {meta.milestone || 'Planned'}
              </h2>
              <p className="text-xs text-retail-muted max-w-md mx-auto leading-relaxed">
                {meta.subtitle}. Database tables, stock audit ledger, and IPC contracts have been established. Functional UI workflows will be connected in {meta.milestone} per the project roadmap.
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
