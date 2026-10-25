import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Building2,
  Users,
} from 'lucide-react';
import { PaymentRecord, PaymentMode } from '../../../shared/types/models';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';

export const PaymentsRegister: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [partyTypeFilter, setPartyTypeFilter] = useState<'ALL' | 'CUSTOMER' | 'SUPPLIER'>('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | PaymentMode>('ALL');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadPayments = async () => {
    if (!window.api) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await window.api.payments.getAll({
        party_type: partyTypeFilter !== 'ALL' ? partyTypeFilter : undefined,
        payment_mode: modeFilter !== 'ALL' ? modeFilter : undefined,
        limit: 150,
      });

      if (res.success) {
        setPayments(res.data);
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
    loadPayments();
  }, [partyTypeFilter, modeFilter]);

  // Filter in memory for search query
  const filteredPayments = payments.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.payment_number.toLowerCase().includes(q) ||
      (p.party_name && p.party_name.toLowerCase().includes(q)) ||
      (p.reference_number && p.reference_number.toLowerCase().includes(q)) ||
      (p.invoice_number && p.invoice_number.toLowerCase().includes(q)) ||
      (p.purchase_number && p.purchase_number.toLowerCase().includes(q)) ||
      (p.notes && p.notes.toLowerCase().includes(q))
    );
  });

  // KPI Calculations
  const customerReceiptsPaise = payments
    .filter((p) => p.party_type === 'CUSTOMER')
    .reduce((sum, p) => sum + p.amount_paise, 0);

  const supplierPayoutsPaise = payments
    .filter((p) => p.party_type === 'SUPPLIER')
    .reduce((sum, p) => sum + p.amount_paise, 0);

  const netCashflowPaise = customerReceiptsPaise - supplierPayoutsPaise;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-retail-card p-4 rounded-xl border border-retail-border shadow-2xs">
          <div className="flex items-center justify-between text-retail-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Customer Inflow</span>
            <ArrowDownLeft size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            ₹ {(customerReceiptsPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-retail-muted mt-1">POS collections & Khata receipts</div>
        </div>

        <div className="bg-retail-card p-4 rounded-xl border border-retail-border shadow-2xs">
          <div className="flex items-center justify-between text-retail-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Supplier Outflow</span>
            <ArrowUpRight size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">
            ₹ {(supplierPayoutsPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-retail-muted mt-1">Vendor purchase settlements</div>
        </div>

        <div className="bg-retail-card p-4 rounded-xl border border-retail-border shadow-2xs">
          <div className="flex items-center justify-between text-retail-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Cash Position</span>
            <Wallet size={18} className={netCashflowPaise >= 0 ? 'text-emerald-500' : 'text-red-500'} />
          </div>
          <div
            className={`text-2xl font-bold ${
              netCashflowPaise >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            ₹ {(netCashflowPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-retail-muted mt-1">Receipts minus vendor payouts</div>
        </div>

        <div className="bg-retail-card p-4 rounded-xl border border-retail-border shadow-2xs">
          <div className="flex items-center justify-between text-retail-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Transactions</span>
            <CreditCard size={18} className="text-brand-primary" />
          </div>
          <div className="text-2xl font-bold text-retail-text">{payments.length}</div>
          <div className="text-[11px] text-retail-muted mt-1">Verified financial ledger entries</div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Toolbar & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-retail-card p-4 rounded-xl border border-retail-border shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-retail-muted" />
            <input
              type="text"
              placeholder="Search by party, payment #, ref #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-retail-border bg-retail-bg text-retail-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={partyTypeFilter}
              onChange={(e) => setPartyTypeFilter(e.target.value as any)}
              className="text-xs py-2 px-2.5 rounded-lg border border-retail-border bg-retail-bg text-retail-text focus:outline-none"
            >
              <option value="ALL">All Parties</option>
              <option value="CUSTOMER">Customers (Inflow)</option>
              <option value="SUPPLIER">Suppliers (Outflow)</option>
            </select>

            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value as any)}
              className="text-xs py-2 px-2.5 rounded-lg border border-retail-border bg-retail-bg text-retail-text focus:outline-none"
            >
              <option value="ALL">All Modes</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI / QR</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
          onClick={loadPayments}
        >
          Refresh
        </Button>
      </div>

      {/* Unified Payments Table */}
      <div className="bg-retail-card rounded-xl border border-retail-border shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-retail-bg/60 text-retail-muted border-b border-retail-border uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="px-4 py-3">Payment #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Flow & Type</th>
                <th className="px-4 py-3">Party Name</th>
                <th className="px-4 py-3">Associated Document</th>
                <th className="px-4 py-3">Mode & Reference</th>
                <th className="px-4 py-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-retail-border/60 text-retail-text">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-retail-muted">
                    {loading ? 'Loading payment records...' : 'No payment transactions found.'}
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const isInflow = p.party_type === 'CUSTOMER';
                  return (
                    <tr key={p.id} className="hover:bg-retail-bg/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-retail-text">
                        {p.payment_number}
                      </td>
                      <td className="px-4 py-3 text-retail-muted font-mono">{p.payment_date}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isInflow
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {isInflow ? (
                            <>
                              <ArrowDownLeft size={11} /> Receipt (Inflow)
                            </>
                          ) : (
                            <>
                              <ArrowUpRight size={11} /> Payout (Outflow)
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-retail-text flex items-center gap-1.5">
                          {isInflow ? <Users size={12} className="text-retail-muted" /> : <Building2 size={12} className="text-retail-muted" />}
                          <span>{p.party_name || (isInflow ? 'Walk-in Customer' : 'Supplier')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px]">
                        {p.invoice_number ? (
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Invoice: {p.invoice_number}
                          </span>
                        ) : p.purchase_number ? (
                          <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                            Purchase: {p.purchase_number}
                          </span>
                        ) : (
                          <span className="text-retail-muted">On Account</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="neutral">{p.payment_mode}</Badge>
                        {p.reference_number && (
                          <div className="font-mono text-[10px] text-retail-muted mt-0.5">
                            Ref: {p.reference_number}
                          </div>
                        )}
                        {p.notes && <div className="text-[10px] text-retail-muted">{p.notes}</div>}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-bold text-sm ${
                          isInflow ? 'text-emerald-600' : 'text-blue-600'
                        }`}
                      >
                        {isInflow ? '+' : '-'} ₹ {(p.amount_paise / 100).toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
