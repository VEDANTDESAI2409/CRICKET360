import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Search,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  Boxes,
  ArrowRight,
} from 'lucide-react';
import {
  SalesReturn,
  SalesInvoice,
  CreateSalesReturnInput,
} from '../../../shared/types/models';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';

export const Returns: React.FC = () => {
  const [returnsList, setReturnsList] = useState<SalesReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Details Modal
  const [viewingReturn, setViewingReturn] = useState<SalesReturn | null>(null);

  // New Return Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [foundInvoices, setFoundInvoices] = useState<SalesInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);

  // Item return inputs: map of sales_invoice_item_id -> quantity
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});
  // Item restock toggle: map of sales_invoice_item_id -> boolean
  const [restockMap, setRestockMap] = useState<Record<number, boolean>>({});

  const [refundMode, setRefundMode] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'STORE_CREDIT'>('CASH');
  const [refundRef, setRefundRef] = useState('');
  const [returnReason, setReturnReason] = useState('Customer exchange / size misfit');
  const [returnNotes, setReturnNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadReturns = async () => {
    if (!window.api) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await window.api.returns.getAll({
        search: searchQuery || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      if (res.success) {
        setReturnsList(res.data);
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, [searchQuery, startDate, endDate]);

  // Search invoices for new return
  const searchInvoices = async () => {
    if (!invoiceSearchQuery.trim() || !window.api) return;
    try {
      const res = await window.api.billing.getInvoices({
        search: invoiceSearchQuery.trim(),
        limit: 10,
      });
      if (res.success) {
        // Only allow returns on non-cancelled invoices
        const eligible = res.data.filter((inv) => inv.status !== 'CANCELLED');
        setFoundInvoices(eligible);
        if (eligible.length === 0) {
          setErrorMsg('No completed invoices found matching query.');
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const selectInvoiceForReturn = async (inv: SalesInvoice) => {
    try {
      const res = await window.api.billing.getInvoiceById(inv.id);
      if (res.success && res.data) {
        setSelectedInvoice(res.data);
        const initialQtys: Record<number, number> = {};
        const initialRestock: Record<number, boolean> = {};

        for (const item of res.data.items || []) {
          initialQtys[item.id] = 0;
          initialRestock[item.id] = true; // default restock to true
        }
        setReturnQtys(initialQtys);
        setRestockMap(initialRestock);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleQtyChange = (itemId: number, maxQty: number, val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) {
      setReturnQtys((prev) => ({ ...prev, [itemId]: 0 }));
      return;
    }
    const clamped = Math.min(num, maxQty);
    setReturnQtys((prev) => ({ ...prev, [itemId]: clamped }));
  };

  const handleRestockToggle = (itemId: number) => {
    setRestockMap((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Calculate live return refund preview
  const calculateRefundEstimate = () => {
    if (!selectedInvoice || !selectedInvoice.items) return 0;
    let total = 0;
    for (const item of selectedInvoice.items) {
      const q = returnQtys[item.id] || 0;
      if (q > 0 && item.quantity > 0) {
        // Proportional total per item
        const itemTotal = Math.round((item.total_amount_paise * q) / item.quantity);
        total += itemTotal;
      }
    }
    return total;
  };

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !selectedInvoice.items || !window.api) return;

    const returnItemsPayload = Object.entries(returnQtys)
      .filter(([_, qty]) => qty > 0)
      .map(([itemIdStr, qty]) => {
        const itemId = Number(itemIdStr);
        return {
          sales_invoice_item_id: itemId,
          quantity: qty,
          restock: !!restockMap[itemId],
        };
      });

    if (returnItemsPayload.length === 0) {
      setErrorMsg('Please enter return quantity of at least 1 item.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const payload: CreateSalesReturnInput = {
        invoice_id: selectedInvoice.id,
        return_date: new Date().toISOString().slice(0, 10),
        refund_mode: refundMode,
        refund_reference: refundRef.trim() || null,
        reason: returnReason.trim(),
        notes: returnNotes.trim() || null,
        items: returnItemsPayload,
      };

      const res = await window.api.returns.create(payload);
      if (res.success) {
        setSuccessMsg(`Sales return ${res.data.return_number} processed successfully!`);
        setShowNewModal(false);
        setSelectedInvoice(null);
        setFoundInvoices([]);
        setInvoiceSearchQuery('');
        loadReturns();
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // KPI calculations
  const totalReturnsValPaise = returnsList.reduce((sum, r) => sum + r.grand_total_paise, 0);
  const totalReturnCount = returnsList.length;
  const storeCreditIssuedPaise = returnsList
    .filter((r) => r.refund_mode === 'STORE_CREDIT')
    .reduce((sum, r) => sum + r.grand_total_paise, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-7 h-7 text-emerald-600" />
            Sales Returns & Refunds
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Process full or partial invoice returns, conditional inventory restitution, and customer credit notes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={loadReturns}
            disabled={loading}
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setShowNewModal(true);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            Process New Return
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-700 font-bold">
            &times;
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Returns Value</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">₹{(totalReturnsValPaise / 100).toFixed(2)}</div>
            <div className="text-xs text-slate-500 mt-0.5">{totalReturnCount} transactions recorded</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Inventory Status</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">Conditional</div>
            <div className="text-xs text-slate-500 mt-0.5">Physical restock audit movement</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Store Credit Issued</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">₹{(storeCreditIssuedPaise / 100).toFixed(2)}</div>
            <div className="text-xs text-slate-500 mt-0.5">Khata balance adjustments</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <Input
            placeholder="Search by Return #, Invoice #, or Customer Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Start Date"
            className="w-full md:w-40"
          />
          <span className="text-slate-400 text-sm">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="End Date"
            className="w-full md:w-40"
          />
          {(searchQuery || startDate || endDate) && (
            <Button
              variant="secondary"
              onClick={() => {
                setSearchQuery('');
                setStartDate('');
                setEndDate('');
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Return Number</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Original Invoice</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Refund Mode</th>
                <th className="py-3 px-4 text-right">Refund Amount</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {returnsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RotateCcw className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    No sales returns found. Click "Process New Return" to record a return.
                  </td>
                </tr>
              ) : (
                returnsList.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{ret.return_number}</td>
                    <td className="py-3 px-4 text-slate-600">{ret.return_date}</td>
                    <td className="py-3 px-4 font-mono text-emerald-700 font-medium">
                      {ret.invoice_number || `INV #${ret.invoice_id}`}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">{ret.customer_name_snapshot}</td>
                    <td className="py-3 px-4">
                      <Badge variant={ret.refund_mode === 'STORE_CREDIT' ? 'brand' : 'success'}>
                        {ret.refund_mode}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{(ret.grand_total_paise / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={ret.reason}>
                      {ret.reason}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (window.api) {
                            const full = await window.api.returns.getById(ret.id);
                            if (full.success && full.data) {
                              setViewingReturn(full.data);
                            }
                          }
                        }}
                        icon={<Eye className="w-4 h-4" />}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Return Modal */}
      {showNewModal && (
        <Modal
          isOpen={showNewModal}
          onClose={() => {
            setShowNewModal(false);
            setSelectedInvoice(null);
          }}
          title="Process Sales Return & Refund"
          maxWidth="lg"
        >
          <div className="space-y-5">
            {!selectedInvoice ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  Search and select the original completed sales invoice to return items against.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter Invoice Number (e.g. INV-1001) or customer name..."
                    value={invoiceSearchQuery}
                    onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchInvoices()}
                    className="flex-1"
                  />
                  <Button variant="primary" onClick={searchInvoices} icon={<Search className="w-4 h-4" />}>
                    Search
                  </Button>
                </div>

                {foundInvoices.length > 0 && (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden mt-3 max-h-64 overflow-y-auto">
                    {foundInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => selectInvoiceForReturn(inv)}
                        className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="font-mono font-bold text-slate-800">{inv.invoice_number}</div>
                          <div className="text-xs text-slate-500">
                            {inv.customer_name_snapshot} &bull; {inv.invoice_date}
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <div className="font-bold text-slate-900">₹{(inv.grand_total_paise / 100).toFixed(2)}</div>
                            <Badge variant={inv.status === 'RETURNED' ? 'warning' : 'success'}>{inv.status}</Badge>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmitReturn} className="space-y-5">
                {/* Invoice Header Details */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-sm">
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-400">Original Invoice</span>
                    <div className="font-mono font-bold text-slate-800 text-base">{selectedInvoice.invoice_number}</div>
                    <div className="text-slate-600 text-xs">
                      Customer: <span className="font-medium text-slate-800">{selectedInvoice.customer_name_snapshot}</span> ({selectedInvoice.invoice_date})
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold uppercase text-slate-400">Total Billed</span>
                    <div className="font-bold text-slate-900 text-base">₹{(selectedInvoice.grand_total_paise / 100).toFixed(2)}</div>
                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(null)}
                      className="text-xs text-emerald-600 hover:underline font-semibold"
                    >
                      Change Invoice
                    </button>
                  </div>
                </div>

                {/* Return Items Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 uppercase">
                    Select Items to Return
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3">Product / SKU</th>
                        <th className="py-2.5 px-3 text-center">Billed</th>
                        <th className="py-2.5 px-3 text-center">Already Ret.</th>
                        <th className="py-2.5 px-3 text-center">Return Qty</th>
                        <th className="py-2.5 px-3 text-center">Restock?</th>
                        <th className="py-2.5 px-3 text-right">Refund (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoice.items?.map((item) => {
                        const returnedSoFar = (item as any).returned_quantity || 0;
                        const returnable = Math.max(0, item.quantity - returnedSoFar);
                        const curQty = returnQtys[item.id] || 0;
                        const lineRefund = curQty > 0 ? Math.round((item.total_amount_paise * curQty) / item.quantity) : 0;

                        return (
                          <tr key={item.id} className={returnable === 0 ? 'bg-slate-50/50 opacity-60' : ''}>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-800">{item.product_name_snapshot}</div>
                              <div className="font-mono text-slate-400 text-[10px]">{item.sku_snapshot}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-medium">{item.quantity}</td>
                            <td className="py-2.5 px-3 text-center text-amber-600 font-medium">{returnedSoFar}</td>
                            <td className="py-2.5 px-3 text-center">
                              {returnable > 0 ? (
                                <Input
                                  type="number"
                                  min={0}
                                  max={returnable}
                                  value={curQty}
                                  onChange={(e) => handleQtyChange(item.id, returnable, e.target.value)}
                                  className="w-16 text-center text-xs py-1 h-8 mx-auto"
                                />
                              ) : (
                                <span className="text-slate-400 text-xs italic">Fully Returned</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {returnable > 0 && curQty > 0 ? (
                                <label className="inline-flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!restockMap[item.id]}
                                    onChange={() => handleRestockToggle(item.id)}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                  />
                                  <span className="text-[11px] text-slate-600">Restock</span>
                                </label>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                              ₹{(lineRefund / 100).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Return Configuration & Refund Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Refund Treatment</label>
                    <select
                      value={refundMode}
                      onChange={(e) => setRefundMode(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="CASH">Cash Refund</option>
                      <option value="UPI">UPI Transfer</option>
                      <option value="CARD">Card Reversal</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="STORE_CREDIT">Store Credit (Khata Balance)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Reference # (Optional)</label>
                    <Input
                      placeholder="e.g. UPI txn or Cheque number"
                      value={refundRef}
                      onChange={(e) => setRefundRef(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Return Reason</label>
                    <select
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Customer exchange / size misfit">Customer exchange / size misfit</option>
                      <option value="Defective or damaged product">Defective or damaged product</option>
                      <option value="Wrong product billed">Wrong product billed</option>
                      <option value="Warranty claim replacement">Warranty claim replacement</option>
                      <option value="Other / Customer cancelled">Other / Customer cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Notes (Optional)</label>
                    <Input
                      placeholder="Auditable internal notes..."
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* Total Refund Banner */}
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                        Total Refund Due
                      </div>
                      <div className="text-xs text-emerald-600">
                        Restocking accepted items into warehouse stock
                      </div>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-emerald-900">
                    ₹{(calculateRefundEstimate() / 100).toFixed(2)}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => {
                      setShowNewModal(false);
                      setSelectedInvoice(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={submitting || calculateRefundEstimate() === 0}
                  >
                    {submitting ? 'Processing...' : 'Confirm Return & Refund'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}

      {/* View Return Details Modal */}
      {viewingReturn && (
        <Modal
          isOpen={!!viewingReturn}
          onClose={() => setViewingReturn(null)}
          title={`Sales Return Details: ${viewingReturn.return_number}`}
          maxWidth="lg"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase">Invoice #</span>
                <div className="font-mono font-bold text-slate-800 mt-0.5">{viewingReturn.invoice_number}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase">Return Date</span>
                <div className="font-semibold text-slate-800 mt-0.5">{viewingReturn.return_date}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase">Customer</span>
                <div className="font-semibold text-slate-800 mt-0.5">{viewingReturn.customer_name_snapshot}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase">Refund Mode</span>
                <div className="mt-0.5">
                  <Badge variant={viewingReturn.refund_mode === 'STORE_CREDIT' ? 'brand' : 'success'}>
                    {viewingReturn.refund_mode}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 uppercase">
                Returned Line Items
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">Item / SKU</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Unit Rate</th>
                    <th className="py-2.5 px-3 text-center">Restocked</th>
                    <th className="py-2.5 px-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingReturn.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{item.product_name_snapshot}</div>
                        <div className="font-mono text-slate-400 text-[10px]">{item.sku_snapshot}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹{(item.unit_price_paise / 100).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant={item.restock ? 'success' : 'neutral'}>
                          {item.restock ? 'Restocked' : 'No Restock'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        ₹{(item.total_amount_paise / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div><span className="font-semibold text-slate-600">Reason:</span> {viewingReturn.reason}</div>
              {viewingReturn.refund_reference && (
                <div><span className="font-semibold text-slate-600">Reference:</span> {viewingReturn.refund_reference}</div>
              )}
              {viewingReturn.notes && (
                <div><span className="font-semibold text-slate-600">Notes:</span> {viewingReturn.notes}</div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="text-sm font-semibold text-slate-600">Total Refunded Amount</div>
              <div className="text-xl font-black text-emerald-700">
                ₹{(viewingReturn.grand_total_paise / 100).toFixed(2)}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
