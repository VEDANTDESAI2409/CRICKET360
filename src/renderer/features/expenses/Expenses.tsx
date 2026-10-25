import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  Clock,
  Tag,
} from 'lucide-react';
import {
  Expense,
  ExpenseCategory,
  Supplier,
  PaymentMode,
  CreateExpenseInput,
  UpdateExpenseInput,
} from '../../../shared/types/models';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'DRAFT'>('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | PaymentMode>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal State for Add / Edit Expense
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [formCategoryId, setFormCategoryId] = useState<number>(1);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formAmountRupees, setFormAmountRupees] = useState('');
  const [formMode, setFormMode] = useState<PaymentMode>('CASH');
  const [formStatus, setFormStatus] = useState<'PAID' | 'PENDING' | 'DRAFT'>('PAID');
  const [formPayee, setFormPayee] = useState('');
  const [formSupplierId, setFormSupplierId] = useState<number | null>(null);
  const [formRef, setFormRef] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal State for Add Category
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const loadData = async () => {
    if (!window.api) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const [expRes, catRes, supRes] = await Promise.all([
        window.api.expenses.getAll({
          search: searchQuery || undefined,
          category_id: selectedCatFilter !== 'ALL' ? selectedCatFilter : undefined,
          payment_status: statusFilter !== 'ALL' ? statusFilter : undefined,
          payment_mode: modeFilter !== 'ALL' ? modeFilter : undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
        window.api.expenses.getCategories(),
        window.api.suppliers.getAll(),
      ]);

      if (expRes.success) setExpenses(expRes.data);
      if (catRes.success) {
        setCategories(catRes.data);
        if (catRes.data.length > 0 && !formCategoryId) {
          setFormCategoryId(catRes.data[0].id);
        }
      }
      if (supRes.success) setSuppliers(supRes.data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedCatFilter, statusFilter, modeFilter, startDate, endDate]);

  const openNewExpenseModal = () => {
    setEditingExpenseId(null);
    setFormCategoryId(categories[0]?.id || 1);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormAmountRupees('');
    setFormMode('CASH');
    setFormStatus('PAID');
    setFormPayee('');
    setFormSupplierId(null);
    setFormRef('');
    setFormNotes('');
    setShowExpenseModal(true);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const openEditExpenseModal = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setFormCategoryId(exp.category_id);
    setFormDate(exp.expense_date);
    setFormAmountRupees((exp.amount_paise / 100).toFixed(2));
    setFormMode(exp.payment_mode);
    setFormStatus(exp.payment_status);
    setFormPayee(exp.payee_name || '');
    setFormSupplierId(exp.supplier_id || null);
    setFormRef(exp.reference_number || '');
    setFormNotes(exp.notes || '');
    setShowExpenseModal(true);
    setErrorMsg('');
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.api) return;

    const amtRupees = parseFloat(formAmountRupees);
    if (isNaN(amtRupees) || amtRupees <= 0) {
      setErrorMsg('Please enter a valid expense amount greater than 0.');
      return;
    }

    const amountPaise = Math.round(amtRupees * 100);
    setSubmitting(true);
    setErrorMsg('');

    try {
      if (editingExpenseId) {
        const updatePayload: UpdateExpenseInput = {
          id: editingExpenseId,
          category_id: formCategoryId,
          expense_date: formDate,
          amount_paise: amountPaise,
          payment_mode: formMode,
          payment_status: formStatus,
          payee_name: formPayee.trim() || null,
          supplier_id: formSupplierId || null,
          reference_number: formRef.trim() || null,
          notes: formNotes.trim() || null,
        };
        const res = await window.api.expenses.update(updatePayload);
        if (res.success) {
          setSuccessMsg(`Expense ${res.data.expense_number} updated successfully!`);
          setShowExpenseModal(false);
          loadData();
        } else {
          setErrorMsg(res.error);
        }
      } else {
        const createPayload: CreateExpenseInput = {
          category_id: formCategoryId,
          expense_date: formDate,
          amount_paise: amountPaise,
          payment_mode: formMode,
          payment_status: formStatus,
          payee_name: formPayee.trim() || null,
          supplier_id: formSupplierId || null,
          reference_number: formRef.trim() || null,
          notes: formNotes.trim() || null,
        };
        const res = await window.api.expenses.create(createPayload);
        if (res.success) {
          setSuccessMsg(`Expense ${res.data.expense_number} recorded successfully!`);
          setShowExpenseModal(false);
          loadData();
        } else {
          setErrorMsg(res.error);
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: number, expNum: string) => {
    if (!window.confirm(`Are you sure you want to delete expense record ${expNum}?`)) {
      return;
    }
    if (!window.api) return;

    try {
      const res = await window.api.expenses.delete(id);
      if (res.success) {
        setSuccessMsg(`Expense ${expNum} deleted successfully.`);
        loadData();
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.api) return;
    if (!newCatName.trim() || !newCatCode.trim()) {
      setErrorMsg('Category name and code are required.');
      return;
    }

    try {
      const res = await window.api.expenses.createCategory({
        name: newCatName.trim(),
        code: newCatCode.trim().toUpperCase(),
        description: newCatDesc.trim() || null,
      });

      if (res.success) {
        setSuccessMsg(`Category "${res.data.name}" added successfully.`);
        setShowCategoryModal(false);
        setNewCatName('');
        setNewCatCode('');
        setNewCatDesc('');
        loadData();
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  // KPI calculations
  const totalPaidPaise = expenses
    .filter((e) => e.payment_status === 'PAID')
    .reduce((sum, e) => sum + e.amount_paise, 0);

  const pendingPaise = expenses
    .filter((e) => e.payment_status === 'PENDING' || e.payment_status === 'DRAFT')
    .reduce((sum, e) => sum + e.amount_paise, 0);

  // Group by category to find top expense
  const catSums: Record<string, number> = {};
  for (const e of expenses) {
    const cName = e.category_name || 'General';
    catSums[cName] = (catSums[cName] || 0) + e.amount_paise;
  }
  let topCatName = 'None';
  let topCatVal = 0;
  for (const [k, v] of Object.entries(catSums)) {
    if (v > topCatVal) {
      topCatVal = v;
      topCatName = k;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-indigo-600" />
            Operating Expenses
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track showroom rent, power, salaries, cricket gear freight, maintenance, and day-to-day retail outlays.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={loadData}
            disabled={loading}
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCategoryModal(true);
              setErrorMsg('');
            }}
            icon={<Tag className="w-4 h-4" />}
          >
            Add Category
          </Button>
          <Button
            variant="primary"
            onClick={openNewExpenseModal}
            icon={<Plus className="w-4 h-4" />}
          >
            Record Expense
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
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Paid Out</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">₹{(totalPaidPaise / 100).toFixed(2)}</div>
            <div className="text-xs text-slate-500 mt-0.5">Recorded operating cash outflow</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending / Drafts</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">₹{(pendingPaise / 100).toFixed(2)}</div>
            <div className="text-xs text-slate-500 mt-0.5">Accrued or draft entries</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Top Cost Center</div>
            <div className="text-xl font-bold text-slate-800 mt-1 truncate max-w-[200px]" title={topCatName}>
              {topCatName}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">₹{(topCatVal / 100).toFixed(2)} total spend</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <Input
            placeholder="Search by expense #, payee, reference, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCatFilter}
            onChange={(e) => setSelectedCatFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="DRAFT">Draft</option>
          </select>

          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as any)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="ALL">All Payment Modes</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CHEQUE">Cheque</option>
          </select>

          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Start Date"
            className="w-36 text-xs"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="End Date"
            className="w-36 text-xs"
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Expense #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Payee / Beneficiary</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4">Ref #</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Receipt className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    No expenses found matching current filters.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{exp.expense_number}</td>
                    <td className="py-3 px-4 text-slate-600">{exp.expense_date}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                        {exp.category_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {exp.payee_name || (exp.supplier_name ? `Supplier: ${exp.supplier_name}` : '-')}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="neutral">{exp.payment_mode}</Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant={
                          exp.payment_status === 'PAID'
                            ? 'success'
                            : exp.payment_status === 'PENDING'
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {exp.payment_status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{(exp.amount_paise / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-xs">{exp.reference_number || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditExpenseModal(exp)}
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExpense(exp.id, exp.expense_number)}
                          icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
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

      {/* Add / Edit Expense Modal */}
      {showExpenseModal && (
        <Modal
          isOpen={showExpenseModal}
          onClose={() => setShowExpenseModal(false)}
          title={editingExpenseId ? 'Edit Expense Record' : 'Record Operating Expense'}
          maxWidth="md"
        >
          <form onSubmit={handleSaveExpense} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Expense Category *</label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Expense Date *</label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (₹) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 15000.00"
                  value={formAmountRupees}
                  onChange={(e) => setFormAmountRupees(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Mode *</label>
                <select
                  value={formMode}
                  onChange={(e) => setFormMode(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Status *</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="PAID">Paid (Cash/Bank Outflow)</option>
                  <option value="PENDING">Pending (Payable)</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Payee / Beneficiary</label>
                <Input
                  placeholder="e.g. Landlord, Electricity Board, Courier"
                  value={formPayee}
                  onChange={(e) => setFormPayee(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Linked Supplier (Optional)</label>
                <select
                  value={formSupplierId || ''}
                  onChange={(e) => setFormSupplierId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">None (General Payee)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Reference # / Bill #</label>
                <Input
                  placeholder="Bill / Cheque / UTR #"
                  value={formRef}
                  onChange={(e) => setFormRef(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Description</label>
              <Input
                placeholder="Additional details for bookkeeping..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button variant="secondary" type="button" onClick={() => setShowExpenseModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingExpenseId ? 'Update Expense' : 'Save Expense'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <Modal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          title="Create Expense Category"
          maxWidth="sm"
        >
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category Name *</label>
              <Input
                placeholder="e.g. Internet & Broadband"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category Code *</label>
              <Input
                placeholder="e.g. INTERNET"
                value={newCatCode}
                onChange={(e) => setNewCatCode(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
              <Input
                placeholder="Brief purpose of this category..."
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setShowCategoryModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Create Category
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
