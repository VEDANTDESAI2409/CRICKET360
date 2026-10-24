import React, { useState, useEffect } from 'react';
import { Sidebar, NavModule } from './components/Sidebar';
import { Header } from './components/Header';
import { Card } from './components/Card';
import { Badge } from './components/Badge';
import { Button } from './components/Button';
import { AppInfo, DatabaseStats, HealthCheckResult } from '../shared/types/models';
import {
  Database,
  CheckCircle2,
  Layers,
  Boxes,
  Users,
  Building2,
  FileCode2,
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentModule, setCurrentModule] = useState<NavModule>('dashboard');
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [settingTestKey, setSettingTestKey] = useState<string>('test_shop_tagline');
  const [settingTestVal, setSettingTestVal] = useState<string>('Everything Cricket Under One Roof');
  const [settingSavedMsg, setSettingSavedMsg] = useState<string>('');

  // Load backend data from window.api
  const loadSystemInfo = async () => {
    if (!window.api) {
      // Mock fallback for browser-only dev testing
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
        categoryCount: 5,
        brandCount: 8,
        productCount: 0,
        customerCount: 1,
        supplierCount: 1,
        migrationVersion: '001_initial_schema',
      });
      setHealth({
        status: 'HEALTHY',
        foreignKeys: true,
        journalMode: 'wal',
        integrity: 'ok',
        timestamp: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

    try {
      const [infoRes, statsRes, healthRes] = await Promise.all([
        window.api.app.getInfo(),
        window.api.db.getStats(),
        window.api.app.getHealthCheck(),
      ]);

      if (infoRes.success) setAppInfo(infoRes.data);
      if (statsRes.success) setStats(statsRes.data);
      if (healthRes.success) setHealth(healthRes.data);
    } catch (err) {
      console.error('Failed to load system info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystemInfo();

    // Global keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setCurrentModule('billing');
      } else if (e.key === 'F1') {
        e.preventDefault();
        setCurrentModule('dashboard');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSaveTestSetting = async () => {
    if (!window.api) return;
    try {
      const res = await window.api.settings.set(settingTestKey, settingTestVal);
      if (res.success) {
        setSettingSavedMsg('Setting successfully written to SQLite!');
        setTimeout(() => setSettingSavedMsg(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getModuleTitle = (mod: NavModule): { title: string; subtitle: string } => {
    switch (mod) {
      case 'dashboard':
        return { title: 'Store Overview & System Status', subtitle: 'Live metrics derived from local SQLite database' };
      case 'billing':
        return { title: 'Point of Sale (POS) Billing', subtitle: 'Fast barcode counter sales, discounts, and split payments' };
      case 'products':
        return { title: 'Product Catalog & Variants', subtitle: 'Manage cricket equipment, sizes, brands, and HSN codes' };
      case 'inventory':
        return { title: 'Inventory & Stock Audits', subtitle: 'Real-time stock movements, reconciliation, and reorder levels' };
      case 'purchases':
        return { title: 'Supplier Purchases', subtitle: 'Inward purchase bills, tax receipts, and stock additions' };
      case 'customers':
        return { title: 'Customer Accounts & Khata', subtitle: 'Customer ledger, credit limits, and outstanding balances' };
      case 'suppliers':
        return { title: 'Supplier Directory', subtitle: 'Manufacturer and wholesaler profiles, balances, and invoices' };
      case 'payments':
        return { title: 'Payment Collections & Vouchers', subtitle: 'Multi-tender payment ledger and settlement records' };
      case 'returns':
        return { title: 'Sales & Purchase Returns', subtitle: 'Restocking, refunds, credit notes, and damaged goods' };
      case 'reports':
        return { title: 'Reports & GST Analytics', subtitle: 'GSTR-1, GSTR-3B, daily closing registers, and P&L' };
      case 'expenses':
        return { title: 'Shop Operating Expenses', subtitle: 'Rent, electricity, maintenance, and petty cash' };
      case 'settings':
        return { title: 'Application & Business Settings', subtitle: 'Store profile, GSTIN, invoice numbering, and database' };
    }
  };

  const { title, subtitle } = getModuleTitle(currentModule);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-retail-bg">
      {/* Left Navigation Sidebar */}
      <Sidebar
        currentModule={currentModule}
        onSelectModule={setCurrentModule}
        appVersion={appInfo?.version ? `v${appInfo.version}` : 'v1.0.0'}
      />

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          title={title}
          subtitle={subtitle}
          onOpenPos={() => setCurrentModule('billing')}
          shopName="Cricket360 Pro Shop"
          activeCashier="Admin (Vedant)"
        />

        {/* Content View Area */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentModule === 'dashboard' ? (
            <>
              {/* Foundation Architecture Status Banner */}
              <div className="bg-brand-light border border-brand-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-brand-primary flex items-center justify-center text-white shadow-sm">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-brand-dark tracking-tight">
                      Milestone 1: Desktop Foundation Active & Operational
                    </h2>
                    <p className="text-xs text-retail-muted mt-0.5">
                      Offline SQLite engine connected with WAL mode, foreign keys, and atomic migration runner.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="brand" icon={<Database size={12} />}>
                    Migration: {stats?.migrationVersion || '001'}
                  </Badge>
                  <Badge variant="success" icon={<CheckCircle2 size={12} />}>
                    ACID WAL
                  </Badge>
                </div>
              </div>

              {/* Master Database Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="hover:border-brand-primary/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-retail-muted uppercase tracking-wider">
                        Master Categories
                      </span>
                      <div className="text-2xl font-bold text-retail-text mt-1">
                        {loading ? '...' : stats?.categoryCount ?? 0}
                      </div>
                      <span className="text-[11px] text-brand-primary font-medium mt-1 inline-block">
                        Seeded & Active
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center text-brand-primary border border-brand-primary/10">
                      <Boxes size={20} />
                    </div>
                  </div>
                </Card>

                <Card className="hover:border-brand-primary/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-retail-muted uppercase tracking-wider">
                        Registered Brands
                      </span>
                      <div className="text-2xl font-bold text-retail-text mt-1">
                        {loading ? '...' : stats?.brandCount ?? 0}
                      </div>
                      <span className="text-[11px] text-brand-primary font-medium mt-1 inline-block">
                        SS, SG, Kookaburra+
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 border border-emerald-200/50">
                      <Layers size={20} />
                    </div>
                  </div>
                </Card>

                <Card className="hover:border-brand-primary/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-retail-muted uppercase tracking-wider">
                        Active Customers
                      </span>
                      <div className="text-2xl font-bold text-retail-text mt-1">
                        {loading ? '...' : stats?.customerCount ?? 0}
                      </div>
                      <span className="text-[11px] text-retail-muted mt-1 inline-block">
                        Walk-in Initialized
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 border border-blue-200/50">
                      <Users size={20} />
                    </div>
                  </div>
                </Card>

                <Card className="hover:border-brand-primary/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-retail-muted uppercase tracking-wider">
                        Active Suppliers
                      </span>
                      <div className="text-2xl font-bold text-retail-text mt-1">
                        {loading ? '...' : stats?.supplierCount ?? 0}
                      </div>
                      <span className="text-[11px] text-retail-muted mt-1 inline-block">
                        Ready for POs
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 border border-amber-200/50">
                      <Building2 size={20} />
                    </div>
                  </div>
                </Card>
              </div>

              {/* System Architecture & Integrity Card */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card
                  title="Database Runtime & Storage"
                  subtitle="Persistent storage in OS Application Data"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-retail-border text-xs">
                      <span className="text-retail-muted">Database Engine:</span>
                      <span className="font-semibold text-retail-text">SQLite 3 (better-sqlite3)</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-retail-border text-xs">
                      <span className="text-retail-muted">Journal Mode:</span>
                      <span className="font-semibold text-brand-primary uppercase">
                        {health?.journalMode || 'WAL'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-retail-border text-xs">
                      <span className="text-retail-muted">Foreign Key Enforcement:</span>
                      <span className="font-semibold text-emerald-700">
                        {health?.foreignKeys ? 'ENABLED (Strict)' : 'DISABLED'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-retail-border text-xs">
                      <span className="text-retail-muted">Integrity Check:</span>
                      <span className="font-semibold text-emerald-700">
                        {health?.integrity === 'ok' ? 'PASSED (OK)' : health?.integrity || 'CHECKING'}
                      </span>
                    </div>
                    <div className="py-2 text-xs">
                      <span className="text-retail-muted block mb-1">Persistent File Path:</span>
                      <code className="block bg-retail-bg p-2 rounded text-[11px] font-mono text-retail-text break-all border border-retail-border">
                        {appInfo?.dbPath || '%APPDATA%/Cricket360/database/cricket360.sqlite'}
                      </code>
                    </div>
                  </div>
                </Card>

                <Card
                  title="Electron Security & Process Isolation"
                  subtitle="Boundary controls and preload isolation"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-retail-border text-xs">
                      <span className="text-retail-muted">Context Isolation:</span>
                      <span className="font-semibold text-emerald-700">ENABLED (contextBridge)</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-retail-border text-xs">
                      <span className="text-retail-muted">Node Integration in Renderer:</span>
                      <span className="font-semibold text-emerald-700">DISABLED (Zero Access)</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-retail-border text-xs">
                      <span className="text-retail-muted">IPC Contract Typing:</span>
                      <span className="font-semibold text-brand-primary">Strict TypeScript & Zod</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-retail-border text-xs">
                      <span className="text-retail-muted">Financial Precision Model:</span>
                      <span className="font-semibold text-retail-text">Integer Minor Units (Paise)</span>
                    </div>
                    <div className="flex items-center justify-between py-2 text-xs">
                      <span className="text-retail-muted">Application Platform:</span>
                      <span className="font-semibold text-retail-text">
                        {appInfo?.platform ? `${appInfo.platform} x64 (Offline)` : 'Windows x64'}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          ) : currentModule === 'settings' ? (
            /* Settings Foundation Panel */
            <div className="max-w-3xl space-y-6">
              <Card
                title="Store Settings & SQLite Persistence Test"
                subtitle="Verifies round-trip read/write persistence directly to local SQLite"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-retail-text mb-1 uppercase tracking-wider">
                      Setting Key
                    </label>
                    <input
                      type="text"
                      value={settingTestKey}
                      onChange={(e) => setSettingTestKey(e.target.value)}
                      className="w-full text-xs font-mono p-2.5 rounded-lg border border-retail-border bg-retail-bg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-retail-text mb-1 uppercase tracking-wider">
                      Setting Value
                    </label>
                    <input
                      type="text"
                      value={settingTestVal}
                      onChange={(e) => setSettingTestVal(e.target.value)}
                      className="w-full text-sm p-2.5 rounded-lg border border-retail-border bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button variant="primary" onClick={handleSaveTestSetting}>
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
            </div>
          ) : (
            /* Module In-Development Foundation Shell */
            <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-light mx-auto flex items-center justify-center text-brand-dark border border-brand-primary/20 shadow-sm">
                <FileCode2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-retail-text">
                {title} — Architecture Planned
              </h2>
              <p className="text-xs text-retail-muted max-w-md mx-auto leading-relaxed">
                The desktop foundation, database schema, and navigation routing for this module are established. Functional workflows will be implemented in subsequent milestones per the approved implementation plan.
              </p>
              <div className="pt-2">
                <Button variant="secondary" size="sm" onClick={() => setCurrentModule('dashboard')}>
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
