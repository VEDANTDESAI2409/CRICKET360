import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Boxes,
  AlertTriangle,
  Receipt,
  ShoppingCart,
  Plus,
  RefreshCw,
  Search,
  ArrowRight,
  Sparkles,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { MetricCard } from '../../components/MetricCard';
import { BarChart } from '../../components/BarChart';
import { ProgressDonut } from '../../components/ProgressDonut';
import { Table, Column } from '../../components/Table';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { formatPaiseToRupees } from '../../utils/currency';
import {
  DashboardMetrics,
  LowStockAlertItem,
  RecentTransactionItem,
  DaySalesSummary,
} from '../../../shared/types/models';

interface DashboardProps {
  onNavigateToModule: (module: any) => void;
  externalSearchQuery?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigateToModule,
  externalSearchQuery = '',
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlertItem[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransactionItem[]>([]);
  const [weeklySales, setWeeklySales] = useState<DaySalesSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Table filtering and sorting state
  const [tableSearch, setTableSearch] = useState<string>('');
  const [sortKey, setSortKey] = useState<string>('stockQuantity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Quick Action feedback modal/toast
  const [activeModalMessage, setActiveModalMessage] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    if (!window.api) {
      // Browser fallback for unit testing / standalone preview
      setMetrics({
        totalActiveProducts: 6,
        totalCategories: 6,
        totalBrands: 8,
        totalStockQuantity: 22,
        totalStockValuationPaise: 4430000,
        todaySalesPaise: 0,
        todayPurchasesPaise: 0,
        outOfStockCount: 1,
        lowStockCount: 2,
        inStockCount: 3,
      });
      setLowStockAlerts([
        {
          id: 3,
          name: 'Kookaburra Kahuna Pro Batting Gloves',
          sku: 'GLV-KOOK-KAH-01',
          categoryName: 'Protective Gear',
          brandName: 'Kookaburra',
          stockQuantity: 0,
          minStockLevel: 2,
          reorderLevel: 4,
          mrpPaise: 260000,
          sellingPricePaise: 220000,
          status: 'OUT_OF_STOCK',
        },
        {
          id: 5,
          name: 'DSC Intense Speed Cricket Shoes (Rubber Studs)',
          sku: 'SHOE-DSC-INT-01',
          categoryName: 'Footwear',
          brandName: 'DSC',
          stockQuantity: 1,
          minStockLevel: 3,
          reorderLevel: 6,
          mrpPaise: 220000,
          sellingPricePaise: 185000,
          status: 'LOW_STOCK',
        },
        {
          id: 2,
          name: 'SG Club Leather Cricket Ball (Red, Pack of 6)',
          sku: 'BALL-SG-CLUB-01',
          categoryName: 'Cricket Balls',
          brandName: 'SG',
          stockQuantity: 2,
          minStockLevel: 5,
          reorderLevel: 10,
          mrpPaise: 280000,
          sellingPricePaise: 240000,
          status: 'LOW_STOCK',
        },
      ]);
      setWeeklySales([
        { dayName: 'Sun', date: '2026-10-19', salesAmountPaise: 0, invoiceCount: 0 },
        { dayName: 'Mon', date: '2026-10-20', salesAmountPaise: 0, invoiceCount: 0 },
        { dayName: 'Tue', date: '2026-10-21', salesAmountPaise: 0, invoiceCount: 0 },
        { dayName: 'Wed', date: '2026-10-22', salesAmountPaise: 0, invoiceCount: 0 },
        { dayName: 'Thu', date: '2026-10-23', salesAmountPaise: 0, invoiceCount: 0 },
        { dayName: 'Fri', date: '2026-10-24', salesAmountPaise: 0, invoiceCount: 0 },
        { dayName: 'Sat', date: '2026-10-25', salesAmountPaise: 0, invoiceCount: 0 },
      ]);
      setRecentTransactions([]);
      setLoading(false);
      return;
    }

    try {
      const [metricsRes, alertsRes, transRes, salesRes] = await Promise.all([
        window.api.dashboard.getMetrics(),
        window.api.dashboard.getLowStockAlerts(),
        window.api.dashboard.getRecentTransactions(),
        window.api.dashboard.getWeeklySalesSummary(),
      ]);

      if (metricsRes.success) {
        setMetrics(metricsRes.data);
      } else {
        setError(metricsRes.error);
      }

      if (alertsRes.success) setLowStockAlerts(alertsRes.data);
      if (transRes.success) setRecentTransactions(transRes.data);
      if (salesRes.success) setWeeklySales(salesRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filter and sort low stock alerts
  const effectiveFilter = tableSearch || externalSearchQuery;
  const filteredAlerts = useMemo(() => {
    let result = [...lowStockAlerts];

    if (effectiveFilter) {
      const q = effectiveFilter.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.categoryName.toLowerCase().includes(q) ||
          item.brandName.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let valA: any = a[sortKey as keyof LowStockAlertItem];
      let valB: any = b[sortKey as keyof LowStockAlertItem];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [lowStockAlerts, effectiveFilter, sortKey, sortDirection]);

  const handleSort = (columnId: string) => {
    if (sortKey === columnId) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(columnId);
      setSortDirection('asc');
    }
  };

  const handleQuickAction = (actionName: string, targetModule?: string) => {
    if (targetModule) {
      onNavigateToModule(targetModule);
    } else {
      setActiveModalMessage(
        `The "${actionName}" workflow is scheduled for Milestone 3 (Product & Inventory Management). Foundation schema and stock movement tables are fully prepared in SQLite.`
      );
    }
  };

  // Columns for the low-stock inventory table
  const tableColumns: Column<LowStockAlertItem>[] = [
    {
      id: 'name',
      header: 'Product & SKU',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-semibold text-retail-text leading-tight">{item.name}</div>
          <div className="text-[11px] text-retail-muted font-mono mt-0.5">{item.sku}</div>
        </div>
      ),
    },
    {
      id: 'categoryName',
      header: 'Category & Brand',
      sortable: true,
      render: (item) => (
        <div>
          <span className="text-retail-text font-medium">{item.categoryName}</span>
          <span className="text-retail-muted text-[11px] block">{item.brandName}</span>
        </div>
      ),
    },
    {
      id: 'stockQuantity',
      header: 'Available Stock',
      sortable: true,
      align: 'center',
      render: (item) => {
        const isOut = item.stockQuantity === 0;
        return (
          <div className="inline-flex flex-col items-center">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                isOut
                  ? 'bg-retail-error/15 text-retail-error'
                  : 'bg-retail-warning/15 text-retail-warning'
              }`}
            >
              {item.stockQuantity} {item.stockQuantity === 1 ? 'unit' : 'units'}
            </span>
            <span className="text-[10px] text-retail-muted mt-0.5">
              Min: {item.minStockLevel}
            </span>
          </div>
        );
      },
    },
    {
      id: 'reorderLevel',
      header: 'Reorder Level',
      sortable: true,
      align: 'center',
      render: (item) => (
        <span className="text-xs font-mono font-medium text-retail-text">
          {item.reorderLevel} units
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Stock Status',
      sortable: true,
      align: 'center',
      render: (item) => {
        if (item.status === 'OUT_OF_STOCK') {
          return (
            <Badge variant="danger" icon={<XCircle size={12} />}>
              Out of Stock
            </Badge>
          );
        }
        return (
          <Badge variant="warning" icon={<AlertTriangle size={12} />}>
            Low Stock
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Action',
      align: 'right',
      render: (item) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            handleQuickAction(`Create Purchase Order for ${item.name}`, 'purchases')
          }
          className="text-xs py-1 px-3 rounded-lg"
        >
          Reorder Stock
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none">
      {/* 1. Header Row (matching reference screenshot) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-retail-text tracking-tight font-sans">
            Dashboard
          </h1>
          <p className="text-xs text-retail-muted mt-1">
            Real-time cricket inventory, sales revenue, and automated low-stock alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="dark"
            icon={<Plus size={16} />}
            onClick={() => handleQuickAction('New POS Bill', 'billing')}
            className="rounded-full px-5 py-2.5 font-semibold shadow-sm"
          >
            + New Bill (F2)
          </Button>

          <Button
            variant="secondary"
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={fetchDashboardData}
            disabled={loading}
            className="rounded-full px-4 py-2.5 font-medium shadow-2xs"
          >
            Sync Data
          </Button>
        </div>
      </div>

      {/* Database Error Banner if query failed */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-retail-error text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>
              <strong>Database Connection Warning:</strong> {error}
            </span>
          </div>
          <Button size="sm" variant="danger" onClick={fetchDashboardData}>
            Retry
          </Button>
        </div>
      )}

      {/* 2. Top Summary Metric Cards Row (4 cards matching Donezo layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Featured Dark Green Card */}
        <MetricCard
          title="Total Products"
          value={loading ? '...' : metrics?.totalActiveProducts ?? 0}
          badgeText="Active in Catalog"
          variant="featured"
          onClick={() => handleQuickAction('View Products', 'products')}
        />

        {/* Card 2: Categories */}
        <MetricCard
          title="Categories & Brands"
          value={loading ? '...' : `${metrics?.totalCategories ?? 0} Cats`}
          badgeText={`${metrics?.totalBrands ?? 0} Brands Active`}
          variant="standard"
          onClick={() => handleQuickAction('View Categories', 'products')}
        />

        {/* Card 3: Stock Quantity */}
        <MetricCard
          title="Total Stock Quantity"
          value={loading ? '...' : `${metrics?.totalStockQuantity ?? 0} Units`}
          badgeText={
            metrics?.totalStockValuationPaise
              ? `${formatPaiseToRupees(metrics.totalStockValuationPaise)} Valuation`
              : 'Showroom & Warehouse'
          }
          variant="standard"
          onClick={() => handleQuickAction('View Inventory', 'inventory')}
        />

        {/* Card 4: Low Stock Alerts */}
        <MetricCard
          title="Low-Stock Alerts"
          value={loading ? '...' : metrics?.lowStockCount ?? 0}
          badgeText={
            metrics?.outOfStockCount
              ? `${metrics.outOfStockCount} Out of Stock`
              : 'Stock levels healthy'
          }
          badgeIcon={<AlertTriangle size={12} className="text-retail-warning" />}
          variant="standard"
          onClick={() => {
            const tableElem = document.getElementById('low-stock-table-anchor');
            tableElem?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      </div>

      {/* 3. Secondary Metrics / Today's Financial Strip */}
      <div className="bg-white rounded-xl border border-retail-border p-4 shadow-2xs grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-retail-border">
        <div className="px-4 py-2 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-retail-muted uppercase tracking-wider">
              Today's Sales Revenue
            </div>
            <div className="text-xl font-extrabold text-brand-dark mt-0.5">
              {loading ? '...' : formatPaiseToRupees(metrics?.todaySalesPaise ?? 0)}
            </div>
            <span className="text-[10px] text-retail-muted">
              Completed cash & UPI invoices today
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-brand-primary">
            <Receipt size={20} />
          </div>
        </div>

        <div className="px-4 py-2 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-retail-muted uppercase tracking-wider">
              Today's Purchases
            </div>
            <div className="text-xl font-extrabold text-retail-text mt-0.5">
              {loading ? '...' : formatPaiseToRupees(metrics?.todayPurchasesPaise ?? 0)}
            </div>
            <span className="text-[10px] text-retail-muted">Inward stock additions today</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
            <ShoppingCart size={20} />
          </div>
        </div>

        <div className="px-4 py-2 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-retail-muted uppercase tracking-wider">
              Stock Valuation (Cost)
            </div>
            <div className="text-xl font-extrabold text-retail-text mt-0.5">
              {loading
                ? '...'
                : formatPaiseToRupees(metrics?.totalStockValuationPaise ?? 0)}
            </div>
            <span className="text-[10px] text-emerald-700 font-medium">
              Based on purchase landed cost
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
            <Boxes size={20} />
          </div>
        </div>
      </div>

      {/* 4. Main Middle Grid: Weekly Activity, Health Donut & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Weekly Sales Activity Pill Bar Chart (5 cols) */}
        <div className="lg:col-span-5">
          <BarChart
            data={weeklySales}
            title="Weekly Sales Activity"
            subtitle="Rolling 7-day revenue performance"
          />
        </div>

        {/* Semicircular Stock Health Progress Meter (4 cols) */}
        <div className="lg:col-span-4">
          <ProgressDonut
            inStockCount={metrics?.inStockCount ?? 0}
            lowStockCount={metrics?.lowStockCount ?? 0}
            outOfStockCount={metrics?.outOfStockCount ?? 0}
            title="Stock Health & Availability"
          />
        </div>

        {/* Counter Status & Store Quick Actions (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Active Counter Shift Card */}
          <div className="bg-brand-dark rounded-2xl p-4 text-white shadow-card border border-[#165a41]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                POS Terminal 01
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight mb-1">
              OPEN SHIFT
            </div>
            <p className="text-[11px] text-white/70 mb-3">
              Ready for high-speed barcode checkout.
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={<Receipt size={14} />}
              onClick={() => handleQuickAction('Open POS Terminal', 'billing')}
              className="w-full justify-center bg-white text-brand-dark hover:bg-white/90 font-bold"
            >
              Start Billing (F2)
            </Button>
          </div>

          {/* Reusable Retail Shortcuts List */}
          <div className="bg-white rounded-2xl border border-retail-border p-4 shadow-card">
            <h4 className="text-xs font-bold text-retail-text uppercase tracking-wider mb-2.5">
              Retail Shortcuts
            </h4>
            <div className="space-y-1.5">
              <button
                onClick={() => handleQuickAction('Add New Product', 'products')}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-retail-bg text-xs text-retail-text transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-brand-primary" />
                  <span>Add Product</span>
                </div>
                <ArrowRight size={13} className="text-retail-muted" />
              </button>

              <button
                onClick={() => handleQuickAction('Search Inventory', 'inventory')}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-retail-bg text-xs text-retail-text transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Search size={14} className="text-brand-primary" />
                  <span>Search Inventory</span>
                </div>
                <span className="text-[10px] font-mono text-retail-muted">F4</span>
              </button>

              <button
                onClick={() => handleQuickAction('View Stock Reports', 'reports')}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-retail-bg text-xs text-retail-text transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={14} className="text-brand-primary" />
                  <span>GST & Stock Reports</span>
                </div>
                <ArrowRight size={13} className="text-retail-muted" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Low-Stock Inventory Alerts Table (Anchor for scroll) */}
      <div id="low-stock-table-anchor" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-retail-text tracking-tight flex items-center gap-2">
              <AlertTriangle size={18} className="text-retail-warning" />
              <span>Low-Stock Inventory Alerts</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-retail-warning/15 text-retail-warning">
                {filteredAlerts.length} items
              </span>
            </h2>
            <p className="text-xs text-retail-muted mt-0.5">
              Cricket equipment at or below minimum threshold requiring purchase orders.
            </p>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Filter alert items..."
              className="w-full px-3 py-1.5 text-xs bg-white border border-retail-border rounded-lg text-retail-text placeholder:text-retail-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
          </div>
        </div>

        <Table
          data={filteredAlerts}
          columns={tableColumns}
          keyExtractor={(item) => item.id}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          loading={loading}
          emptyTitle="Inventory Fully Stocked"
          emptySubtitle="No items currently breach their minimum reorder thresholds."
        />
      </div>

      {/* 6. Recent Transaction Feed Section */}
      <div className="bg-white rounded-2xl border border-retail-border p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-retail-text tracking-tight">
              Recent Sales & Billing Activity
            </h3>
            <p className="text-[11px] text-retail-muted mt-0.5">
              Live counter transactions recorded in local database
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleQuickAction('Open POS Billing', 'billing')}
          >
            Create Invoice
          </Button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center bg-retail-bg/60 rounded-xl border border-dashed border-retail-border">
            <Receipt size={28} className="text-retail-muted/60 mx-auto mb-2" />
            <div className="text-xs font-semibold text-retail-text">
              No Counter Invoices Recorded Yet
            </div>
            <p className="text-[11px] text-retail-muted max-w-sm mx-auto mt-1">
              Sales invoices generated through the POS Billing module (F2) will be listed here with customer names, payment status, and timestamps.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-retail-border text-xs">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-retail-text font-mono">
                    {tx.referenceNumber}
                  </span>
                  <span className="text-retail-muted text-[11px] ml-2">
                    {tx.partyName}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-retail-text">
                    {formatPaiseToRupees(tx.totalAmountPaise)}
                  </span>
                  <Badge variant={tx.status === 'COMPLETED' ? 'success' : 'neutral'}>
                    {tx.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Informative Quick Action Modal / Toast */}
      {activeModalMessage && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-retail-border space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-brand-light flex items-center justify-center text-brand-dark">
              <Sparkles size={24} />
            </div>
            <h3 className="text-base font-bold text-retail-text">Retail Module Roadmap</h3>
            <p className="text-xs text-retail-muted leading-relaxed">
              {activeModalMessage}
            </p>
            <div className="pt-2 flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setActiveModalMessage(null)}>
                Understood
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
