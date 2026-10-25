import React, { useState, useEffect } from 'react';
import {
  Building2,
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
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import {
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierStatement,
  PaymentMode,
} from '../../../shared/types/models';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';

export const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [statementSupplier, setStatementSupplier] = useState<Supplier | null>(null);
  const [statementData, setStatementData] = useState<SupplierStatement | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [statementTab, setStatementTab] = useState<'all' | 'purchases' | 'payments' | 'returns'>('all');

  const [paySupplier, setPaySupplier] = useState<Supplier | null>(null);
  const [payAmountRupees, setPayAmountRupees] = useState('');
  const [payMode, setPayMode] = useState<PaymentMode>('BANK_TRANSFER');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    phone: '',
    email: '',
    gstin: '',
    address: '',
    state_code: '27',
    payment_terms_days: '30',
    notes: '',
  });

  const loadSuppliers = async (query?: string) => {
    if (!window.api) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await window.api.suppliers.getAll(query);
      if (res.success) {
        setSuppliers(res.data);
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
    loadSuppliers(searchQuery);
  }, [searchQuery]);

  const openAddModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      company_name: '',
      phone: '',
      email: '',
      gstin: '',
      address: '',
      state_code: '27',
      payment_terms_days: '30',
      notes: '',
    });
    setShowSupplierModal(true);
  };

  const openEditModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      company_name: sup.company_name || '',
      phone: sup.phone || '',
      email: sup.email || '',
      gstin: sup.gstin || '',
      address: sup.address || '',
      state_code: sup.state_code || '27',
      payment_terms_days: String(sup.payment_terms_days || 30),
      notes: sup.notes || '',
    });
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.api) return;
    if (!formData.name.trim()) {
      setErrorMsg('Supplier name is required.');
      return;
    }

    try {
      if (editingSupplier) {
        const updatePayload: UpdateSupplierInput = {
          id: editingSupplier.id,
          name: formData.name.trim(),
          company_name: formData.company_name.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          gstin: formData.gstin.trim() || null,
          address: formData.address.trim() || null,
          state_code: formData.state_code || '27',
          payment_terms_days: parseInt(formData.payment_terms_days, 10) || 30,
          notes: formData.notes.trim() || null,
        };
        const res = await window.api.suppliers.update(updatePayload);
        if (res.success) {
          setSuccessMsg(`Supplier "${res.data.name}" updated successfully.`);
          setShowSupplierModal(false);
          loadSuppliers(searchQuery);
        } else {
          setErrorMsg(res.error);
        }
      } else {
        const createPayload: CreateSupplierInput = {
          name: formData.name.trim(),
          company_name: formData.company_name.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          gstin: formData.gstin.trim() || null,
          address: formData.address.trim() || null,
          state_code: formData.state_code || '27',
          payment_terms_days: parseInt(formData.payment_terms_days, 10) || 30,
          notes: formData.notes.trim() || null,
        };
        const res = await window.api.suppliers.create(createPayload);
        if (res.success) {
          setSuccessMsg(`Supplier "${res.data.name}" added successfully.`);
          setShowSupplierModal(false);
          loadSuppliers(searchQuery);
        } else {
          setErrorMsg(res.error);
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const openStatement = async (sup: Supplier) => {
    setStatementSupplier(sup);
    setLoadingStatement(true);
    setStatementData(null);
    try {
      const res = await window.api.suppliers.getLedger(sup.id);
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

  const openPayModal = (sup: Supplier, purchaseId?: number) => {
    setPaySupplier(sup);
    setSelectedPurchaseId(purchaseId || null);
    // If supplier balance > 0, prefill with balance in rupees
    setPayAmountRupees(sup.balance_paise > 0 ? (sup.balance_paise / 100).toFixed(2) : '');
    setPayMode('BANK_TRANSFER');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayRef('');
    setPayNotes('');
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.api || !paySupplier) return;
    const amountRupees = parseFloat(payAmountRupees);
    if (isNaN(amountRupees) || amountRupees <= 0) {
      setErrorMsg('Please enter a valid payment amount.');
      return;
    }

    const amountPaise = Math.round(amountRupees * 100);

    try {
      const res = await window.api.payments.recordSupplierPayment({
        supplier_id: paySupplier.id,
        purchase_id: selectedPurchaseId || null,
        amount_paise: amountPaise,
        payment_date: payDate,
        payment_mode: payMode,
        reference_number: payRef.trim() || null,
        notes: payNotes.trim() || null,
      });

      if (res.success) {
        setSuccessMsg(`Payment of ₹${amountRupees.toFixed(2)} recorded to ${paySupplier.name}.`);
        setPaySupplier(null);
        loadSuppliers(searchQuery);
        if (statementSupplier && statementSupplier.id === paySupplier.id) {
          openStatement(statementSupplier);
        }
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  // KPI Calculations
  const totalPayablesPaise = suppliers.reduce((sum, s) => sum + s.balance_paise, 0);
  const activeCount = suppliers.filter((s) => s.is_active === 1).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-retail-card p-4 rounded-xl border border-retail-border shadow-2xs">
          <div className="flex items-center justify-between text-retail-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Suppliers</span>
            <Building2 size={18} className="text-brand-primary" />
          </div>
          <div className="text-2xl font-bold text-retail-text">{suppliers.length}</div>
          <div className="text-[11px] text-retail-muted mt-1">{activeCount} active manufacturing accounts</div>
        </div>

        <div className="bg-retail-card p-4 rounded-xl border border-retail-border shadow-2xs">
          <div className="flex items-center justify-between text-retail-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Accounts Payable</span>
            <ArrowUpRight size={18} className="text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600">₹ {(totalPayablesPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div className="text-[11px] text-retail-muted mt-1">Outstanding vendor dues</div>
        </div>

        <div className="bg-retail-card p-4 rounded-xl border border-retail-border shadow-2xs">
          <div className="flex items-center justify-between text-retail-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Payment Terms</span>
            <Clock size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-retail-text">
            {suppliers.length > 0
              ? Math.round(
                  suppliers.reduce((sum, s) => sum + (s.payment_terms_days || 30), 0) / suppliers.length
                )
              : 30}{' '}
            Days
          </div>
          <div className="text-[11px] text-retail-muted mt-1">Standard B2B credit window</div>
        </div>

        <div className="bg-retail-card p-4 rounded-xl border border-retail-border shadow-2xs">
          <div className="flex items-center justify-between text-retail-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">GST Registered</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-retail-text">
            {suppliers.filter((s) => s.gstin && s.gstin.length >= 15).length} / {suppliers.length}
          </div>
          <div className="text-[11px] text-retail-muted mt-1">With valid GSTIN profiles</div>
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
            placeholder="Search suppliers by name, phone, GSTIN..."
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
            onClick={() => loadSuppliers(searchQuery)}
          >
            Refresh
          </Button>
          <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={openAddModal}>
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-retail-card rounded-xl border border-retail-border shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-retail-bg/60 text-retail-muted border-b border-retail-border uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="px-4 py-3">Supplier / Company</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">GSTIN / State</th>
                <th className="px-4 py-3">Payment Terms</th>
                <th className="px-4 py-3 text-right">Payable Balance</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-retail-border/60 text-retail-text">
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-retail-muted">
                    {loading ? 'Loading suppliers...' : 'No suppliers found matching your query.'}
                  </td>
                </tr>
              ) : (
                suppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-retail-bg/40 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div className="font-semibold text-retail-text">{sup.name}</div>
                      {sup.company_name && (
                        <div className="text-[11px] text-retail-muted">{sup.company_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-retail-muted">
                      {sup.phone && (
                        <div className="flex items-center gap-1.5 text-retail-text">
                          <Phone size={12} className="text-retail-muted" />
                          <span>{sup.phone}</span>
                        </div>
                      )}
                      {sup.email && (
                        <div className="flex items-center gap-1.5 text-[11px] text-retail-muted mt-0.5">
                          <Mail size={12} />
                          <span>{sup.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-[11px] text-retail-text font-medium">
                        {sup.gstin || <span className="text-retail-muted">Unregistered</span>}
                      </div>
                      <div className="text-[10px] text-retail-muted">State Code: {sup.state_code || '27'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="neutral">{sup.payment_terms_days || 30} Days</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {sup.balance_paise > 0 ? (
                        <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-[11px]">
                          ₹ {(sup.balance_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                          onClick={() => openStatement(sup)}
                        >
                          Khata
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<CreditCard size={12} />}
                          onClick={() => openPayModal(sup)}
                        >
                          Pay
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Edit2 size={12} />}
                          onClick={() => openEditModal(sup)}
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

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        title={editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Add New Supplier'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">
                Supplier / Business Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Meerut Sports Crafts LLP"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">Company / Brand Name</label>
              <Input
                placeholder="e.g. Sanspareils Greenlands (SG)"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">Phone Number</label>
              <Input
                placeholder="+91 98370 12345"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">Email Address</label>
              <Input
                type="email"
                placeholder="sales@meerutcrafts.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">GSTIN</label>
              <Input
                placeholder="09AABCM1234F1Z1"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                maxLength={15}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">State Code (GST)</label>
              <Input
                placeholder="27 (Maharashtra) or 09 (UP)"
                value={formData.state_code}
                onChange={(e) => setFormData({ ...formData, state_code: e.target.value })}
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">Payment Terms (Days)</label>
              <Input
                type="number"
                min="0"
                max="180"
                placeholder="30"
                value={formData.payment_terms_days}
                onChange={(e) => setFormData({ ...formData, payment_terms_days: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-retail-text mb-1">Address / Factory Location</label>
            <Input
              placeholder="e.g. Partapur Industrial Estate, Meerut, UP"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-retail-text mb-1">Notes / Bank Details</label>
            <textarea
              rows={2}
              placeholder="e.g. Bank A/C details, lead delivery times, authorized contacts..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg border border-retail-border bg-retail-bg text-retail-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-retail-border">
            <Button variant="secondary" onClick={() => setShowSupplierModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingSupplier ? 'Save Changes' : 'Create Supplier'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Supplier Statement / Khata Modal */}
      <Modal
        isOpen={!!statementSupplier}
        onClose={() => setStatementSupplier(null)}
        title={statementSupplier ? `Vendor Ledger / Khata: ${statementSupplier.name}` : ''}
        maxWidth="xl"
      >
        {loadingStatement ? (
          <div className="p-8 text-center text-retail-muted">Loading statement records...</div>
        ) : statementData ? (
          <div className="space-y-4">
            {/* Header KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-retail-bg p-3.5 rounded-xl border border-retail-border">
              <div>
                <div className="text-[10px] uppercase font-bold text-retail-muted">Total Purchases</div>
                <div className="text-base font-bold text-retail-text">
                  ₹ {(statementData.totalPurchasesPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-retail-muted">Total Paid (Payouts)</div>
                <div className="text-base font-bold text-emerald-600">
                  ₹ {(statementData.totalPaidPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-retail-muted">Returns / Credits</div>
                <div className="text-base font-bold text-blue-600">
                  ₹ {(statementData.totalReturnsPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-retail-muted">Net Outstanding Payable</div>
                <div className="text-base font-bold text-red-600">
                  ₹ {(statementData.outstandingBalancePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center justify-between border-b border-retail-border pb-2">
              <div className="flex gap-2">
                {(['all', 'purchases', 'payments', 'returns'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatementTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      statementTab === tab
                        ? 'bg-brand-primary text-white'
                        : 'bg-retail-bg text-retail-muted hover:text-retail-text'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={<CreditCard size={14} />}
                onClick={() => openPayModal(statementSupplier!)}
              >
                + Record Payment
              </Button>
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
                    <th className="px-3 py-2 text-right">Debit (Paid/Return)</th>
                    <th className="px-3 py-2 text-right">Credit (Purchase)</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-retail-border/60">
                  {statementData.entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-retail-muted">
                        No transactions recorded for this supplier.
                      </td>
                    </tr>
                  ) : (
                    statementData.entries
                      .filter((e) => {
                        if (statementTab === 'purchases') return e.type === 'PURCHASE';
                        if (statementTab === 'payments') return e.type === 'PAYMENT';
                        if (statementTab === 'returns') return e.type === 'RETURN';
                        return true;
                      })
                      .map((e) => (
                        <tr key={e.id} className="hover:bg-retail-bg/40">
                          <td className="px-3 py-2 font-mono text-[11px] text-retail-muted">{e.date}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                e.type === 'PURCHASE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : e.type === 'PAYMENT'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {e.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-retail-text font-semibold">{e.reference_number}</td>
                          <td className="px-3 py-2 text-retail-text">{e.description}</td>
                          <td className="px-3 py-2 text-right text-emerald-600 font-medium">
                            {e.debit_paise > 0 ? `₹ ${(e.debit_paise / 100).toFixed(2)}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-red-600 font-medium">
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

      {/* Record Supplier Payment Modal */}
      <Modal
        isOpen={!!paySupplier}
        onClose={() => setPaySupplier(null)}
        title={paySupplier ? `Record Payment to: ${paySupplier.name}` : ''}
        maxWidth="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="bg-retail-bg p-3 rounded-lg border border-retail-border text-xs flex justify-between items-center">
            <span className="text-retail-muted font-medium">Current Payable Balance:</span>
            <span className="font-bold text-red-600 text-sm">
              ₹ {paySupplier ? (paySupplier.balance_paise / 100).toFixed(2) : '0.00'}
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
                className="w-full text-xs p-2.5 rounded-lg border border-retail-border bg-retail-bg text-retail-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                <option value="UPI">UPI / QR</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Debit / Credit Card</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-retail-text mb-1">Payment Date</label>
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
              Reference / UTR / Cheque Number
            </label>
            <Input
              placeholder="e.g. UTR-99882211 or Cheque #104052"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-retail-text mb-1">Notes</label>
            <Input
              placeholder="e.g. Partial settlement for bill batch"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-retail-border">
            <Button variant="secondary" onClick={() => setPaySupplier(null)}>
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
