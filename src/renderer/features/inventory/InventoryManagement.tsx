import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Boxes,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  History,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Table, Column } from '../../components/Table';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { formatPaiseToRupees } from '../../utils/currency';
import {
  ProductWithDetails,
  StockMovement,
  StockAdjustmentInput,
  StockAdjustmentReason,
} from '../../../shared/types/models';

interface InventoryManagementProps {
  onNavigateToModule?: (module: any) => void;
  initialSelectedProduct?: ProductWithDetails | null;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  initialSelectedProduct,
}) => {
  const [activeTab, setActiveTab] = useState<'reconciliation' | 'ledger'>('reconciliation');
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [sortKey, setSortKey] = useState<string>('stock_quantity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithDetails | null>(null);
  const [newPhysicalStock, setNewPhysicalStock] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<StockAdjustmentReason>('PHYSICAL_AUDIT_MISMATCH');
  const [adjustNotes, setAdjustNotes] = useState<string>('');
  const [adjustSubmitting, setAdjustSubmitting] = useState<boolean>(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!window.api) {
      setProducts([]);
      setMovements([]);
      setLoading(false);
      return;
    }

    try {
      const [prodRes, movRes] = await Promise.all([
        window.api.products.getAll(),
        window.api.inventory.getStockMovements(undefined, 100),
      ]);

      if (prodRes.success) setProducts(prodRes.data);
      else setError(prodRes.error);

      if (movRes.success) setMovements(movRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open adjustment modal if initialSelectedProduct is passed
  useEffect(() => {
    if (initialSelectedProduct) {
      handleOpenAdjustModal(initialSelectedProduct);
    }
  }, [initialSelectedProduct]);

  // Calculated Inventory Metrics
  const metrics = useMemo(() => {
    const totalUnits = products.reduce((acc, p) => acc + (p.is_active ? p.stock_quantity : 0), 0);
    const totalValuation = products.reduce(
      (acc, p) => acc + (p.is_active ? p.stock_quantity * p.purchase_cost_paise : 0),
      0
    );
    const lowStockCount = products.filter(
      (p) => p.is_active && p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_level
    ).length;
    const outOfStockCount = products.filter(
      (p) => p.is_active && p.stock_quantity === 0
    ).length;

    return { totalUnits, totalValuation, lowStockCount, outOfStockCount };
  }, [products]);

  // Filtered Products for Reconciliation
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category_name.toLowerCase().includes(q) ||
          p.brand_name.toLowerCase().includes(q)
      );
    }

    if (stockStatusFilter !== 'ALL') {
      if (stockStatusFilter === 'OUT_OF_STOCK') {
        result = result.filter((p) => p.stock_quantity === 0);
      } else if (stockStatusFilter === 'LOW_STOCK') {
        result = result.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_level);
      } else if (stockStatusFilter === 'IN_STOCK') {
        result = result.filter((p) => p.stock_quantity > p.min_stock_level);
      }
    }

    result.sort((a, b) => {
      let valA: any = a[sortKey as keyof ProductWithDetails];
      let valB: any = b[sortKey as keyof ProductWithDetails];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [products, searchQuery, stockStatusFilter, sortKey, sortDirection]);

  const handleOpenAdjustModal = (product: ProductWithDetails) => {
    setSelectedProduct(product);
    setNewPhysicalStock(String(product.stock_quantity));
    setAdjustReason('PHYSICAL_AUDIT_MISMATCH');
    setAdjustNotes('');
    setAdjustError(null);
    setIsAdjustModalOpen(true);
  };

  const handleApplyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !window.api) return;

    const parsedNewStock = parseInt(newPhysicalStock, 10);
    if (isNaN(parsedNewStock) || parsedNewStock < 0) {
      setAdjustError('Please specify a valid non-negative physical stock count.');
      return;
    }

    if (parsedNewStock === selectedProduct.stock_quantity) {
      setAdjustError('New stock count is identical to current database stock. No variance found.');
      return;
    }

    setAdjustSubmitting(true);
    setAdjustError(null);

    try {
      const input: StockAdjustmentInput = {
        product_id: selectedProduct.id,
        new_quantity: parsedNewStock,
        reason: adjustReason,
        notes: adjustNotes ? adjustNotes.trim() : undefined,
      };

      const res = await window.api.inventory.adjustStock(input);
      if (res.success) {
        showNotification(
          `Stock adjusted for ${selectedProduct.name}: ${res.data.old_quantity} -> ${res.data.new_quantity} (${res.data.variance_quantity > 0 ? '+' : ''}${res.data.variance_quantity})`
        );
        setIsAdjustModalOpen(false);
        loadData();
      } else {
        setAdjustError(res.error);
      }
    } catch (err) {
      setAdjustError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Reconciliation Table Columns
  const reconciliationColumns: Column<ProductWithDetails>[] = [
    {
      id: 'name',
      header: 'Product Details',
      sortable: true,
      render: (p) => (
        <div>
          <div className="font-bold text-retail-text leading-tight">{p.name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-mono text-retail-muted">{p.sku}</span>
            <span className="text-[10px] text-retail-muted">({p.category_name} - {p.brand_name})</span>
          </div>
        </div>
      ),
    },
    {
      id: 'stock_quantity',
      header: 'Current Stock',
      sortable: true,
      align: 'center',
      render: (p) => {
        const isOut = p.stock_quantity === 0;
        const isLow = p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_level;
        return (
          <div className="inline-flex flex-col items-center">
            <span
              className={`text-xs font-extrabold px-3 py-0.5 rounded-full ${
                isOut
                  ? 'bg-retail-error/15 text-retail-error'
                  : isLow
                  ? 'bg-retail-warning/15 text-retail-warning'
                  : 'bg-brand-light text-brand-dark'
              }`}
            >
              {p.stock_quantity} {p.unit_symbol}
            </span>
          </div>
        );
      },
    },
    {
      id: 'min_stock_level',
      header: 'Thresholds',
      align: 'center',
      render: (p) => (
        <div className="text-center text-xs">
          <div>Min: <strong className="text-retail-text">{p.min_stock_level}</strong></div>
          <div className="text-[10px] text-retail-muted">Reorder: {p.reorder_level}</div>
        </div>
      ),
    },
    {
      id: 'valuation',
      header: 'Valuation at Cost',
      align: 'right',
      render: (p) => (
        <div className="text-right">
          <div className="font-bold text-retail-text">
            {formatPaiseToRupees(p.stock_quantity * p.purchase_cost_paise)}
          </div>
          <div className="text-[10px] text-retail-muted">
            @{formatPaiseToRupees(p.purchase_cost_paise)}/unit
          </div>
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Audit Action',
      align: 'right',
      render: (p) => (
        <Button
          size="sm"
          variant="secondary"
          icon={<SlidersHorizontal size={13} />}
          onClick={() => handleOpenAdjustModal(p)}
          className="text-xs py-1 px-3"
        >
          Adjust Stock
        </Button>
      ),
    },
  ];

  // Ledger Table Columns
  const ledgerColumns: Column<StockMovement>[] = [
    {
      id: 'created_at',
      header: 'Date & Time',
      sortable: true,
      render: (m) => (
        <span className="font-mono text-retail-muted text-[11px]">
          {m.created_at}
        </span>
      ),
    },
    {
      id: 'product_name',
      header: 'Product / Variant',
      render: (m) => (
        <div>
          <div className="font-semibold text-retail-text">{m.product_name}</div>
          <div className="text-[10px] text-retail-muted font-mono">
            {m.product_sku} {m.variant_name ? `• ${m.variant_name}` : ''}
          </div>
        </div>
      ),
    },
    {
      id: 'movement_type',
      header: 'Movement Type',
      render: (m) => {
        let variant: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' = 'neutral';
        if (m.movement_type === 'OPENING_STOCK') variant = 'brand';
        else if (m.movement_type === 'PURCHASE_RECEIPT') variant = 'success';
        else if (m.movement_type === 'SALE_INVOICE') variant = 'warning';
        else if (m.movement_type === 'DAMAGE_WRITE_OFF') variant = 'danger';

        return <Badge variant={variant}>{m.movement_type}</Badge>;
      },
    },
    {
      id: 'quantity_change',
      header: 'Qty Change',
      align: 'center',
      render: (m) => (
        <span
          className={`font-bold font-mono text-xs flex items-center justify-center gap-1 ${
            m.quantity_change >= 0 ? 'text-emerald-700' : 'text-retail-error'
          }`}
        >
          {m.quantity_change > 0 ? (
            <TrendingUp size={13} />
          ) : (
            <TrendingDown size={13} />
          )}
          <span>{m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}</span>
        </span>
      ),
    },
    {
      id: 'balance_quantity_after',
      header: 'Balance After',
      align: 'center',
      render: (m) => (
        <span className="font-bold text-retail-text text-xs">
          {m.balance_quantity_after}
        </span>
      ),
    },
    {
      id: 'notes',
      header: 'Reason & Notes',
      render: (m) => (
        <span className="text-retail-muted text-xs truncate max-w-xs block">
          {m.notes || 'Routine inventory transaction'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-retail-text tracking-tight font-sans flex items-center gap-2.5">
            <Boxes size={26} className="text-brand-primary" />
            <span>Inventory & Stock Audits</span>
          </h1>
          <p className="text-xs text-retail-muted mt-1">
            Real-time stock valuation, physical inventory adjustments, and immutable movement audit trail.
          </p>
        </div>

        <Button
          variant="secondary"
          icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
          onClick={loadData}
          disabled={loading}
          className="rounded-full px-4 py-2 font-medium shadow-2xs self-start sm:self-auto"
        >
          Sync Inventory
        </Button>
      </div>

      {/* Notifications */}
      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 shadow-2xs">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span className="font-medium">{notification}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-retail-error text-xs flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="danger" onClick={loadData}>
            Retry
          </Button>
        </div>
      )}

      {/* 2. Top Inventory Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-retail-border p-5 shadow-card">
          <div className="text-[11px] font-semibold text-retail-muted uppercase tracking-wider">
            Total Stock Units
          </div>
          <div className="text-2xl font-extrabold text-retail-text mt-1">
            {metrics.totalUnits} Units
          </div>
          <span className="text-[10px] text-emerald-700 font-medium mt-1 inline-block">
            Across Showroom & Store
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-retail-border p-5 shadow-card">
          <div className="text-[11px] font-semibold text-retail-muted uppercase tracking-wider">
            Inventory Valuation (Cost)
          </div>
          <div className="text-2xl font-extrabold text-brand-dark mt-1">
            {formatPaiseToRupees(metrics.totalValuation)}
          </div>
          <span className="text-[10px] text-retail-muted mt-1 inline-block">
            Total Landed Cost Value
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-retail-border p-5 shadow-card">
          <div className="text-[11px] font-semibold text-retail-muted uppercase tracking-wider">
            Low-Stock Warnings
          </div>
          <div className="text-2xl font-extrabold text-retail-warning mt-1">
            {metrics.lowStockCount}
          </div>
          <span className="text-[10px] text-retail-muted mt-1 inline-block">
            Breaching Min Threshold
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-retail-border p-5 shadow-card">
          <div className="text-[11px] font-semibold text-retail-muted uppercase tracking-wider">
            Out-of-Stock Items
          </div>
          <div className="text-2xl font-extrabold text-retail-error mt-1">
            {metrics.outOfStockCount}
          </div>
          <span className="text-[10px] text-retail-muted mt-1 inline-block">
            Requires Immediate PO
          </span>
        </div>
      </div>

      {/* 3. Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-retail-border pb-1">
        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'reconciliation'
              ? 'bg-brand-light text-brand-dark shadow-2xs'
              : 'text-retail-muted hover:text-retail-text hover:bg-white'
          }`}
        >
          <SlidersHorizontal size={15} />
          <span>Stock Reconciliation & Audit ({filteredProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ledger'
              ? 'bg-brand-light text-brand-dark shadow-2xs'
              : 'text-retail-muted hover:text-retail-text hover:bg-white'
          }`}
        >
          <History size={15} />
          <span>Immutable Movement Ledger ({movements.length})</span>
        </button>
      </div>

      {/* Tab 1: Reconciliation View */}
      {activeTab === 'reconciliation' ? (
        <div className="space-y-4">
          {/* Search & Stock Status Filters */}
          <div className="bg-white rounded-2xl border border-retail-border p-4 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-retail-muted">
                <Search size={15} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search inventory items, SKU, category..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-retail-bg border border-retail-border rounded-xl text-retail-text placeholder:text-retail-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value as any)}
                className="py-2 px-3 text-xs bg-retail-bg border border-retail-border rounded-xl text-retail-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                <option value="ALL">All Levels</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>
          </div>

          <Table
            data={filteredProducts}
            columns={reconciliationColumns}
            keyExtractor={(p) => p.id}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={(col) => {
              if (sortKey === col) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
              else {
                setSortKey(col);
                setSortDirection('asc');
              }
            }}
            loading={loading}
            emptyTitle="No Items Matched Filter"
            emptySubtitle="Check search filters or ensure products are active in the catalog."
          />
        </div>
      ) : (
        /* Tab 2: Ledger View */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-retail-border p-4 shadow-card flex items-center justify-between text-xs text-retail-muted">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-brand-primary" />
              <span>
                Immutable double-entry audit trail tracking all inward receipts, POS sales, and physical adjustments.
              </span>
            </div>
            <span className="font-mono text-[11px]">Logged in SQLite</span>
          </div>

          <Table
            data={movements}
            columns={ledgerColumns}
            keyExtractor={(m) => m.id}
            loading={loading}
            emptyTitle="No Stock Movements Recorded"
            emptySubtitle="Stock movements will automatically populate as products are added, adjusted, or sold."
          />
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {selectedProduct && (
        <Modal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          title={`Adjust Physical Stock: ${selectedProduct.name}`}
          subtitle={`Current DB Stock: ${selectedProduct.stock_quantity} ${selectedProduct.unit_symbol} (SKU: ${selectedProduct.sku})`}
          maxWidth="lg"
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAdjustModalOpen(false)}
                disabled={adjustSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyAdjustment}
                loading={adjustSubmitting}
              >
                Apply Stock Adjustment
              </Button>
            </>
          }
        >
          <form onSubmit={handleApplyAdjustment} className="space-y-4 text-xs">
            {adjustError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-retail-error flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{adjustError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 bg-retail-bg p-3 rounded-xl border border-retail-border text-center">
              <div>
                <span className="text-[10px] text-retail-muted uppercase font-semibold">Current Count</span>
                <div className="text-xl font-bold text-retail-text mt-0.5">
                  {selectedProduct.stock_quantity}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-retail-muted uppercase font-semibold">Variance</span>
                {(() => {
                  const parsed = parseInt(newPhysicalStock, 10);
                  const variance = isNaN(parsed) ? 0 : parsed - selectedProduct.stock_quantity;
                  return (
                    <div
                      className={`text-xl font-bold mt-0.5 ${
                        variance > 0
                          ? 'text-emerald-700'
                          : variance < 0
                          ? 'text-retail-error'
                          : 'text-retail-muted'
                      }`}
                    >
                      {variance > 0 ? `+${variance}` : variance}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div>
              <label htmlFor="adjust-physical-stock" className="block text-[11px] font-semibold text-retail-text mb-1 uppercase tracking-wider">
                New Verified Physical Count *
              </label>
              <input
                id="adjust-physical-stock"
                type="number"
                min="0"
                required
                value={newPhysicalStock}
                onChange={(e) => setNewPhysicalStock(e.target.value)}
                className="w-full text-base font-bold font-mono p-2.5 rounded-lg border border-retail-border bg-white text-retail-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
              <span className="text-[10px] text-retail-muted mt-1 block">
                Enter the exact count verified during physical shelf or showroom count.
              </span>
            </div>

            <div>
              <label htmlFor="adjust-reason-code" className="block text-[11px] font-semibold text-retail-text mb-1 uppercase tracking-wider">
                Mandatory Reason Code *
              </label>
              <select
                id="adjust-reason-code"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value as StockAdjustmentReason)}
                className="w-full p-2.5 rounded-lg border border-retail-border bg-white text-retail-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                <option value="PHYSICAL_AUDIT_MISMATCH">Physical Stock Audit Mismatch</option>
                <option value="DAMAGED_IN_STORE">Damaged / Broken in Showroom</option>
                <option value="EXPIRED_DEFECTIVE">Defective / Manufacturer Return</option>
                <option value="SAMPLE_DEMO">Store Demo / Display Sample</option>
                <option value="THEFT_OR_LOSS">Unaccounted Shrinkage / Loss</option>
                <option value="FOUND_SURPLUS">Found Surplus / Previous Count Error</option>
                <option value="OTHER">Other Operational Adjustment</option>
              </select>
            </div>

            <div>
              <label htmlFor="adjust-notes" className="block text-[11px] font-semibold text-retail-text mb-1 uppercase tracking-wider">
                Audit Notes & Comments
              </label>
              <textarea
                id="adjust-notes"
                rows={3}
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="Optional explanation for audit tracking..."
                className="w-full p-2.5 rounded-lg border border-retail-border bg-white text-retail-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
