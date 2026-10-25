import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Printer,
  CreditCard,
  QrCode,
  Banknote,
  AlertTriangle,
  Receipt,
  UserPlus,
  History,
  X,
  Split,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import {
  ProductWithDetails,
  ProductVariant,
  Customer,
  SalesInvoice,
  PaymentMode,
  CreateInvoiceInput,
} from '../../../shared/types/models';
import {
  calculateInvoiceTotals,
  amountInWordsIndian,
} from '../../../shared/utils/billingMath';
import { formatPaiseToRupees, parseRupeesToPaise } from '../../utils/currency';

interface CartItem {
  id: string; // unique cart key: `${productId}-${variantId || 'std'}`
  product_id: number;
  variant_id?: number | null;
  name: string;
  variant_name?: string | null;
  sku: string;
  barcode?: string | null;
  hsn_code: string;
  unit_symbol: string;
  tax_rate_percent: number;
  unit_price_paise: number;
  mrp_paise: number;
  available_stock: number;
  quantity: number;
  discount_amount_paise: number;
}

export const PosBilling: React.FC = () => {
  // 1. Data States
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [shopSettings, setShopSettings] = useState<{
    shopName: string;
    shopGstin: string;
    shopAddress: string;
    shopPhone: string;
    shopEmail: string;
    shopStateCode: string;
  }>({
    shopName: 'Cricket360 Sports & Pro Shop',
    shopGstin: '27AABBC1234D1Z5',
    shopAddress: '12, Sports Complex Road, Mumbai, Maharashtra',
    shopPhone: '+91 98765 43210',
    shopEmail: 'contact@cricket360.local',
    shopStateCode: '27',
  });

  // Cart & Pricing
  const [cart, setCart] = useState<CartItem[]>([]);
  const [invoiceDiscountRupees, setInvoiceDiscountRupees] = useState<string>('0');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [cashTenderedRupees, setCashTenderedRupees] = useState<string>('');
  const [upiRefNumber, setUpiRefNumber] = useState<string>('');
  const [cardRefNumber, setCardRefNumber] = useState<string>('');
  const [splitCashRupees, setSplitCashRupees] = useState<string>('');
  const [splitUpiRupees, setSplitUpiRupees] = useState<string>('');
  const [invoiceNotes, setInvoiceNotes] = useState<string>('');

  // Search & Navigation States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [invoicesHistory, setInvoicesHistory] = useState<SalesInvoice[]>([]);
  const [historySearch, setHistorySearch] = useState<string>('');

  // Modals
  const [variantPickerProduct, setVariantPickerProduct] = useState<ProductWithDetails | null>(null);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState<boolean>(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    gstin: '',
    address: '',
    state_code: '27',
  });
  const [completedInvoice, setCompletedInvoice] = useState<SalesInvoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [printFormat, setPrintFormat] = useState<'A4' | 'THERMAL'>('A4');

  // Cancellation Modal
  const [invoiceToCancel, setInvoiceToCancel] = useState<SalesInvoice | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Status/Error Messages
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load Initial Data
  const loadInitialData = async () => {
    if (window.api) {
      try {
        const [prodRes, custRes, setRes] = await Promise.all([
          window.api.products.getAll({ is_active: 1 }),
          window.api.customers.search(),
          window.api.billing.getShopSettings(),
        ]);

        if (prodRes.success) setProducts(prodRes.data);
        if (custRes.success) {
          setCustomers(custRes.data);
          // Set default to Walk-in customer (id 1)
          const walkIn = custRes.data.find((c) => c.id === 1) || custRes.data[0];
          setSelectedCustomer(walkIn || null);
        }
        if (setRes.success) setShopSettings(setRes.data);
      } catch (err) {
        console.error('Error loading POS initial data:', err);
      }
    }
  };

  const loadInvoicesHistory = async () => {
    if (window.api) {
      try {
        const res = await window.api.billing.getInvoices({ search: historySearch });
        if (res.success) {
          setInvoicesHistory(res.data);
        }
      } catch (err) {
        console.error('Error loading invoices history:', err);
      }
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadInvoicesHistory();
    }
  }, [activeTab, historySearch]);

  // Global Keyboard Shortcuts (F2: focus search, F10: checkout)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'F10') {
        e.preventDefault();
        if (cart.length > 0 && !isInvoiceModalOpen && !invoiceToCancel) {
          handleCompleteSale();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedCustomer, paymentMode, cashTenderedRupees, splitCashRupees, splitUpiRupees]);

  // Determine Inter-state Transaction (Customer State != Shop State)
  const isInterState = useMemo(() => {
    const custState = selectedCustomer?.state_code || shopSettings.shopStateCode;
    return custState !== shopSettings.shopStateCode;
  }, [selectedCustomer, shopSettings.shopStateCode]);

  // Compute Live Cart Totals
  const totals = useMemo(() => {
    const invoiceDiscPaise = parseRupeesToPaise(invoiceDiscountRupees);
    return calculateInvoiceTotals({
      items: cart.map((c) => ({
        unitPricePaise: c.unit_price_paise,
        quantity: c.quantity,
        discountAmountPaise: c.discount_amount_paise,
        taxRatePercent: c.tax_rate_percent,
      })),
      invoiceDiscountPaise: invoiceDiscPaise,
      isInterState,
    });
  }, [cart, invoiceDiscountRupees, isInterState]);

  // Real-time Change Due calculation for Cash Tender
  const cashChangeDuePaise = useMemo(() => {
    if (paymentMode !== 'CASH') return 0;
    const tenderedPaise = parseRupeesToPaise(cashTenderedRupees);
    return Math.max(0, tenderedPaise - totals.grandTotalPaise);
  }, [paymentMode, cashTenderedRupees, totals.grandTotalPaise]);

  // Filter Catalog Items for Fast Selection
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategoryFilter !== 'ALL' && p.category_name !== selectedCategoryFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku.toLowerCase().includes(q);
      const matchBarcode = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
      const matchBrand = p.brand_name.toLowerCase().includes(q);
      return matchName || matchSku || matchBarcode || matchBrand;
    });
  }, [products, searchQuery, selectedCategoryFilter]);

  // Cart Management Actions
  const handleAddToCart = (product: ProductWithDetails, variant?: ProductVariant) => {
    // If product has variants and no variant was picked yet, open variant selector
    if (product.has_variants && !variant) {
      setVariantPickerProduct(product);
      return;
    }

    const cartKey = `${product.id}-${variant ? variant.id : 'std'}`;
    const availableStock = variant ? variant.stock_quantity : product.stock_quantity;
    const unitPricePaise = variant ? variant.selling_price_paise : product.selling_price_paise;
    const mrpPaise = variant ? variant.mrp_paise : product.mrp_paise;
    const taxRatePercent = variant?.tax_rate_percent ?? product.tax_rate_percent ?? 12.0;

    if (availableStock <= 0) {
      setCheckoutError(`Cannot add "${product.name}". Item is out of stock!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === cartKey);
      if (existing) {
        if (existing.quantity >= availableStock) {
          setCheckoutError(
            `Maximum available stock reached for ${product.name} (${availableStock} units).`
          );
          return prev;
        }
        return prev.map((item) =>
          item.id === cartKey ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [
          ...prev,
          {
            id: cartKey,
            product_id: product.id,
            variant_id: variant ? variant.id : null,
            name: product.name,
            variant_name: variant ? variant.variant_name : null,
            sku: variant ? variant.sku : product.sku,
            barcode: variant ? variant.barcode : product.barcode,
            hsn_code: product.hsn_code || '9506',
            unit_symbol: product.unit_symbol || 'Pcs',
            tax_rate_percent: taxRatePercent,
            unit_price_paise: unitPricePaise,
            mrp_paise: mrpPaise,
            available_stock: availableStock,
            quantity: 1,
            discount_amount_paise: 0,
          },
        ];
      }
    });

    setCheckoutError(null);
    setSearchQuery('');
  };

  const handleUpdateQuantity = (cartKey: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(cartKey);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.id === cartKey) {
          if (newQty > item.available_stock) {
            setCheckoutError(
              `Cannot exceed available stock of ${item.available_stock} units for ${item.name}.`
            );
            return { ...item, quantity: item.available_stock };
          }
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const handleUpdateItemDiscount = (cartKey: string, discountRupees: string) => {
    const discPaise = parseRupeesToPaise(discountRupees);
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === cartKey) {
          const maxDiscount = item.unit_price_paise * item.quantity;
          return {
            ...item,
            discount_amount_paise: Math.min(discPaise, maxDiscount),
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (cartKey: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartKey));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Clear all items from the current sales cart?')) {
      setCart([]);
      setInvoiceDiscountRupees('0');
      setCashTenderedRupees('');
      setSplitCashRupees('');
      setSplitUpiRupees('');
      setCheckoutError(null);
    }
  };

  // Barcode Scanning / Fast Search Enter Key Handler
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = searchQuery.trim();
      if (!q) return;

      // Check for exact barcode or SKU match
      const exactMatch = products.find(
        (p) =>
          p.barcode?.toLowerCase() === q.toLowerCase() ||
          p.sku.toLowerCase() === q.toLowerCase() ||
          p.variants?.some(
            (v) =>
              v.barcode?.toLowerCase() === q.toLowerCase() ||
              v.sku.toLowerCase() === q.toLowerCase()
          )
      );

      if (exactMatch) {
        if (exactMatch.has_variants) {
          const matchingVar = exactMatch.variants?.find(
            (v) =>
              v.barcode?.toLowerCase() === q.toLowerCase() ||
              v.sku.toLowerCase() === q.toLowerCase()
          );
          if (matchingVar) {
            handleAddToCart(exactMatch, matchingVar);
          } else {
            setVariantPickerProduct(exactMatch);
          }
        } else {
          handleAddToCart(exactMatch);
        }
      } else if (filteredProducts.length === 1) {
        handleAddToCart(filteredProducts[0]);
      }
    }
  };

  // Customer Management
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim()) return;

    if (window.api) {
      try {
        const res = await window.api.customers.create(newCustomerForm);
        if (res.success) {
          setCustomers((prev) => [...prev, res.data]);
          setSelectedCustomer(res.data);
          setIsNewCustomerModalOpen(false);
          setNewCustomerForm({
            name: '',
            phone: '',
            gstin: '',
            address: '',
            state_code: '27',
          });
        } else {
          alert(`Failed to create customer: ${res.error}`);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Checkout / Sale Submission
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setCheckoutError('Cannot complete sale with an empty cart.');
      return;
    }

    setCheckoutError(null);
    setIsSubmitting(true);

    try {
      // 1. Prepare payment tender array
      const payments = [];
      if (paymentMode === 'CASH') {
        const tenderedPaise = parseRupeesToPaise(cashTenderedRupees) || totals.grandTotalPaise;
        payments.push({
          mode: 'CASH' as PaymentMode,
          amount_paise: tenderedPaise >= totals.grandTotalPaise ? totals.grandTotalPaise : tenderedPaise,
        });
      } else if (paymentMode === 'UPI') {
        payments.push({
          mode: 'UPI' as PaymentMode,
          amount_paise: totals.grandTotalPaise,
          reference_number: upiRefNumber.trim() || undefined,
        });
      } else if (paymentMode === 'CARD') {
        payments.push({
          mode: 'CARD' as PaymentMode,
          amount_paise: totals.grandTotalPaise,
          reference_number: cardRefNumber.trim() || undefined,
        });
      } else if (paymentMode === 'SPLIT' as any) {
        const cashP = parseRupeesToPaise(splitCashRupees);
        const upiP = parseRupeesToPaise(splitUpiRupees);
        if (cashP + upiP < totals.grandTotalPaise && selectedCustomer?.id === 1) {
          setCheckoutError(
            `Split payment sum (₹${((cashP + upiP) / 100).toFixed(2)}) is less than grand total (₹${(
              totals.grandTotalPaise / 100
            ).toFixed(2)}). Walk-in sales must be fully paid.`
          );
          setIsSubmitting(false);
          return;
        }
        if (cashP > 0) payments.push({ mode: 'CASH' as PaymentMode, amount_paise: cashP });
        if (upiP > 0) payments.push({ mode: 'UPI' as PaymentMode, amount_paise: upiP });
      }

      const input: CreateInvoiceInput = {
        customer_id: selectedCustomer?.id || 1,
        customer_name: selectedCustomer?.name,
        customer_phone: selectedCustomer?.phone ?? null,
        customer_gstin: selectedCustomer?.gstin ?? null,
        customer_address: selectedCustomer?.address ?? null,
        customer_state_code: selectedCustomer?.state_code || shopSettings.shopStateCode,
        items: cart.map((c) => ({
          product_id: c.product_id,
          variant_id: c.variant_id ?? null,
          quantity: c.quantity,
          unit_price_paise: c.unit_price_paise,
          discount_amount_paise: c.discount_amount_paise,
        })),
        discount_amount_paise: parseRupeesToPaise(invoiceDiscountRupees),
        payments,
        notes: invoiceNotes.trim() || null,
      };

      if (!window.api) {
        alert('Simulated Sale: Desktop API unavailable in browser mode.');
        setIsSubmitting(false);
        return;
      }

      const res = await window.api.billing.createInvoice(input);

      if (res.success) {
        setCompletedInvoice(res.data);
        setIsInvoiceModalOpen(true);
        // Reset POS Form
        setCart([]);
        setInvoiceDiscountRupees('0');
        setCashTenderedRupees('');
        setSplitCashRupees('');
        setSplitUpiRupees('');
        setUpiRefNumber('');
        setCardRefNumber('');
        setInvoiceNotes('');
        // Refresh product stock balances
        loadInitialData();
      } else {
        setCheckoutError(res.error);
      }
    } catch (err: any) {
      setCheckoutError(err.message || 'An error occurred while creating invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Void/Cancel Invoice Action
  const handleConfirmCancelInvoice = async () => {
    if (!invoiceToCancel) return;
    if (!cancelReason.trim()) {
      setCancelError('Please enter a mandatory cancellation reason.');
      return;
    }

    if (!window.api) return;

    try {
      const res = await window.api.billing.cancelInvoice(invoiceToCancel.id, cancelReason);
      if (res.success) {
        setInvoiceToCancel(null);
        setCancelReason('');
        setCancelError(null);
        loadInvoicesHistory();
        loadInitialData();
      } else {
        setCancelError(res.error);
      }
    } catch (err: any) {
      setCancelError(err.message || 'Cancellation failed.');
    }
  };

  // Print Invoice Action
  const handlePrint = () => {
    window.print();
  };

  const categoriesList = useMemo(() => {
    const cats = new Set(products.map((p) => p.category_name));
    return ['ALL', ...Array.from(cats)];
  }, [products]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto select-none">
      {/* 1. Header & Module Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-retail-text tracking-tight font-sans flex items-center gap-2.5">
            <Receipt className="text-brand-primary" size={26} />
            <span>POS & GST Billing Register</span>
          </h1>
          <p className="text-xs text-retail-muted mt-0.5">
            High-speed counter checkout, barcode scanner integration, GST calculation, and thermal/A4 printing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-retail-bg p-1 rounded-xl border border-retail-border flex items-center gap-1">
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'pos'
                  ? 'bg-brand-primary text-white shadow-2xs'
                  : 'text-retail-muted hover:text-retail-text'
              }`}
            >
              <ShoppingCart size={14} />
              <span>Counter POS</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-brand-primary text-white shadow-2xs'
                  : 'text-retail-muted hover:text-retail-text'
              }`}
            >
              <History size={14} />
              <span>Sales Invoices</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'pos' ? (
        /* POS WORKSPACE: 2-COLUMN LAYOUT */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT 7 COLS: PRODUCT SEARCH & CART TABLE */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search & Category Filter Bar */}
            <div className="bg-white rounded-2xl border border-retail-border p-3.5 shadow-card space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-retail-muted">
                  <Search size={16} />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Scan barcode or search cricket bats, balls, pads, shoes (F2)..."
                  className="w-full pl-9 pr-20 py-2.5 text-xs bg-retail-bg border border-retail-border rounded-xl text-retail-text placeholder:text-retail-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-retail-border text-retail-muted">
                    F2
                  </span>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                {categoriesList.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
                      selectedCategoryFilter === cat
                        ? 'bg-brand-dark text-white'
                        : 'bg-retail-bg text-retail-muted hover:text-retail-text border border-retail-border'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Results Picker when typing search */}
            {searchQuery.trim().length > 0 && (
              <div className="bg-white rounded-2xl border border-retail-border p-3 shadow-card max-h-56 overflow-y-auto divide-y divide-retail-border">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-4 text-xs text-retail-muted">
                    No products matching "{searchQuery}". Check spelling or add in Catalog.
                  </div>
                ) : (
                  filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleAddToCart(p)}
                      className="py-2 px-2 hover:bg-retail-bg rounded-lg cursor-pointer flex items-center justify-between transition-colors text-xs"
                    >
                      <div>
                        <div className="font-bold text-retail-text">{p.name}</div>
                        <div className="text-[11px] text-retail-muted flex items-center gap-2">
                          <span className="font-mono">{p.sku}</span>
                          <span>• {p.brand_name}</span>
                          <span>• HSN: {p.hsn_code}</span>
                          {p.has_variants ? (
                            <span className="text-brand-primary font-semibold">Has Variants</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-brand-dark">
                          {formatPaiseToRupees(p.selling_price_paise)}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            p.stock_quantity > 0
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-retail-error'
                          }`}
                        >
                          {p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : 'Out of stock'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Cart Table */}
            <div className="bg-white rounded-2xl border border-retail-border shadow-card overflow-hidden">
              <div className="p-4 border-b border-retail-border flex items-center justify-between bg-retail-bg/40">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-brand-primary" />
                  <h3 className="font-bold text-retail-text text-sm">
                    Current Sales Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)} Items)
                  </h3>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-xs text-retail-error hover:underline flex items-center gap-1"
                  >
                    <Trash2 size={13} />
                    <span>Clear Cart</span>
                  </button>
                )}
              </div>

              {checkoutError && (
                <div className="m-3 p-3 bg-red-50 border border-red-200 rounded-xl text-retail-error text-xs flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{checkoutError}</span>
                </div>
              )}

              {cart.length === 0 ? (
                <div className="py-16 text-center text-retail-muted space-y-2">
                  <ShoppingCart size={36} className="mx-auto text-retail-muted/40 stroke-1" />
                  <p className="text-xs font-semibold">Cart is currently empty</p>
                  <p className="text-[11px] text-retail-muted/80">
                    Scan a product barcode or search above to begin counter checkout.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-retail-bg text-retail-muted font-bold uppercase text-[10px] border-b border-retail-border">
                      <tr>
                        <th className="py-2.5 px-3">Item Details</th>
                        <th className="py-2.5 px-2 text-right">Rate</th>
                        <th className="py-2.5 px-2 text-center">Qty</th>
                        <th className="py-2.5 px-2 text-right">Disc (₹)</th>
                        <th className="py-2.5 px-2 text-center">GST %</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                        <th className="py-2.5 px-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-retail-border">
                      {cart.map((item) => {
                        const lineTotal = Math.max(
                          0,
                          item.unit_price_paise * item.quantity - item.discount_amount_paise
                        );
                        return (
                          <tr key={item.id} className="hover:bg-retail-bg/30">
                            <td className="py-3 px-3">
                              <div className="font-bold text-retail-text">{item.name}</div>
                              <div className="text-[11px] text-retail-muted flex items-center gap-1.5 mt-0.5">
                                {item.variant_name && (
                                  <span className="font-semibold text-brand-dark">
                                    {item.variant_name} •
                                  </span>
                                )}
                                <span className="font-mono text-[10px]">{item.sku}</span>
                                <span>• HSN {item.hsn_code}</span>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right font-mono font-semibold text-retail-text">
                              {formatPaiseToRupees(item.unit_price_paise)}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                  className="w-6 h-6 rounded bg-retail-bg hover:bg-slate-200 flex items-center justify-center text-retail-text font-bold"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-8 text-center font-bold font-mono">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                  className="w-6 h-6 rounded bg-retail-bg hover:bg-slate-200 flex items-center justify-center text-retail-text font-bold"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <input
                                type="number"
                                min="0"
                                value={(item.discount_amount_paise / 100).toFixed(0)}
                                onChange={(e) => handleUpdateItemDiscount(item.id, e.target.value)}
                                className="w-14 py-1 px-1.5 text-right font-mono text-xs border border-retail-border rounded bg-retail-bg text-retail-text"
                              />
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 rounded text-retail-muted">
                                {item.tax_rate_percent}%
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-retail-text">
                              {formatPaiseToRupees(lineTotal)}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1 text-retail-muted hover:text-retail-error transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 5 COLS: CUSTOMER, TAX BREAKDOWN, PAYMENT & CHECKOUT */}
          <div className="lg:col-span-5 space-y-4">
            {/* Customer Selector Card */}
            <div className="bg-white rounded-2xl border border-retail-border p-4 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-retail-muted uppercase tracking-wider">
                  Customer & Place of Supply
                </span>
                <button
                  onClick={() => setIsNewCustomerModalOpen(true)}
                  className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
                >
                  <UserPlus size={13} />
                  <span>+ New</span>
                </button>
              </div>

              <select
                value={selectedCustomer?.id || 1}
                onChange={(e) => {
                  const cust = customers.find((c) => c.id === parseInt(e.target.value, 10));
                  setSelectedCustomer(cust || null);
                }}
                className="w-full p-2.5 rounded-xl border border-retail-border bg-retail-bg text-retail-text text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} - State: {c.state_code || '27'}
                  </option>
                ))}
              </select>

              {/* Tax Type Badge */}
              <div className="p-2.5 rounded-xl bg-retail-bg border border-retail-border flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-retail-muted uppercase font-semibold">GST Type:</span>
                  <div className="font-bold text-retail-text">
                    {isInterState ? 'Inter-State (IGST 100%)' : 'Intra-State (CGST 50% + SGST 50%)'}
                  </div>
                </div>
                <Badge variant={isInterState ? 'warning' : 'brand'}>
                  State {selectedCustomer?.state_code || '27'}
                </Badge>
              </div>
            </div>

            {/* Bill Summary & GST Breakdown Card */}
            <div className="bg-white rounded-2xl border border-retail-border p-4 shadow-card space-y-3">
              <span className="text-[11px] font-semibold text-retail-muted uppercase tracking-wider block">
                Bill Summary & Tax Details
              </span>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-retail-muted">
                  <span>Taxable Value (Net):</span>
                  <span className="font-mono font-medium text-retail-text">
                    {formatPaiseToRupees(totals.taxableAmountPaise)}
                  </span>
                </div>

                {/* GST Details */}
                {isInterState ? (
                  <div className="flex justify-between text-retail-muted">
                    <span>Integrated GST (IGST):</span>
                    <span className="font-mono font-semibold text-brand-dark">
                      {formatPaiseToRupees(totals.igstAmountPaise)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-retail-muted">
                      <span>Central GST (CGST):</span>
                      <span className="font-mono font-semibold text-brand-dark">
                        {formatPaiseToRupees(totals.cgstAmountPaise)}
                      </span>
                    </div>
                    <div className="flex justify-between text-retail-muted">
                      <span>State GST (SGST):</span>
                      <span className="font-mono font-semibold text-brand-dark">
                        {formatPaiseToRupees(totals.sgstAmountPaise)}
                      </span>
                    </div>
                  </>
                )}

                {/* Invoice Discount Input */}
                <div className="flex items-center justify-between pt-1 border-t border-retail-border">
                  <span className="text-retail-muted">Invoice Discount (₹):</span>
                  <input
                    type="number"
                    min="0"
                    value={invoiceDiscountRupees}
                    onChange={(e) => setInvoiceDiscountRupees(e.target.value)}
                    className="w-20 py-1 px-2 text-right font-mono text-xs border border-retail-border rounded bg-retail-bg text-retail-text"
                  />
                </div>

                {/* Round Off */}
                <div className="flex justify-between text-retail-muted text-[11px]">
                  <span>Round-off:</span>
                  <span className="font-mono">
                    {totals.roundOffPaise >= 0 ? `+` : ''}
                    {(totals.roundOffPaise / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Grand Total Banner */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-brand-dark to-brand-primary text-white flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider block">
                    Grand Total
                  </span>
                  <span className="text-2xl font-black font-mono tracking-tight">
                    {formatPaiseToRupees(totals.grandTotalPaise)}
                  </span>
                </div>
                <div className="text-right text-[11px] text-white/80">
                  <span>Net Payable</span>
                </div>
              </div>

              {/* Tender / Payment Modes */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-semibold text-retail-muted uppercase tracking-wider block">
                  Payment Method
                </span>

                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => setPaymentMode('CASH')}
                    className={`py-2 px-1 rounded-xl font-bold text-xs flex flex-col items-center gap-1 border transition-all ${
                      paymentMode === 'CASH'
                        ? 'bg-brand-light text-brand-dark border-brand-primary'
                        : 'bg-retail-bg text-retail-muted border-retail-border hover:bg-slate-100'
                    }`}
                  >
                    <Banknote size={16} />
                    <span>Cash</span>
                  </button>

                  <button
                    onClick={() => setPaymentMode('UPI')}
                    className={`py-2 px-1 rounded-xl font-bold text-xs flex flex-col items-center gap-1 border transition-all ${
                      paymentMode === 'UPI'
                        ? 'bg-brand-light text-brand-dark border-brand-primary'
                        : 'bg-retail-bg text-retail-muted border-retail-border hover:bg-slate-100'
                    }`}
                  >
                    <QrCode size={16} />
                    <span>UPI QR</span>
                  </button>

                  <button
                    onClick={() => setPaymentMode('CARD')}
                    className={`py-2 px-1 rounded-xl font-bold text-xs flex flex-col items-center gap-1 border transition-all ${
                      paymentMode === 'CARD'
                        ? 'bg-brand-light text-brand-dark border-brand-primary'
                        : 'bg-retail-bg text-retail-muted border-retail-border hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard size={16} />
                    <span>Card</span>
                  </button>

                  <button
                    onClick={() => setPaymentMode('SPLIT' as any)}
                    className={`py-2 px-1 rounded-xl font-bold text-xs flex flex-col items-center gap-1 border transition-all ${
                      paymentMode === ('SPLIT' as any)
                        ? 'bg-brand-light text-brand-dark border-brand-primary'
                        : 'bg-retail-bg text-retail-muted border-retail-border hover:bg-slate-100'
                    }`}
                  >
                    <Split size={16} />
                    <span>Split</span>
                  </button>
                </div>

                {/* Conditional Payment Mode Detail Form */}
                {paymentMode === 'CASH' && (
                  <div className="p-3 bg-retail-bg rounded-xl border border-retail-border space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-retail-muted">Cash Tendered (₹):</span>
                      <input
                        type="number"
                        placeholder={(totals.grandTotalPaise / 100).toFixed(0)}
                        value={cashTenderedRupees}
                        onChange={(e) => setCashTenderedRupees(e.target.value)}
                        className="w-28 p-1.5 text-right font-mono font-bold text-xs border border-retail-border rounded bg-white"
                      />
                    </div>
                    {cashChangeDuePaise > 0 && (
                      <div className="flex items-center justify-between pt-1 border-t border-retail-border text-emerald-700 font-bold">
                        <span>Change to Return:</span>
                        <span className="font-mono text-sm">
                          {formatPaiseToRupees(cashChangeDuePaise)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {paymentMode === 'UPI' && (
                  <div className="p-3 bg-retail-bg rounded-xl border border-retail-border space-y-2 text-xs">
                    <div className="text-[11px] text-retail-muted flex items-center gap-1.5">
                      <QrCode size={14} className="text-brand-primary" />
                      <span>Dynamic Store UPI ID: <strong>cricket360@okaxis</strong></span>
                    </div>
                    <input
                      type="text"
                      placeholder="Optional UPI UTR / Transaction Reference..."
                      value={upiRefNumber}
                      onChange={(e) => setUpiRefNumber(e.target.value)}
                      className="w-full p-2 text-xs border border-retail-border rounded-lg bg-white"
                    />
                  </div>
                )}

                {paymentMode === 'CARD' && (
                  <div className="p-3 bg-retail-bg rounded-xl border border-retail-border space-y-2 text-xs">
                    <input
                      type="text"
                      placeholder="Card last 4 digits / POS auth code..."
                      value={cardRefNumber}
                      onChange={(e) => setCardRefNumber(e.target.value)}
                      className="w-full p-2 text-xs border border-retail-border rounded-lg bg-white"
                    />
                  </div>
                )}

                {paymentMode === ('SPLIT' as any) && (
                  <div className="p-3 bg-retail-bg rounded-xl border border-retail-border space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span>Cash Portion (₹):</span>
                      <input
                        type="number"
                        value={splitCashRupees}
                        onChange={(e) => setSplitCashRupees(e.target.value)}
                        className="w-24 p-1.5 text-right font-mono border rounded bg-white"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>UPI/Card Portion (₹):</span>
                      <input
                        type="number"
                        value={splitUpiRupees}
                        onChange={(e) => setSplitUpiRupees(e.target.value)}
                        className="w-24 p-1.5 text-right font-mono border rounded bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Complete & Print Checkout Button */}
              <Button
                variant="primary"
                size="lg"
                disabled={cart.length === 0 || isSubmitting}
                onClick={handleCompleteSale}
                className="w-full py-3.5 text-sm font-bold shadow-md tracking-wide"
                icon={<Receipt size={18} />}
              >
                {isSubmitting ? 'Recording Sale...' : 'Complete & Generate Bill (F10)'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* SALES HISTORY TAB */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-retail-border p-4 shadow-card flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-retail-muted">
                <Search size={15} />
              </div>
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search invoice number or customer name..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-retail-bg border border-retail-border rounded-xl text-retail-text placeholder:text-retail-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
            <span className="text-xs text-retail-muted">
              Showing {invoicesHistory.length} Recorded Invoices
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-retail-border shadow-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-retail-bg text-retail-muted font-bold uppercase text-[10px] border-b border-retail-border">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Items</th>
                  <th className="py-3 px-3 text-right">Taxable</th>
                  <th className="py-3 px-3 text-right">GST</th>
                  <th className="py-3 px-3 text-right">Grand Total</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-retail-border">
                {invoicesHistory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-retail-muted">
                      No sales invoices recorded yet.
                    </td>
                  </tr>
                ) : (
                  invoicesHistory.map((inv) => (
                    <tr key={inv.id} className="hover:bg-retail-bg/30">
                      <td className="py-3 px-4 font-mono font-bold text-retail-text">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-3 text-retail-muted">{inv.invoice_date}</td>
                      <td className="py-3 px-3 font-medium text-retail-text">
                        {inv.customer_name_snapshot}
                      </td>
                      <td className="py-3 px-3 text-retail-muted">
                        {inv.items?.length || 0} items
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {formatPaiseToRupees(inv.taxable_amount_paise)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {formatPaiseToRupees(inv.total_tax_paise)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-brand-dark">
                        {formatPaiseToRupees(inv.grand_total_paise)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant={inv.status === 'COMPLETED' ? 'brand' : 'danger'}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setCompletedInvoice(inv);
                            setIsInvoiceModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-brand-primary bg-brand-light rounded-lg hover:bg-brand-primary hover:text-white transition-colors"
                        >
                          View / Print
                        </button>
                        {inv.status === 'COMPLETED' && (
                          <button
                            onClick={() => {
                              setInvoiceToCancel(inv);
                              setCancelReason('');
                              setCancelError(null);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-retail-error bg-red-50 rounded-lg hover:bg-retail-error hover:text-white transition-colors"
                          >
                            Void / Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. VARIANT PICKER MODAL */}
      {variantPickerProduct && (
        <Modal
          isOpen={Boolean(variantPickerProduct)}
          onClose={() => setVariantPickerProduct(null)}
          title={`Select Variant: ${variantPickerProduct.name}`}
          subtitle="Choose the specific size, weight, or specification to add to cart"
          maxWidth="lg"
        >
          <div className="space-y-2 text-xs">
            {variantPickerProduct.variants?.map((v) => (
              <div
                key={v.id}
                onClick={() => {
                  handleAddToCart(variantPickerProduct, v);
                  setVariantPickerProduct(null);
                }}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  v.stock_quantity > 0
                    ? 'border-retail-border hover:border-brand-primary hover:bg-brand-light/30'
                    : 'opacity-50 cursor-not-allowed bg-slate-50 border-retail-border'
                }`}
              >
                <div>
                  <div className="font-bold text-retail-text text-sm">{v.variant_name}</div>
                  <div className="text-[11px] text-retail-muted font-mono">{v.sku}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-brand-dark text-sm">
                    {formatPaiseToRupees(v.selling_price_paise)}
                  </div>
                  <span
                    className={`text-[10px] font-bold ${
                      v.stock_quantity > 0 ? 'text-emerald-700' : 'text-retail-error'
                    }`}
                  >
                    {v.stock_quantity > 0 ? `${v.stock_quantity} available` : 'Out of stock'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* 3. NEW CUSTOMER QUICK MODAL */}
      {isNewCustomerModalOpen && (
        <Modal
          isOpen={isNewCustomerModalOpen}
          onClose={() => setIsNewCustomerModalOpen(false)}
          title="Add New Customer"
          subtitle="Register customer details for GST invoice and credit tracking"
          maxWidth="md"
        >
          <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-retail-muted uppercase mb-1">
                Customer / Academy Name *
              </label>
              <input
                type="text"
                required
                value={newCustomerForm.name}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                placeholder="e.g. Rohit Sharma or Shivaji Park CC"
                className="w-full p-2 border border-retail-border rounded-lg bg-retail-bg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-retail-muted uppercase mb-1">
                  Mobile Phone
                </label>
                <input
                  type="text"
                  value={newCustomerForm.phone}
                  onChange={(e) =>
                    setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })
                  }
                  placeholder="+91 98765 43210"
                  className="w-full p-2 border border-retail-border rounded-lg bg-retail-bg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-retail-muted uppercase mb-1">
                  State Code
                </label>
                <select
                  value={newCustomerForm.state_code}
                  onChange={(e) =>
                    setNewCustomerForm({ ...newCustomerForm, state_code: e.target.value })
                  }
                  className="w-full p-2 border border-retail-border rounded-lg bg-retail-bg font-semibold"
                >
                  <option value="27">27 - Maharashtra (Local)</option>
                  <option value="24">24 - Gujarat (Inter-state)</option>
                  <option value="07">07 - Delhi (Inter-state)</option>
                  <option value="29">29 - Karnataka (Inter-state)</option>
                  <option value="33">33 - Tamil Nadu (Inter-state)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-retail-muted uppercase mb-1">
                GSTIN (For B2B Tax Invoices)
              </label>
              <input
                type="text"
                value={newCustomerForm.gstin}
                onChange={(e) =>
                  setNewCustomerForm({ ...newCustomerForm, gstin: e.target.value.toUpperCase() })
                }
                placeholder="e.g. 27AABCR1234F1Z8"
                className="w-full p-2 border border-retail-border rounded-lg bg-retail-bg font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-retail-muted uppercase mb-1">
                Billing Address
              </label>
              <textarea
                rows={2}
                value={newCustomerForm.address}
                onChange={(e) =>
                  setNewCustomerForm({ ...newCustomerForm, address: e.target.value })
                }
                placeholder="Street address, city..."
                className="w-full p-2 border border-retail-border rounded-lg bg-retail-bg"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Save Customer
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 4. GST TAX INVOICE & THERMAL RECEIPT PRINT MODAL */}
      {isInvoiceModalOpen && completedInvoice && (
        <Modal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          title={printFormat === 'A4' ? 'Tax Invoice (A4 Standard)' : 'Thermal Receipt (80mm POS)'}
          subtitle={`Invoice #${completedInvoice.invoice_number}`}
          maxWidth={printFormat === 'A4' ? '3xl' : 'md'}
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-retail-muted">
                Status: <strong>{completedInvoice.status}</strong>
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsInvoiceModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Printer size={15} />}
                  onClick={handlePrint}
                >
                  Print {printFormat === 'A4' ? 'Invoice' : 'Receipt'}
                </Button>
              </div>
            </div>
          }
        >
          {/* Format Toggle Buttons */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-retail-border mb-3 no-print">
            <div className="flex items-center gap-1 bg-retail-bg p-1 rounded-xl border border-retail-border">
              <button
                type="button"
                onClick={() => setPrintFormat('A4')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  printFormat === 'A4'
                    ? 'bg-brand-primary text-white shadow-2xs'
                    : 'text-retail-muted hover:text-retail-text'
                }`}
              >
                A4 Standard Tax Invoice
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('THERMAL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  printFormat === 'THERMAL'
                    ? 'bg-brand-primary text-white shadow-2xs'
                    : 'text-retail-muted hover:text-retail-text'
                }`}
              >
                80mm Thermal Receipt
              </button>
            </div>
            <span className="text-[11px] text-retail-muted hidden sm:inline">
              {printFormat === 'A4' ? 'Full page format with GST breakdown' : 'Compact roll format for POS thermal printers'}
            </span>
          </div>

          {printFormat === 'A4' ? (
            /* Printable GST Invoice Paper View (A4 Standard) */
            <div
              id="printable-gst-invoice"
              className="p-6 bg-white border border-retail-border rounded-xl space-y-4 text-xs font-sans text-retail-text"
            >
              {/* Invoice Top Header */}
              <div className="border-b-2 border-brand-dark pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-extrabold text-brand-dark tracking-tight">
                    {shopSettings.shopName}
                  </h2>
                  <p className="text-[11px] text-retail-muted mt-0.5">{shopSettings.shopAddress}</p>
                  <p className="text-[11px] text-retail-muted">
                    Phone: {shopSettings.shopPhone} | Email: {shopSettings.shopEmail}
                  </p>
                  <p className="text-xs font-bold text-retail-text mt-1">
                    GSTIN: <span className="font-mono">{shopSettings.shopGstin}</span> (State Code:{' '}
                    {shopSettings.shopStateCode})
                  </p>
                </div>

                <div className="text-right">
                  <span className="px-2.5 py-1 bg-brand-light text-brand-dark font-extrabold text-xs uppercase tracking-wider rounded">
                    TAX INVOICE
                  </span>
                  <div className="mt-2 text-xs">
                    <div>
                      Invoice No:{' '}
                      <strong className="font-mono">{completedInvoice.invoice_number}</strong>
                    </div>
                    <div>Date: {completedInvoice.invoice_date}</div>
                    <div>
                      Place of Supply: State Code{' '}
                      <strong>{completedInvoice.place_of_supply}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill To Info */}
              <div className="p-3 bg-retail-bg rounded-xl border border-retail-border grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-retail-muted font-bold uppercase tracking-wider block">
                    Billed To (Customer Details)
                  </span>
                  <div className="font-bold text-sm text-retail-text mt-0.5">
                    {completedInvoice.customer_name_snapshot}
                  </div>
                  {completedInvoice.customer_phone_snapshot && (
                    <div>Phone: {completedInvoice.customer_phone_snapshot}</div>
                  )}
                  {completedInvoice.customer_address_snapshot && (
                    <div>Address: {completedInvoice.customer_address_snapshot}</div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-retail-muted font-bold uppercase tracking-wider block">
                    Tax Details
                  </span>
                  <div>
                    GSTIN:{' '}
                    <span className="font-mono font-semibold">
                      {completedInvoice.customer_gstin_snapshot || 'URP (Unregistered Person)'}
                    </span>
                  </div>
                  <div>
                    Type:{' '}
                    <strong>
                      {completedInvoice.is_inter_state ? 'Inter-State Supply (IGST)' : 'Intra-State Supply (CGST+SGST)'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-left text-xs border border-retail-border">
                <thead className="bg-retail-bg border-b border-retail-border text-[10px] font-bold text-retail-muted uppercase">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Item Description</th>
                    <th className="p-2">HSN</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Taxable</th>
                    <th className="p-2 text-right">GST</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-retail-border">
                  {completedInvoice.items?.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="p-2 font-mono">{idx + 1}</td>
                      <td className="p-2">
                        <span className="font-bold break-words">{item.product_name_snapshot}</span>
                        {item.variant_name_snapshot && (
                          <span className="text-[11px] text-brand-dark block">
                            {item.variant_name_snapshot}
                          </span>
                        )}
                      </td>
                      <td className="p-2 font-mono text-[11px]">{item.hsn_code_snapshot}</td>
                      <td className="p-2 text-center font-mono">
                        {item.quantity} {item.unit_snapshot}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatPaiseToRupees(item.unit_price_paise, false)}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatPaiseToRupees(item.taxable_amount_paise, false)}
                      </td>
                      <td className="p-2 text-right font-mono text-[11px]">
                        {completedInvoice.is_inter_state
                          ? `IGST (${item.tax_rate_percent}%): ${formatPaiseToRupees(item.igst_amount_paise, false)}`
                          : `C+S (${item.tax_rate_percent}%): ${formatPaiseToRupees(item.cgst_amount_paise + item.sgst_amount_paise, false)}`}
                      </td>
                      <td className="p-2 text-right font-mono font-bold">
                        {formatPaiseToRupees(item.total_amount_paise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Calculations Breakdown */}
              <div className="flex justify-between items-start pt-2">
                <div className="max-w-md space-y-1 text-xs">
                  <span className="text-[10px] text-retail-muted uppercase font-bold">
                    Amount Chargeable (in words):
                  </span>
                  <div className="font-bold italic text-retail-text">
                    {amountInWordsIndian(completedInvoice.grand_total_paise)}
                  </div>

                  {completedInvoice.payments && completedInvoice.payments.length > 0 && (
                    <div className="mt-2 text-[11px] text-retail-muted">
                      Payment Mode:{' '}
                      <strong>
                        {completedInvoice.payments.map((p) => p.payment_mode).join(', ')}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="w-64 space-y-1 text-xs text-right">
                  <div className="flex justify-between">
                    <span className="text-retail-muted">Total Taxable Value:</span>
                    <span className="font-mono">
                      {formatPaiseToRupees(completedInvoice.taxable_amount_paise)}
                    </span>
                  </div>
                  {completedInvoice.is_inter_state ? (
                    <div className="flex justify-between">
                      <span className="text-retail-muted">Integrated GST:</span>
                      <span className="font-mono">
                        {formatPaiseToRupees(completedInvoice.igst_amount_paise)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-retail-muted">Central GST (CGST):</span>
                        <span className="font-mono">
                          {formatPaiseToRupees(completedInvoice.cgst_amount_paise)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-retail-muted">State GST (SGST):</span>
                        <span className="font-mono">
                          {formatPaiseToRupees(completedInvoice.sgst_amount_paise)}
                        </span>
                      </div>
                    </>
                  )}
                  {completedInvoice.discount_amount_paise > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Discount:</span>
                      <span className="font-mono">
                        -{formatPaiseToRupees(completedInvoice.discount_amount_paise)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-[11px] text-retail-muted">
                    <span>Round-off:</span>
                    <span className="font-mono">
                      {completedInvoice.round_off_paise >= 0 ? '+' : ''}
                      {(completedInvoice.round_off_paise / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t-2 border-brand-dark text-base font-extrabold text-brand-dark">
                    <span>Grand Total:</span>
                    <span className="font-mono">
                      {formatPaiseToRupees(completedInvoice.grand_total_paise)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Declarations */}
              <div className="border-t border-retail-border pt-4 grid grid-cols-2 gap-4 text-[10px] text-retail-muted">
                <div>
                  <strong>Terms & Conditions:</strong>
                  <ol className="list-decimal pl-4 space-y-0.5 mt-0.5">
                    <li>Goods once sold can be exchanged within 7 days in original condition.</li>
                    <li>Cricket bat warranty as per respective manufacturer policies.</li>
                    <li>Subject to local jurisdiction.</li>
                  </ol>
                </div>
                <div className="text-right flex flex-col justify-end">
                  <span className="font-bold text-retail-text">For {shopSettings.shopName}</span>
                  <span className="mt-8 border-t border-retail-border pt-1 inline-block">
                    Authorized Signatory
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Printable Thermal Receipt View (80mm POS Roll) */
            <div
              id="printable-gst-invoice"
              className="thermal-receipt-layout p-4 bg-white border border-dashed border-gray-400 rounded-xl space-y-2 text-xs font-mono text-black max-w-[340px] mx-auto shadow-sm"
            >
              {/* Thermal Header */}
              <div className="text-center space-y-0.5 border-b border-dashed border-gray-400 pb-2">
                <h2 className="text-sm font-extrabold uppercase tracking-tight">{shopSettings.shopName}</h2>
                <p className="text-[10px] text-gray-700">{shopSettings.shopAddress}</p>
                <p className="text-[10px] text-gray-700">Tel: {shopSettings.shopPhone}</p>
                <p className="text-[10px] font-bold">GSTIN: {shopSettings.shopGstin} (State: {shopSettings.shopStateCode})</p>
                <div className="font-bold text-[10px] uppercase tracking-wider pt-1">*** RETAIL TAX INVOICE ***</div>
              </div>

              {/* Invoice & Customer Meta */}
              <div className="text-[10px] space-y-0.5 border-b border-dashed border-gray-400 pb-1.5">
                <div className="flex justify-between">
                  <span>Bill No: <strong>{completedInvoice.invoice_number}</strong></span>
                  <span>Date: {completedInvoice.invoice_date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer: {completedInvoice.customer_name_snapshot}</span>
                  <span>POS: Counter-01</span>
                </div>
                {completedInvoice.customer_phone_snapshot && (
                  <div>Phone: {completedInvoice.customer_phone_snapshot}</div>
                )}
                {completedInvoice.customer_gstin_snapshot && (
                  <div>Cust GSTIN: {completedInvoice.customer_gstin_snapshot}</div>
                )}
              </div>

              {/* Items List */}
              <div className="border-b border-dashed border-gray-400 pb-2 space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold border-b border-gray-300 pb-0.5">
                  <span className="w-1/2">Item</span>
                  <span className="w-1/4 text-center">Qty x Rate</span>
                  <span className="w-1/4 text-right">Total</span>
                </div>
                {completedInvoice.items?.map((item) => (
                  <div key={item.id} className="text-[10px] leading-tight">
                    <div className="font-semibold break-words">{item.product_name_snapshot}</div>
                    {item.variant_name_snapshot && (
                      <div className="text-[9px] text-gray-600">({item.variant_name_snapshot})</div>
                    )}
                    <div className="flex justify-between text-[9px] text-gray-800 pt-0.5">
                      <span>HSN: {item.hsn_code_snapshot || '-'} (GST {item.tax_rate_percent}%)</span>
                      <span>{item.quantity} x {formatPaiseToRupees(item.unit_price_paise, false)}</span>
                      <span className="font-bold">{formatPaiseToRupees(item.total_amount_paise)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="text-[10px] space-y-1 border-b border-dashed border-gray-400 pb-2">
                <div className="flex justify-between">
                  <span>Taxable Value:</span>
                  <span>{formatPaiseToRupees(completedInvoice.taxable_amount_paise)}</span>
                </div>
                {completedInvoice.is_inter_state ? (
                  <div className="flex justify-between">
                    <span>IGST:</span>
                    <span>{formatPaiseToRupees(completedInvoice.igst_amount_paise)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>CGST:</span>
                      <span>{formatPaiseToRupees(completedInvoice.cgst_amount_paise)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST:</span>
                      <span>{formatPaiseToRupees(completedInvoice.sgst_amount_paise)}</span>
                    </div>
                  </>
                )}
                {completedInvoice.discount_amount_paise > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-{formatPaiseToRupees(completedInvoice.discount_amount_paise)}</span>
                  </div>
                )}
                {completedInvoice.round_off_paise !== 0 && (
                  <div className="flex justify-between">
                    <span>Round-off:</span>
                    <span>
                      {(completedInvoice.round_off_paise >= 0 ? '+' : '') +
                        (completedInvoice.round_off_paise / 100).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-extrabold border-t border-black pt-1">
                  <span>GRAND TOTAL:</span>
                  <span>{formatPaiseToRupees(completedInvoice.grand_total_paise)}</span>
                </div>
              </div>

              {/* Payment Info & Footer */}
              <div className="text-[9px] text-center space-y-0.5 pt-1">
                <div className="font-bold">{amountInWordsIndian(completedInvoice.grand_total_paise)}</div>
                {completedInvoice.payments && completedInvoice.payments.length > 0 && (
                  <div>Payment Mode: {completedInvoice.payments.map((p) => p.payment_mode).join(', ')}</div>
                )}
                <div className="text-gray-700 pt-1 font-semibold">Thank you for visiting {shopSettings.shopName}!</div>
                <div className="text-[8px] text-gray-500">Exchange within 7 days against valid receipt.</div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* 5. CANCEL INVOICE CONFIRMATION MODAL */}
      {invoiceToCancel && (
        <Modal
          isOpen={Boolean(invoiceToCancel)}
          onClose={() => setInvoiceToCancel(null)}
          title={`Void Invoice: ${invoiceToCancel.invoice_number}`}
          subtitle="Cancelling an invoice restores all items to active inventory and logs an immutable audit trail."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {cancelError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-retail-error flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="p-3 bg-retail-bg rounded-xl border border-retail-border space-y-1">
              <div>
                Customer: <strong>{invoiceToCancel.customer_name_snapshot}</strong>
              </div>
              <div>
                Grand Total:{' '}
                <strong className="font-mono font-bold text-brand-dark">
                  {formatPaiseToRupees(invoiceToCancel.grand_total_paise)}
                </strong>
              </div>
              <div>
                Items to restore: <strong>{invoiceToCancel.items?.length || 0} line items</strong>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-retail-text uppercase mb-1">
                Mandatory Cancellation Reason *
              </label>
              <textarea
                rows={3}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer returned goods on the spot, billing error, or wrong payment mode..."
                className="w-full p-2.5 border border-retail-border rounded-xl bg-retail-bg focus:outline-none focus:ring-2 focus:ring-retail-error/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setInvoiceToCancel(null)}
              >
                Keep Invoice
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmCancelInvoice}
              >
                Confirm Cancellation & Restore Stock
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
