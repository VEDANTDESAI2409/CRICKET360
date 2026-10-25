import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  DollarSign,
  PackageCheck,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from 'lucide-react';
import {
  SalesReportSummary,
  ProfitLossReport,
  InventoryValuationReport,
  TaxSummaryReport,
  PaymentRegisterSummary,
  ReportDateFilter,
} from '../../../shared/types/models';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';

type ReportTab = 'SALES' | 'PROFIT_LOSS' | 'INVENTORY' | 'TAX' | 'CASH_FLOW';

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('SALES');

  // Date filters
  const today = new Date().toISOString().slice(0, 10);
  const currentMonthStart = today.slice(0, 7) + '-01';
  const [startDate, setStartDate] = useState(currentMonthStart);
  const [endDate, setEndDate] = useState(today);

  // Report Data States
  const [salesReport, setSalesReport] = useState<SalesReportSummary | null>(null);
  const [pnlReport, setPnlReport] = useState<ProfitLossReport | null>(null);
  const [inventoryReport, setInventoryReport] = useState<InventoryValuationReport | null>(null);
  const [taxReport, setTaxReport] = useState<TaxSummaryReport | null>(null);
  const [cashFlowReport, setCashFlowReport] = useState<PaymentRegisterSummary | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadCurrentReport = async () => {
    if (!window.api) return;
    setLoading(true);
    setErrorMsg('');
    const filter: ReportDateFilter = {
      start_date: startDate,
      end_date: endDate,
    };

    try {
      if (activeTab === 'SALES') {
        const res = await window.api.reports.getSalesReport(filter);
        if (res.success) setSalesReport(res.data);
        else setErrorMsg(res.error);
      } else if (activeTab === 'PROFIT_LOSS') {
        const res = await window.api.reports.getProfitLossReport(filter);
        if (res.success) setPnlReport(res.data);
        else setErrorMsg(res.error);
      } else if (activeTab === 'INVENTORY') {
        const res = await window.api.reports.getInventoryValuationReport();
        if (res.success) setInventoryReport(res.data);
        else setErrorMsg(res.error);
      } else if (activeTab === 'TAX') {
        const res = await window.api.reports.getTaxReport(filter);
        if (res.success) setTaxReport(res.data);
        else setErrorMsg(res.error);
      } else if (activeTab === 'CASH_FLOW') {
        const res = await window.api.reports.getPaymentsSummaryReport(filter);
        if (res.success) setCashFlowReport(res.data);
        else setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentReport();
  }, [activeTab, startDate, endDate]);

  const handleExportCsv = async () => {
    if (!window.api) return;
    try {
      const typeMap: Record<ReportTab, string> = {
        SALES: 'sales',
        PROFIT_LOSS: 'profit_loss',
        INVENTORY: 'inventory',
        TAX: 'tax',
        CASH_FLOW: 'sales',
      };
      const res = await window.api.reports.exportCsv(typeMap[activeTab], {
        start_date: startDate,
        end_date: endDate,
      });

      if (res.success) {
        // Trigger browser-like file download
        const blob = new Blob([res.data.csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', res.data.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setSuccessMsg(`Report exported to ${res.data.filename}`);
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const setQuickRange = (range: 'THIS_MONTH' | 'LAST_30' | 'YEAR_TO_DATE') => {
    if (range === 'THIS_MONTH') {
      setStartDate(currentMonthStart);
      setEndDate(today);
    } else if (range === 'LAST_30') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(today);
    } else if (range === 'YEAR_TO_DATE') {
      const yr = new Date().getFullYear();
      setStartDate(`${yr}-01-01`);
      setEndDate(today);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-emerald-600" />
            Reports & Business Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Auditable sales, P&L, inventory valuation, cash flow, and GST tax registers reconciled to the general ledger.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExportCsv}
            icon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            onClick={loadCurrentReport}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Run Report'}
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Period:</span>
          <button
            onClick={() => setQuickRange('THIS_MONTH')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            This Month
          </button>
          <button
            onClick={() => setQuickRange('LAST_30')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setQuickRange('YEAR_TO_DATE')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Year to Date
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs w-36"
            title="Start Date"
          />
          <span className="text-slate-400 text-xs">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs w-36"
            title="End Date"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px">
        {[
          { key: 'SALES', label: 'Sales & Revenue', icon: TrendingUp },
          { key: 'PROFIT_LOSS', label: 'Profit & Loss', icon: DollarSign },
          { key: 'INVENTORY', label: 'Stock Valuation', icon: Layers },
          { key: 'TAX', label: 'GST Tax Summary', icon: FileSpreadsheet },
          { key: 'CASH_FLOW', label: 'Cash Flow Register', icon: PackageCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as ReportTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-colors border-t border-x ${
                isActive
                  ? 'bg-white border-slate-200 text-emerald-700 border-b-transparent shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Notification */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
          {successMsg}
        </div>
      )}

      {/* TAB 1: SALES & REVENUE */}
      {activeTab === 'SALES' && salesReport && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Gross Sales</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                ₹{(salesReport.grossSalesPaise / 100).toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{salesReport.totalInvoicesCount} invoices billed</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Discounts & Returns</div>
              <div className="text-2xl font-bold text-rose-600 mt-1">
                ₹{((salesReport.totalDiscountsPaise + salesReport.returnsAmountPaise) / 100).toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Disc: ₹{(salesReport.totalDiscountsPaise / 100).toFixed(2)} &bull; Ret: ₹{(salesReport.returnsAmountPaise / 100).toFixed(2)}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Net Sales Revenue</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                ₹{(salesReport.netSalesPaise / 100).toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Reconciled net revenue</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Total Tax Collected</div>
              <div className="text-2xl font-bold text-indigo-600 mt-1">
                ₹{(salesReport.totalTaxPaise / 100).toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                CGST: ₹{(salesReport.cgstPaise / 100).toFixed(2)} &bull; SGST: ₹{(salesReport.sgstPaise / 100).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Payment Mode Distribution & Daily Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
                Tendered Payment Modes
              </h3>
              <div className="space-y-3 text-sm">
                {Object.entries(salesReport.paymentBreakdown).map(([mode, amt]) => (
                  <div key={mode} className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="font-semibold text-slate-700">{mode}</span>
                    <span className="font-mono font-bold text-slate-900">₹{(amt / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
                Daily Sales Activity ({salesReport.startDate} to {salesReport.endDate})
              </h3>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-center">Invoices</th>
                      <th className="py-2 px-3 text-right">Net Sales (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salesReport.dailyTrend.map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-medium text-slate-800">{row.date}</td>
                        <td className="py-2 px-3 text-center font-bold text-slate-600">{row.invoiceCount}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{(row.netSalesPaise / 100).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROFIT & LOSS */}
      {activeTab === 'PROFIT_LOSS' && pnlReport && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Costing Disclosure:</strong> Cost of Goods Sold (COGS) is calculated using the{' '}
              <strong>{pnlReport.costingMethod}</strong> method from purchase invoices and inward inventory batches, adjusted for restocked customer returns.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Net Sales Revenue</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                ₹{(pnlReport.netRevenuePaise / 100).toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">After discounts & returns</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Cost of Goods Sold (COGS)</div>
              <div className="text-2xl font-bold text-slate-700 mt-1">
                ₹{(pnlReport.cogsPaise / 100).toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Weighted inward purchase costs</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Gross Margin</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                ₹{(pnlReport.grossProfitPaise / 100).toFixed(2)}
              </div>
              <div className="text-xs text-emerald-600 font-bold mt-0.5">
                {pnlReport.grossMarginPercent}% Gross Margin
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Net Operating Profit</div>
              <div className={`text-2xl font-bold mt-1 ${pnlReport.netOperatingProfitPaise >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                ₹{(pnlReport.netOperatingProfitPaise / 100).toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 font-bold mt-0.5">
                {pnlReport.netMarginPercent}% Net Operating Margin
              </div>
            </div>
          </div>

          {/* Detailed Statement Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
              Comprehensive Income & Expense Statement
            </h3>
            <div className="space-y-2 text-sm divide-y divide-slate-100">
              <div className="flex justify-between py-2">
                <span className="font-semibold text-slate-700">Gross Sales Revenue</span>
                <span className="font-mono font-bold text-slate-900">₹{(pnlReport.grossRevenuePaise / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 text-rose-600">
                <span>Less: Trade & Invoice Discounts</span>
                <span className="font-mono font-bold">-₹{(pnlReport.discountsPaise / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 text-rose-600">
                <span>Less: Sales Returns & Refunds</span>
                <span className="font-mono font-bold">-₹{(pnlReport.returnsPaise / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 bg-slate-50 font-bold">
                <span className="text-slate-800">Net Sales Revenue</span>
                <span className="font-mono text-emerald-700">₹{(pnlReport.netRevenuePaise / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 text-slate-700">
                <span>Less: Cost of Goods Sold (COGS)</span>
                <span className="font-mono font-bold text-slate-800">-₹{(pnlReport.cogsPaise / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2.5 bg-emerald-50 text-emerald-900 font-bold text-base">
                <span>Gross Trading Profit</span>
                <span className="font-mono">₹{(pnlReport.grossProfitPaise / 100).toFixed(2)}</span>
              </div>
              <div className="pt-4 pb-1">
                <div className="text-xs font-bold uppercase text-slate-400 mb-2">Operating Expenses Breakdown</div>
                {pnlReport.expensesByCategory.length === 0 ? (
                  <div className="text-xs text-slate-400 italic">No paid operating expenses recorded in this period.</div>
                ) : (
                  pnlReport.expensesByCategory.map((exp) => (
                    <div key={exp.categoryName} className="flex justify-between py-1 text-xs text-slate-600">
                      <span>{exp.categoryName}</span>
                      <span className="font-mono font-semibold">₹{(exp.amountPaise / 100).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between py-2 text-rose-700 font-semibold">
                <span>Total Operating Overheads</span>
                <span className="font-mono font-bold">-₹{(pnlReport.operatingExpensesPaise / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-3 bg-slate-900 text-white font-bold text-lg rounded-xl px-4 mt-3">
                <span>Net Operating Profit</span>
                <span className="font-mono text-emerald-400">₹{(pnlReport.netOperatingProfitPaise / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INVENTORY VALUATION */}
      {activeTab === 'INVENTORY' && inventoryReport && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Total Stock Units</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{inventoryReport.totalStockUnits}</div>
              <div className="text-xs text-slate-500 mt-0.5">Physical items in store</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Total Cost Valuation</div>
              <div className="text-2xl font-bold text-indigo-600 mt-1">
                ₹{(inventoryReport.totalCostValuationPaise / 100).toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Purchase cost valuation</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Retail Selling Valuation</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                ₹{(inventoryReport.totalRetailValuationPaise / 100).toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Potential retail revenue</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Potential Gross Profit</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                ₹{(inventoryReport.potentialGrossProfitPaise / 100).toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Unrealized retail profit margin</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
              Category Valuation Breakdown
            </h3>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Stock Units</th>
                  <th className="py-2.5 px-3 text-right">Cost Valuation (₹)</th>
                  <th className="py-2.5 px-3 text-right">Retail Valuation (₹)</th>
                  <th className="py-2.5 px-3 text-right">Potential Margin (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {inventoryReport.categoryBreakdown.map((cat) => {
                  const margin = cat.retailValuationPaise - cat.costValuationPaise;
                  return (
                    <tr key={cat.categoryName} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{cat.categoryName}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{cat.units}</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹{(cat.costValuationPaise / 100).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        ₹{(cat.retailValuationPaise / 100).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                        ₹{(margin / 100).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GST TAX SUMMARY */}
      {activeTab === 'TAX' && taxReport && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Total Output Tax (Sales)</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                ₹{(taxReport.totalOutputTaxPaise / 100).toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">GST collected on outward sales</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Input Tax Credit (ITC)</div>
              <div className="text-2xl font-bold text-indigo-600 mt-1">
                ₹{(taxReport.totalInputTaxPaise / 100).toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">GST paid on inward purchases</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Net Tax Liability</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                ₹{(Math.max(0, taxReport.totalOutputTaxPaise - taxReport.totalInputTaxPaise) / 100).toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Output tax less ITC estimate</div>
            </div>
          </div>

          {/* HSN Summary Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
              HSN Wise Outward Tax Register (GSTR-1 Ready)
            </h3>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">HSN Code</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-center">Tax Rate</th>
                  <th className="py-2.5 px-3 text-center">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                  <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                  <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                  <th className="py-2.5 px-3 text-right">Total Tax (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {taxReport.hsnSummary.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No tax transactions found for selected date range.
                    </td>
                  </tr>
                ) : (
                  taxReport.hsnSummary.map((h) => (
                    <tr key={`${h.hsnCode}-${h.taxRatePercent}`} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{h.hsnCode}</td>
                      <td className="py-2.5 px-3 text-slate-600">{h.description}</td>
                      <td className="py-2.5 px-3 text-center font-bold">{h.taxRatePercent}%</td>
                      <td className="py-2.5 px-3 text-center font-semibold">{h.totalQuantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹{(h.taxableAmountPaise / 100).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹{(h.cgstPaise / 100).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹{(h.sgstPaise / 100).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{(h.totalTaxPaise / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: CASH FLOW REGISTER */}
      {activeTab === 'CASH_FLOW' && cashFlowReport && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400">Total Cash Inflows</div>
                <div className="text-2xl font-bold text-emerald-700 mt-1">
                  ₹{(cashFlowReport.totalInflowsPaise / 100).toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Sales receipts & Khata collections</div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
                <ArrowDownRight className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400">Total Cash Outflows</div>
                <div className="text-2xl font-bold text-rose-600 mt-1">
                  ₹{(cashFlowReport.totalOutflowsPaise / 100).toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Suppliers, expenses, and refunds</div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400">Net Cash Flow</div>
                <div className={`text-2xl font-bold mt-1 ${cashFlowReport.netCashFlowPaise >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  ₹{(cashFlowReport.netCashFlowPaise / 100).toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Net liquidity balance movement</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 text-emerald-700">
                Inflows by Payment Mode
              </h3>
              <div className="space-y-3 text-sm">
                {Object.entries(cashFlowReport.inflowsByMode).map(([mode, amt]) => (
                  <div key={mode} className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="font-semibold text-slate-700">{mode}</span>
                    <span className="font-mono font-bold text-emerald-800">₹{(amt / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 text-rose-700">
                Outflows by Payment Mode
              </h3>
              <div className="space-y-3 text-sm">
                {Object.entries(cashFlowReport.outflowsByMode).map(([mode, amt]) => (
                  <div key={mode} className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="font-semibold text-slate-700">{mode}</span>
                    <span className="font-mono font-bold text-rose-800">₹{(amt / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
