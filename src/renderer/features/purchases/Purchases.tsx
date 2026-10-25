import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  CreditCard,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Building2,
  Trash2,
  Info,
  Eye,
} from 'lucide-react';
import {
  Purchase,
  Supplier,
  ProductWithDetails,
  ProductVariant,
  CreatePurchaseInput,
  PaymentMode,
} from '../../../shared/types/models';
import { calculatePurchaseTotals } from '../../../shared/utils/billingMath';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';

export const Purchases: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIALLY_PAID' | 'UNPAID'>('ALL');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // New Purchase Modal State
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(1);
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [isInterState, setIsInterState] = useState(false);
  const [billDiscountRupees, setBillDiscountRupees] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');

  // Initial Tender
  const [initialPayRupees, setInitialPayRupees] = useState('');
  const [initialPayMode, setInitialPayMode] = useState<PaymentMode>('BANK_TRANSFER');
  const [initialPayRef, setInitialPayRef] = useState('');

  // Cart / Line items
  interface CartItem {
    productId: number;
    productName: string;
    variantId?: number | null;
    variantName?: string | null;
    sku: string;
    quantity: number;
    unitCostRupees: string;
    taxRatePercent: number;
  }
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Item builder inputs
  const [builderProductId, setBuilderProductId] = useState<number>(0);
  const [builderVariants, setBuilderVariants] = useState<ProductVariant[]>([]);
  const [builderVariantId, setBuilderVariantId] = useState<number | null>(null);
  const [builderQty, setBuilderQty] = useState('1');
  const [builderCostRupees, setBuilderCostRupees] = useState('');
  const [builderTaxRate, setBuilderTaxRate] = useState(12);

  // View Details Modal State
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);

  // Return Modal State
  const [returnPurchase, setReturnPurchase] = useState<Purchase | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const [returnReason, setReturnReason] = useState('Defective goods / shipment damage');
  const [returnNotes, setReturnNotes] = useState('');

  // Payment against bill Modal State
  const [payBill, setPayBill] = useState<Purchase | null>(null);
  const [billPayRupees, setBillPayRupees] = useState('');
  const [billPayMode, setBillPayMode] = useState<PaymentMode>('BANK_TRANSFER');
  const [billPayDate, setBillPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [billPayRef, setBillPayRef] = useState('');

  const loadData = async () => {
    if (!window.api) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const [purRes, supRes, prodRes] = await Promise.all([
        window.api.purchases.getAll({
          search: searchQuery || undefined,
          payment_status: statusFilter !== 'ALL' ? statusFilter : undefined,
        }),
        window.api.suppliers.getAll(),
        window.api.products.getAll(),
      ]);

      if (purRes.success) setPurchases(purRes.data);
      if (supRes.success) {
        setSuppliers(supRes.data);
        if (supRes.data.length > 0 && selectedSupplierId === 1) {
          setSelectedSupplierId(supRes.data[0].id);
        }
      }
      if (prodRes.success) {
        setProducts(prodRes.data);
        if (prodRes.data.length > 0 && builderProductId === 0) {
          setBuilderProductId(prodRes.data[0].id);
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, statusFilter]);

  // When supplier changes, auto-detect inter-state
  useEffect(() => {
    const sup = suppliers.find((s) => s.id === selectedSupplierId);
    if (sup) {
      // Shop state code default is 27 (Maharashtra)
      setIsInterState((sup.state_code || '27') !== '27');
    }
  }, [selectedSupplierId, suppliers]);

  // When builder product changes, load variants and default cost
  useEffect(() => {
    const prod = products.find((p) => p.id === builderProductId);
    if (prod) {
      setBuilderCostRupees((prod.purchase_cost_paise / 100).toFixed(2));
      setBuilderTaxRate(prod.tax_rate_percent || 12);
      if (prod.has_variants) {
        window.api?.products.getVariants(prod.id).then((res) => {
          if (res.success && res.data.length > 0) {
            setBuilderVariants(res.data);
            setBuilderVariantId(res.data[0].id);
            setBuilderCostRupees((res.data[0].purchase_cost_paise / 100).toFixed(2));
          } else {
            setBuilderVariants([]);
            setBuilderVariantId(null);
          }
        });
      } else {
        setBuilderVariants([]);
        setBuilderVariantId(null);
      }
    }
  }, [builderProductId, products]);

  // When variant changes in builder
  const handleVariantChange = (vId: number) => {
    setBuilderVariantId(vId);
    const v = builderVariants.find((x) => x.id === vId);
    if (v) {
      setBuilderCostRupees((v.purchase_cost_paise / 100).toFixed(2));
    }
  };

  const handleAddCartItem = () => {
    const prod = products.find((p) => p.id === builderProductId);
    if (!prod) return;

    const qty = parseInt(builderQty, 10);
    const cost = parseFloat(builderCostRupees);

    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Item quantity must be at least 1.');
      return;
    }
    if (isNaN(cost) || cost < 0) {
      setErrorMsg('Item unit cost cannot be negative.');
      return;
    }

    const variant = builderVariants.find((v) => v.id === builderVariantId);

    setCartItems([
      ...cartItems,
      {
        productId: prod.id,
        productName: prod.name,
        variantId: variant?.id || null,
        variantName: variant?.variant_name || null,
        sku: variant?.sku || prod.sku,
        quantity: qty,
        unitCostRupees: cost.toFixed(2),
        taxRatePercent: builderTaxRate,
      },
    ]);

    setBuilderQty('1');
    setErrorMsg('');
  };

  const handleRemoveCartItem = (index: number) => {
    setCartItems(cartItems.filter((_, idx) => idx !== index));
  };

  // Real-time Cart Totals
  const discountPaise = Math.round((parseFloat(billDiscountRupees) || 0) * 100);
  const calculatedTotals = calculatePurchaseTotals({
    items: cartItems.map((c) => ({
      unitCostPaise: Math.round(parseFloat(c.unitCostRupees) * 100),
      quantity: c.quantity,
      taxRatePercent: c.taxRatePercent,
    })),
    discountAmountPaise: discountPaise,
    isInterState,
  });

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.api) return;
    if (cartItems.length === 0) {
      setErrorMsg('Please add at least one line item to inward.');
      return;
    }
    if (!supplierInvoiceNumber.trim()) {
      setErrorMsg('Supplier invoice number is required.');
      return;
    }

    const initialPaise = Math.round((parseFloat(initialPayRupees) || 0) * 100);

    const payload: CreatePurchaseInput = {
      supplier_id: selectedSupplierId,
      supplier_invoice_number: supplierInvoiceNumber.trim(),
      purchase_date: purchaseDate,
      place_of_supply: isInterState ? '09' : '27',
      is_inter_state: isInterState,
      items: cartItems.map((it) => ({
        product_id: it.productId,
        variant_id: it.variantId || undefined,
        quantity: it.quantity,
        unit_cost_paise: Math.round(parseFloat(it.unitCostRupees) * 100),
        tax_rate_percent: it.taxRatePercent,
      })),
      discount_amount_paise: discountPaise,
      notes: purchaseNotes.trim() || undefined,
      initial_payment:
        initialPaise > 0
          ? {
              amount_paise: initialPaise,
              payment_mode: initialPayMode,
              reference_number: initialPayRef.trim() || undefined,
            }
          : undefined,
    };

    try {
      const res = await window.api.purchases.create(payload);
      if (res.success) {
        setSuccessMsg(
          `Purchase #${res.data.purchase_number} (Bill #${res.data.supplier_invoice_number}) received successfully! Inventory updated.`
        );
        setShowNewPurchaseModal(false);
        setCartItems([]);
        setSupplierInvoiceNumber('');
        setBillDiscountRupees('');
        setInitialPayRupees('');
        loadData();
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const openReturnModal = (pur: Purchase) => {
    setReturnPurchase(pur);
    const initialQty: Record<number, number> = {};
    (pur.items || []).forEach((it) => {
      initialQty[it.id] = 0;
    });
    setReturnQuantities(initialQty);
    setReturnReason('Defective goods / shipment damage');
    setReturnNotes('');
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.api || !returnPurchase) return;

    const returnItemsPayload = Object.entries(returnQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([itemIdStr, qty]) => ({
        purchase_item_id: parseInt(itemIdStr, 10),
        quantity: qty,
      }));

    if (returnItemsPayload.length === 0) {
      setErrorMsg('Please specify return quantity for at least one item.');
      return;
    }

    try {
      const res = await window.api.purchases.createReturn({
        purchase_id: returnPurchase.id,
        return_date: new Date().toISOString().split('T')[0],
        reason: returnReason.trim(),
        notes: returnNotes.trim() || undefined,
        items: returnItemsPayload,
      });

      if (res.success) {
        setSuccessMsg(
          `Return #${res.data.return_number} processed. Stock reduced and ₹${(res.data.grand_total_paise / 100).toFixed(2)} credited.`
        );
        setReturnPurchase(null);
        loadData();
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const openPayBillModal = (pur: Purchase) => {
    setPayBill(pur);
    setBillPayRupees((pur.balance_amount_paise / 100).toFixed(2));
    setBillPayMode('BANK_TRANSFER');
    setBillPayDate(new Date().toISOString().split('T')[0]);
    setBillPayRef('');
  };

  const handleRecordBillPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.api || !payBill) return;

    const rupees = parseFloat(billPayRupees);
    if (isNaN(rupees) || rupees <= 0) {
      setErrorMsg('Please enter a valid payment amount.');
      return;
    }

    try {
      const res = await window.api.payments.recordSupplierPayment({
        supplier_id: payBill.supplier_id,
        purchase_id: payBill.id,
        amount_paise: Math.round(rupees * 100),
        payment_date: billPayDate,
        payment_mode: billPayMode,
        reference_number: billPayRef.trim() || undefined,
      });

      if (res.success) {
        setSuccessMsg(`Payment of ₹${rupees.toFixed(2)} recorded for ${payBill.purchase_number}.`);
        setPayBill(null);
        loadData();
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  // Top KPIs
  const totalPurchasesPaise = purchases.reduce((sum, p) => sum + p.total_amount_paise, 0);
  const totalBalancePaise = purchases.reduce((sum, p) => sum + p.balance_amount_paise, 0);
  const unpaidCount = purchases.filter((p) => p.payment_status !== 'PAID').length;

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-retail-card p-4 rounded-xl border border-retail-border shadow-2xs">
          <div className="flex items-center justify-between text-retail-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Purchases (All Time)</span>
            <ShoppingCart size={18} className="text-brand-primary" />
          </div>
          <div className="text-2xl font-bold text-retail-text">
            ₹ {(totalPurchasesPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-retail-muted mt-1">{purchases.length} total purchase orders received</div>
        </div>

        <div className="bg-retail-card p-4 rounded-xl border border-retail-border shadow-2xs">
          <div className="flex items-center justify-between text-retail-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Outstanding Bill Dues</span>
            <AlertCircle size={18} className="text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600">
            ₹ {(totalBalancePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-retail-muted mt-1">{unpaidCount} bills awaiting full payment</div>
        </div>

        <div className="bg-retail-card p-4 rounded-xl border border-retail-border shadow-2xs">
          <div className="flex items-center justify-between text-retail-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Inter-State Inward</span>
            <Building2 size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-retail-text">
            {purchases.filter((p) => p.is_inter_state === 1).length} / {purchases.length} Bills
          </div>
          <div className="text-[11px] text-retail-muted mt-1">IGST procurement from Meerut/Jalandhar</div>
        </div>

        <div className="bg-retail-card p-4 rounded-xl border border-retail-border shadow-2xs">
          <div className="flex items-center justify-between text-retail-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Payment Status</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {purchases.filter((p) => p.payment_status === 'PAID').length} Settled
          </div>
          <div className="text-[11px] text-retail-muted mt-1">100% verified ledger balance</div>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-retail-card p-4 rounded-xl border border-retail-border shadow-2xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-retail-muted" />
            <input
              type="text"
              placeholder="Search by purchase #, bill #, supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-retail-border bg-retail-bg text-retail-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-retail-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs py-2 px-2.5 rounded-lg border border-retail-border bg-retail-bg text-retail-text focus:outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="PAID">Fully Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={loadData}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => {
              setShowNewPurchaseModal(true);
              setErrorMsg('');
            }}
          >
            + New Purchase Bill
          </Button>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-retail-card rounded-xl border border-retail-border shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-retail-bg/60 text-retail-muted border-b border-retail-border uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="px-4 py-3">Purchase #</th>
                <th className="px-4 py-3">Supplier & Bill No.</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Taxable</th>
                <th className="px-4 py-3 text-right">GST Total</th>
                <th className="px-4 py-3 text-right">Bill Total</th>
                <th className="px-4 py-3 text-right">Balance Due</th>
                <th className="px-4 py-3 text-center">Payment Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-retail-border/60 text-retail-text">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-retail-muted">
                    {loading ? 'Loading purchases...' : 'No purchase invoices found.'}
                  </td>
                </tr>
              ) : (
                purchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-retail-bg/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-retail-text">
                      {pur.purchase_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-retail-text">{pur.supplier_name_snapshot || pur.supplier_name}</div>
                      <div className="text-[11px] text-retail-muted font-mono">
                        Invoice: #{pur.supplier_invoice_number}
                        {pur.is_inter_state === 1 && (
                          <span className="ml-1.5 text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-semibold uppercase">
                            IGST
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-retail-muted font-mono">{pur.purchase_date}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      ₹ {(pur.taxable_amount_paise / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-retail-muted">
                      ₹ {(pur.total_tax_paise / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-retail-text">
                      ₹ {(pur.total_amount_paise / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {pur.balance_amount_paise > 0 ? (
                        <span className="text-red-600">₹ {(pur.balance_amount_paise / 100).toFixed(2)}</span>
                      ) : (
                        <span className="text-emerald-600">₹ 0.00</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={
                          pur.payment_status === 'PAID'
                            ? 'success'
                            : pur.payment_status === 'PARTIALLY_PAID'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {pur.payment_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Eye size={12} />}
                          onClick={() => setViewingPurchase(pur)}
                          title="View Details"
                        />
                        {pur.balance_amount_paise > 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<CreditCard size={12} />}
                            onClick={() => openPayBillModal(pur)}
                          >
                            Pay
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<RotateCcw size={12} />}
                          onClick={() => openReturnModal(pur)}
                          title="Purchase Return"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Invoice Modal */}
      <Modal
        isOpen={showNewPurchaseModal}
        onClose={() => setShowNewPurchaseModal(false)}
        title="Inward Goods & Create Purchase Bill"
        maxWidth="xl"
      >
        <form onSubmit={handleCreatePurchase} className="space-y-4">
          {/* Top metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-retail-bg p-3.5 rounded-xl border border-retail-border">
            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">
                Select Supplier <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(parseInt(e.target.value, 10))}
                className="w-full text-xs p-2 rounded-lg border border-retail-border bg-retail-card text-retail-text focus:outline-none"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.company_name || s.phone || 'Supplier'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">
                Supplier Bill / Invoice # <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. INV-2026-9901"
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">
                Purchase / Invoice Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Inter-state Tax status notification */}
          <div className="flex items-center justify-between text-xs px-2 py-1 bg-retail-card rounded border border-retail-border">
            <span className="text-retail-muted">
              Supply Location:{' '}
              <strong className="text-retail-text">
                {isInterState ? 'Inter-State (IGST Applied)' : 'Intra-State (CGST + SGST Split)'}
              </strong>
            </span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isInterState}
                onChange={(e) => setIsInterState(e.target.checked)}
                className="rounded text-brand-primary"
              />
              <span className="text-retail-muted">Force Inter-State (IGST)</span>
            </label>
          </div>

          {/* Line Item Builder */}
          <div className="bg-retail-card p-3 rounded-xl border border-retail-border space-y-3">
            <div className="text-xs font-bold text-retail-text uppercase tracking-wider">
              Add Products & Equipment to Invoice
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-retail-muted mb-1">Product</label>
                <select
                  value={builderProductId}
                  onChange={(e) => setBuilderProductId(parseInt(e.target.value, 10))}
                  className="w-full text-xs p-2 rounded-lg border border-retail-border bg-retail-bg text-retail-text focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              {builderVariants.length > 0 && (
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-retail-muted mb-1">Variant</label>
                  <select
                    value={builderVariantId || ''}
                    onChange={(e) => handleVariantChange(parseInt(e.target.value, 10))}
                    className="w-full text-xs p-2 rounded-lg border border-retail-border bg-retail-bg text-retail-text focus:outline-none"
                  >
                    {builderVariants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.variant_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={builderVariants.length > 0 ? 'sm:col-span-1' : 'sm:col-span-1'}>
                <label className="block text-[11px] font-semibold text-retail-muted mb-1">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  value={builderQty}
                  onChange={(e) => setBuilderQty(e.target.value)}
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-[11px] font-semibold text-retail-muted mb-1">Base Cost (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={builderCostRupees}
                  onChange={(e) => setBuilderCostRupees(e.target.value)}
                />
              </div>

              <div className="sm:col-span-1">
                <Button variant="primary" size="sm" type="button" onClick={handleAddCartItem} className="w-full">
                  + Add Item
                </Button>
              </div>
            </div>
          </div>

          {/* Cart Table */}
          <div className="max-h-52 overflow-y-auto rounded-lg border border-retail-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-retail-bg text-retail-muted text-[10px] uppercase font-bold sticky top-0">
                <tr>
                  <th className="px-3 py-2">Item Description</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Unit Cost</th>
                  <th className="px-3 py-2 text-right">GST %</th>
                  <th className="px-3 py-2 text-right">Taxable</th>
                  <th className="px-3 py-2 text-right">Tax</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-retail-border/60">
                {cartItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-retail-muted">
                      No items added yet. Select a product above and click '+ Add Item'.
                    </td>
                  </tr>
                ) : (
                  cartItems.map((it, idx) => {
                    const calc = calculatedTotals.items[idx];
                    return (
                      <tr key={idx} className="hover:bg-retail-bg/40">
                        <td className="px-3 py-2 font-medium text-retail-text">
                          {it.productName}
                          {it.variantName && (
                            <span className="block text-[10px] text-retail-muted">{it.variantName}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-retail-muted">{it.sku}</td>
                        <td className="px-3 py-2 text-right font-bold text-retail-text">{it.quantity}</td>
                        <td className="px-3 py-2 text-right">₹ {parseFloat(it.unitCostRupees).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{it.taxRatePercent}%</td>
                        <td className="px-3 py-2 text-right">₹ {(calc.taxableAmountPaise / 100).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-retail-muted">
                          ₹ {(calc.totalTaxPaise / 100).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-retail-text">
                          ₹ {(calc.totalAmountPaise / 100).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveCartItem(idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bill Summary and Initial Payment Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Left: Initial Payment */}
            <div className="bg-retail-bg p-3.5 rounded-xl border border-retail-border space-y-3">
              <div className="text-xs font-bold text-retail-text uppercase tracking-wider">
                Initial Payment (Optional)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-retail-muted mb-1">
                    Amount Paid (₹)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={initialPayRupees}
                    onChange={(e) => setInitialPayRupees(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-retail-muted mb-1">Payment Mode</label>
                  <select
                    value={initialPayMode}
                    onChange={(e) => setInitialPayMode(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-lg border border-retail-border bg-retail-card text-retail-text focus:outline-none"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT)</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-retail-muted mb-1">
                  Reference / UTR / Cheque #
                </label>
                <Input
                  placeholder="e.g. UTR-99881100"
                  value={initialPayRef}
                  onChange={(e) => setInitialPayRef(e.target.value)}
                />
              </div>
            </div>

            {/* Right: Totals Breakdown */}
            <div className="bg-retail-bg p-3.5 rounded-xl border border-retail-border space-y-1.5 text-xs">
              <div className="flex justify-between text-retail-muted">
                <span>Taxable Amount:</span>
                <span className="font-semibold text-retail-text">
                  ₹ {(calculatedTotals.taxableAmountPaise / 100).toFixed(2)}
                </span>
              </div>
              {isInterState ? (
                <div className="flex justify-between text-retail-muted">
                  <span>IGST (Inter-State):</span>
                  <span>₹ {(calculatedTotals.igstAmountPaise / 100).toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-retail-muted">
                    <span>CGST (Intra-State 50%):</span>
                    <span>₹ {(calculatedTotals.cgstAmountPaise / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-retail-muted">
                    <span>SGST (Intra-State 50%):</span>
                    <span>₹ {(calculatedTotals.sgstAmountPaise / 100).toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-retail-muted">
                <span>Total Taxes:</span>
                <span>₹ {(calculatedTotals.totalTaxPaise / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-retail-muted">
                <span>Round-off:</span>
                <span>₹ {(calculatedTotals.roundOffPaise / 100).toFixed(2)}</span>
              </div>
              <div className="border-t border-retail-border/60 pt-2 flex justify-between text-sm font-bold text-retail-text">
                <span>Grand Total:</span>
                <span className="text-brand-primary">
                  ₹ {(calculatedTotals.totalAmountPaise / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-retail-muted mb-1">
              Purchase Order Notes (Optional)
            </label>
            <Input
              placeholder="e.g. Received via Blue Dart cargo, verified against vendor challan"
              value={purchaseNotes}
              onChange={(e) => setPurchaseNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-retail-border">
            <Button variant="secondary" onClick={() => setShowNewPurchaseModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={cartItems.length === 0}>
              Confirm Inward & Update Stock
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Purchase Details Modal */}
      <Modal
        isOpen={!!viewingPurchase}
        onClose={() => setViewingPurchase(null)}
        title={viewingPurchase ? `Purchase Details: ${viewingPurchase.purchase_number}` : ''}
        maxWidth="lg"
      >
        {viewingPurchase && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-retail-bg p-3 rounded-lg border border-retail-border text-xs">
              <div>
                <div className="text-[10px] text-retail-muted font-bold uppercase">Supplier</div>
                <div className="font-semibold text-retail-text">{viewingPurchase.supplier_name_snapshot}</div>
              </div>
              <div>
                <div className="text-[10px] text-retail-muted font-bold uppercase">Supplier Bill #</div>
                <div className="font-mono font-semibold text-retail-text">
                  {viewingPurchase.supplier_invoice_number}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-retail-muted font-bold uppercase">Bill Date</div>
                <div className="font-mono">{viewingPurchase.purchase_date}</div>
              </div>
              <div>
                <div className="text-[10px] text-retail-muted font-bold uppercase">Balance Due</div>
                <div className="font-bold text-red-600">
                  ₹ {(viewingPurchase.balance_amount_paise / 100).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="text-xs font-bold uppercase text-retail-muted">Line Items Received</div>
            <div className="max-h-60 overflow-y-auto border border-retail-border rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-retail-bg text-retail-muted text-[10px] uppercase font-bold sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Unit Cost</th>
                    <th className="px-3 py-2 text-right">GST Rate</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Returned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-retail-border/60">
                  {(viewingPurchase.items || []).map((it) => (
                    <tr key={it.id}>
                      <td className="px-3 py-2 font-medium">
                        {it.product_name_snapshot}
                        {it.variant_name_snapshot && (
                          <span className="block text-[10px] text-retail-muted">{it.variant_name_snapshot}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-retail-muted">{it.sku_snapshot}</td>
                      <td className="px-3 py-2 text-right font-bold">{it.quantity}</td>
                      <td className="px-3 py-2 text-right">₹ {(it.unit_cost_paise / 100).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{it.tax_rate_percent}%</td>
                      <td className="px-3 py-2 text-right font-bold">
                        ₹ {(it.total_amount_paise / 100).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {it.returned_quantity > 0 ? (
                          <span className="text-blue-600 font-bold">{it.returned_quantity}</span>
                        ) : (
                          '0'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Payments against this bill */}
            {viewingPurchase.payments && viewingPurchase.payments.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase text-retail-muted mb-2">Recorded Payments</div>
                <div className="space-y-1">
                  {viewingPurchase.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center text-xs p-2 bg-retail-bg rounded border border-retail-border"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-retail-text">{p.payment_number}</span>
                        <span className="text-retail-muted">({p.payment_date})</span>
                        <Badge variant="neutral">{p.payment_mode}</Badge>
                      </div>
                      <span className="font-bold text-emerald-600">
                        ₹ {(p.amount_paise / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Return Items Modal */}
      <Modal
        isOpen={!!returnPurchase}
        onClose={() => setReturnPurchase(null)}
        title={returnPurchase ? `Process Purchase Return: ${returnPurchase.purchase_number}` : ''}
        maxWidth="lg"
      >
        <form onSubmit={handleProcessReturn} className="space-y-4">
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <Info size={16} />
            <span>
              Returning items will automatically reduce inventory and debit the supplier's payable balance.
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto border border-retail-border rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-retail-bg text-retail-muted text-[10px] uppercase font-bold sticky top-0">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 text-right">Purchased</th>
                  <th className="px-3 py-2 text-right">Already Returned</th>
                  <th className="px-3 py-2 text-right">Returnable</th>
                  <th className="px-3 py-2 text-right w-24">Return Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-retail-border/60">
                {(returnPurchase?.items || []).map((it) => {
                  const returnable = it.quantity - it.returned_quantity;
                  return (
                    <tr key={it.id}>
                      <td className="px-3 py-2 font-medium">
                        {it.product_name_snapshot}
                        {it.variant_name_snapshot && (
                          <span className="block text-[10px] text-retail-muted">{it.variant_name_snapshot}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">{it.quantity}</td>
                      <td className="px-3 py-2 text-right text-retail-muted">{it.returned_quantity}</td>
                      <td className="px-3 py-2 text-right font-bold text-retail-text">{returnable}</td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          min="0"
                          max={returnable}
                          value={returnQuantities[it.id] || 0}
                          onChange={(e) =>
                            setReturnQuantities({
                              ...returnQuantities,
                              [it.id]: Math.min(returnable, Math.max(0, parseInt(e.target.value, 10) || 0)),
                            })
                          }
                          disabled={returnable === 0}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block text-xs font-semibold text-retail-text mb-1">Return Reason</label>
            <Input
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-retail-border">
            <Button variant="secondary" onClick={() => setReturnPurchase(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Confirm Return & Adjust Stock
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bill Payment Modal */}
      <Modal
        isOpen={!!payBill}
        onClose={() => setPayBill(null)}
        title={payBill ? `Record Payment for ${payBill.purchase_number}` : ''}
        maxWidth="md"
      >
        <form onSubmit={handleRecordBillPayment} className="space-y-4">
          <div className="bg-retail-bg p-3 rounded-lg border border-retail-border text-xs flex justify-between items-center">
            <span className="text-retail-muted">Bill Outstanding Balance:</span>
            <span className="font-bold text-red-600 text-sm">
              ₹ {payBill ? (payBill.balance_amount_paise / 100).toFixed(2) : '0.00'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-retail-text mb-1">
              Payment Amount (₹) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={payBill ? payBill.balance_amount_paise / 100 : undefined}
              value={billPayRupees}
              onChange={(e) => setBillPayRupees(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">Mode</label>
              <select
                value={billPayMode}
                onChange={(e) => setBillPayMode(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-lg border border-retail-border bg-retail-bg text-retail-text focus:outline-none"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT)</option>
                <option value="UPI">UPI / QR</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">Date</label>
              <Input
                type="date"
                value={billPayDate}
                onChange={(e) => setBillPayDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-retail-text mb-1">Reference Number</label>
            <Input
              placeholder="e.g. UTR / NEFT / Cheque #"
              value={billPayRef}
              onChange={(e) => setBillPayRef(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-retail-border">
            <Button variant="secondary" onClick={() => setPayBill(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Confirm Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
