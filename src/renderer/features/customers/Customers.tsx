import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  FileText,
  CreditCard,
  Edit2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowDownRight,
  ShieldAlert,
} from 'lucide-react';
import {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerStatement,
  PaymentMode,
} from '../../../shared/types/models';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [statementData, setStatementData] = useState<CustomerStatement | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  const [payCustomer, setPayCustomer] = useState<Customer | null>(null);
  const [payAmountRupees, setPayAmountRupees] = useState('');
  const [payMode, setPayMode] = useState<PaymentMode>('UPI');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    gstin: '',
    address: '',
    state_code: '27',
    credit_limit_rupees: '0',
    notes: '',
  });

  const loadCustomers = async (query?: string) => {
    if (!window.api) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await window.api.customers.search(query);
      if (res.success) {
        setCustomers(res.data);
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
    loadCustomers(searchQuery);
  }, [searchQuery]);

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      gstin: '',
      address: '',
      state_code: '27',
      credit_limit_rupees: '0',
      notes: '',
    });
    setShowCustomerModal(true);
  };

  const openEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormData({
      name: cust.name,
      phone: cust.phone || '',
      email: cust.email || '',
      gstin: cust.gstin || '',
      address: cust.address || '',
      state_code: cust.state_code || '27',
      credit_limit_rupees: cust.credit_limit_paise
        ? (cust.credit_limit_paise / 100).toFixed(2)
        : '0',
      notes: cust.notes || '',
    });
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.api) return;
    if (!formData.name.trim()) {
      setErrorMsg('Customer name is required.');
      return;
    }

    const creditLimitPaise = Math.round((parseFloat(formData.credit_limit_rupees) || 0) * 100);

    try {
      if (editingCustomer) {
        const updatePayload: UpdateCustomerInput = {
          id: editingCustomer.id,
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          gstin: formData.gstin.trim() || null,
          address: formData.address.trim() || null,
          state_code: formData.state_code || '27',
          credit_limit_paise: creditLimitPaise,
          notes: formData.notes.trim() || null,
        };
        const res = await window.api.customers.update(updatePayload);
        if (res.success) {
          setSuccessMsg(`Customer "${res.data.name}" updated successfully.`);
          setShowCustomerModal(false);
          loadCustomers(searchQuery);
        } else {
          setErrorMsg(res.error);
        }
      } else {
        const createPayload: CreateCustomerInput = {
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          gstin: formData.gstin.trim() || null,
          address: formData.address.trim() || null,
          state_code: formData.state_code || '27',
          credit_limit_paise: creditLimitPaise,
          notes: formData.notes.trim() || null,
        };
        const res = await window.api.customers.create(createPayload);
        if (res.success) {
          setSuccessMsg(`Customer "${res.data.name}" registered successfully.`);
          setShowCustomerModal(false);
          loadCustomers(searchQuery);
        } else {
          setErrorMsg(res.error);
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const openStatement = async (cust: Customer) => {
    setStatementCustomer(cust);
    setLoadingStatement(true);
    setStatementData(null);
    try {
      const res = await window.api.customers.getLedger(cust.id);
      if (res.success) {
        setStatementData(res.data);
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingStatement(false);
    }
  };

  const openPayModal = (cust: Customer, invoiceId?: number) => {
    setPayCustomer(cust);
    setSelectedInvoiceId(invoiceId || null);
    // If customer balance > 0, prefill with balance in rupees
    setPayAmountRupees(cust.balance_paise > 0 ? (cust.balance_paise / 100).toFixed(2) : '');
    setPayMode('UPI');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayRef('');
    setPayNotes('');
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.api || !payCustomer) return;
    const amountRupees = parseFloat(payAmountRupees);
    if (isNaN(amountRupees) || amountRupees <= 0) {
      setErrorMsg('Please enter a valid payment amount.');
      return;
    }

    const amountPaise = Math.round(amountRupees * 100);

    try {
      const res = await window.api.payments.recordCustomerPayment({
        customer_id: payCustomer.id,
        invoice_id: selectedInvoiceId || null,
        amount_paise: amountPaise,
        payment_date: payDate,
        payment_mode: payMode,
        reference_number: payRef.trim() || null,
        notes: payNotes.trim() || null,
      });

      if (res.success) {
        setSuccessMsg(
          `Receipt of ₹${amountRupees.toFixed(2)} recorded from ${payCustomer.name}. Customer Khata updated.`
        );
        setPayCustomer(null);
        loadCustomers(searchQuery);
        if (statementCustomer && statementCustomer.id === payCustomer.id) {
          openStatement(statementCustomer);
        }
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  // KPIs
  const totalReceivablesPaise = customers.reduce((sum, c) => sum + (c.balance_paise || 0), 0);
  const activeCount = customers.filter((c) => c.is_active === 1).length;
  const customersWithCredit = customers.filter((c) => c.balance_paise > 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-retail-card p-4 rounded-xl border border-retail-border shadow-2xs">
          <div className="flex items-center justify-between text-retail-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Customers</span>
            <Users size={18} className="text-brand-primary" />
          </div>
          <div className="text-2xl font-bold text-retail-text">{customers.length}</div>
          <div className="text-[11px] text-retail-muted mt-1">{activeCount} active customer accounts</div>
        </div>

        <div className="bg-retail-card p-4 rounded-xl border border-retail-border shadow-2xs">
          <div className="flex items-center justify-between text-retail-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Accounts Receivable</span>
            <ArrowDownRight size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">
            ₹ {(totalReceivablesPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-retail-muted mt-1">Outstanding Khata balance owed to shop</div>
        </div>

        <div className="bg-retail-card p-4 rounded-xl border border-retail-border shadow-2xs">
          <div className="flex items-center justify-between text-retail-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Customers with Dues</span>
            <ShieldAlert size={18} className="text-red-500" />
          </div>
          <div className="text-2xl font-bold text-retail-text">{customersWithCredit.length}</div>
          <div className="text-[11px] text-retail-muted mt-1">Accounts with positive credit balance</div>
        </div>

        <div className="bg-retail-card p-4 rounded-xl border border-retail-border shadow-2xs">
          <div className="flex items-center justify-between text-retail-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">B2B GST Customers</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-retail-text">
            {customers.filter((c) => c.gstin && c.gstin.length >= 15).length} / {customers.length}
          </div>
          <div className="text-[11px] text-retail-muted mt-1">With registered GSTIN for tax invoice</div>
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

      {/* Actions and Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-retail-card p-4 rounded-xl border border-retail-border shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-retail-muted" />
          <input
            type="text"
            placeholder="Search customers by name, phone, GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-retail-border bg-retail-bg text-retail-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={() => loadCustomers(searchQuery)}
          >
            Refresh
          </Button>
          <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={openAddModal}>
            Add Customer
          </Button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-retail-card rounded-xl border border-retail-border shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-retail-bg/60 text-retail-muted border-b border-retail-border uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Contact Details</th>
                <th className="px-4 py-3">GSTIN / State</th>
                <th className="px-4 py-3 text-right">Credit Limit</th>
                <th className="px-4 py-3 text-right">Khata Balance (Due)</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-retail-border/60 text-retail-text">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-retail-muted">
                    {loading ? 'Loading customers...' : 'No customers found.'}
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-retail-bg/40 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div className="font-semibold text-retail-text flex items-center gap-1.5">
                        {cust.name}
                        {cust.id === 1 && (
                          <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-normal">
                            Default Counter
                          </span>
                        )}
                      </div>
                      {cust.notes && <div className="text-[11px] text-retail-muted">{cust.notes}</div>}
                    </td>
                    <td className="px-4 py-3 text-retail-muted">
                      {cust.phone && (
                        <div className="flex items-center gap-1.5 text-retail-text">
                          <Phone size={12} className="text-retail-muted" />
                          <span>{cust.phone}</span>
                        </div>
                      )}
                      {cust.email && (
                        <div className="flex items-center gap-1.5 text-[11px] text-retail-muted mt-0.5">
                          <Mail size={12} />
                          <span>{cust.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-[11px] text-retail-text font-medium">
                        {cust.gstin || <span className="text-retail-muted">Unregistered</span>}
                      </div>
                      <div className="text-[10px] text-retail-muted">State: {cust.state_code || '27'}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-retail-muted">
                      {cust.credit_limit_paise && cust.credit_limit_paise > 0
                        ? `₹ ${(cust.credit_limit_paise / 100).toFixed(2)}`
                        : 'No Limit'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {cust.balance_paise > 0 ? (
                        <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[11px]">
                          ₹ {(cust.balance_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                          Nil / Settled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<FileText size={12} />}
                          onClick={() => openStatement(cust)}
                        >
                          Khata
                        </Button>
                        {cust.id !== 1 && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<CreditCard size={12} />}
                              onClick={() => openPayModal(cust)}
                            >
                              Receive
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Edit2 size={12} />}
                              onClick={() => openEditModal(cust)}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        title={editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Register New Customer'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">
                Customer Name / Club / Academy <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Shivaji Park Cricket Club"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">Phone Number</label>
              <Input
                placeholder="+91 98220 12345"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">Email Address</label>
              <Input
                type="email"
                placeholder="contact@shivajiparkcc.org"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">GSTIN (Optional)</label>
              <Input
                placeholder="27AAAAA0000A1Z5"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                maxLength={15}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">State Code (GST)</label>
              <Input
                placeholder="27"
                value={formData.state_code}
                onChange={(e) => setFormData({ ...formData, state_code: e.target.value })}
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">Credit Limit (₹)</label>
              <Input
                type="number"
                min="0"
                placeholder="0.00"
                value={formData.credit_limit_rupees}
                onChange={(e) => setFormData({ ...formData, credit_limit_rupees: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-retail-text mb-1">Address</label>
            <Input
              placeholder="e.g. Dadar West, Mumbai, Maharashtra"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-retail-text mb-1">Notes</label>
            <Input
              placeholder="e.g. Academy team coach, weekly tournament orders..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-retail-border">
            <Button variant="secondary" onClick={() => setShowCustomerModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingCustomer ? 'Save Changes' : 'Register Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Customer Khata Statement Modal */}
      <Modal
        isOpen={!!statementCustomer}
        onClose={() => setStatementCustomer(null)}
        title={statementCustomer ? `Customer Khata Ledger: ${statementCustomer.name}` : ''}
        maxWidth="xl"
      >
        {loadingStatement ? (
          <div className="p-8 text-center text-retail-muted">Loading customer statement records...</div>
        ) : statementData ? (
          <div className="space-y-4">
            {/* Header KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-retail-bg p-3.5 rounded-xl border border-retail-border">
              <div>
                <div className="text-[10px] uppercase font-bold text-retail-muted">Total Sales Invoices</div>
                <div className="text-base font-bold text-retail-text">
                  ₹ {(statementData.totalSalesPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-retail-muted">Total Payments Received</div>
                <div className="text-base font-bold text-emerald-600">
                  ₹ {(statementData.totalPaidPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-retail-muted">Current Outstanding Due</div>
                <div className="text-base font-bold text-amber-600">
                  ₹ {(statementData.outstandingBalancePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-retail-border pb-2">
              <span className="text-xs font-bold uppercase text-retail-muted">Chronological Khata History</span>
              {statementCustomer && statementCustomer.id !== 1 && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<CreditCard size={14} />}
                  onClick={() => openPayModal(statementCustomer)}
                >
                  + Record Receipt
                </Button>
              )}
            </div>

            {/* Entries Table */}
            <div className="max-h-96 overflow-y-auto rounded-lg border border-retail-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-retail-bg text-retail-muted text-[10px] font-bold uppercase sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Reference</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Debit (Sales Due)</th>
                    <th className="px-3 py-2 text-right">Credit (Receipt)</th>
                    <th className="px-3 py-2 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-retail-border/60">
                  {statementData.entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-retail-muted">
                        No transactions recorded for this customer yet.
                      </td>
                    </tr>
                  ) : (
                    statementData.entries.map((e) => (
                      <tr key={e.id} className="hover:bg-retail-bg/40">
                        <td className="px-3 py-2 font-mono text-[11px] text-retail-muted">{e.date}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              e.type === 'INVOICE'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {e.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-retail-text font-semibold">{e.reference_number}</td>
                        <td className="px-3 py-2 text-retail-text">{e.description}</td>
                        <td className="px-3 py-2 text-right text-amber-600 font-medium">
                          {e.debit_paise > 0 ? `₹ ${(e.debit_paise / 100).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-600 font-medium">
                          {e.credit_paise > 0 ? `₹ ${(e.credit_paise / 100).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-retail-text">
                          ₹ {(e.running_balance_paise / 100).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Record Customer Payment / Receipt Modal */}
      <Modal
        isOpen={!!payCustomer}
        onClose={() => setPayCustomer(null)}
        title={payCustomer ? `Receive Payment from: ${payCustomer.name}` : ''}
        maxWidth="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="bg-retail-bg p-3 rounded-lg border border-retail-border text-xs flex justify-between items-center">
            <span className="text-retail-muted font-medium">Current Khata Due:</span>
            <span className="font-bold text-amber-600 text-sm">
              ₹ {payCustomer ? (payCustomer.balance_paise / 100).toFixed(2) : '0.00'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-retail-text mb-1">
              Receipt Amount (₹) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={payAmountRupees}
              onChange={(e) => setPayAmountRupees(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">Payment Mode</label>
              <select
                value={payMode}
                onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                className="w-full text-xs p-2.5 rounded-lg border border-retail-border bg-retail-bg text-retail-text focus:outline-none"
              >
                <option value="UPI">UPI / QR</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT)</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">Receipt Date</label>
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-retail-text mb-1">
              Reference / Transaction ID
            </label>
            <Input
              placeholder="e.g. UPI Ref # or Card Slip #"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-retail-text mb-1">Notes</label>
            <Input
              placeholder="e.g. Tournament equipment advance settlement"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-retail-border">
            <Button variant="secondary" onClick={() => setPayCustomer(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Record Receipt
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
