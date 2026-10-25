import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Store,
  Database,
  FileSpreadsheet,
  ShieldCheck,
  History,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Download,
  Upload,
  FileCheck,
} from 'lucide-react';
import {
  ShopSettings,
  UpdateShopSettingsInput,
  BackupMetadata,
  AuditLog,
  VerifyBackupResult,
} from '../../../shared/types/models';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';

type SettingsTab = 'STORE' | 'BACKUPS' | 'EXPORT_IMPORT' | 'AUDIT' | 'PERMISSIONS';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('STORE');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Store Profile State
  const [shopSettings, setShopSettings] = useState<ShopSettings>({
    shop_name: 'Cricket360 Sports & Pro Shop',
    shop_address: '12, Sports Complex Road, Mumbai, Maharashtra',
    shop_phone: '+91 98765 43210',
    shop_email: 'contact@cricket360.local',
    shop_gstin: '27AABBC1234D1Z5',
    shop_state_code: '27',
    invoice_prefix: 'INV-',
    next_invoice_number: '1001',
    thermal_printer_name: 'Default POS Printer',
    thermal_receipt_width: '80mm',
    currency_symbol: '₹',
    store_terms_and_conditions:
      '1. Goods once sold can only be exchanged within 7 days against valid receipt. 2. No exchange on used or knocked-in bats. 3. Warranty as per manufacturer terms.',
    auto_backup_enabled: 'true',
    auto_backup_retention_days: '30',
    low_stock_warning_threshold: '5',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Backups State
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [backupNotes, setBackupNotes] = useState('');
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ filename: string; result: VerifyBackupResult } | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditFilterAction, setAuditFilterAction] = useState('');

  // Export / Import State
  const [csvFileContent, setCsvFileContent] = useState('');
  const [importResult, setImportResult] = useState<{ count: number; errors: string[] } | null>(null);

  const loadData = async () => {
    if (!window.api) return;
    setLoading(true);
    setErrorMsg('');
    try {
      if (activeTab === 'STORE') {
        const res = await window.api.systemSettings.get();
        if (res.success) setShopSettings(res.data);
      } else if (activeTab === 'BACKUPS') {
        const res = await window.api.backups.getAll();
        if (res.success) setBackups(res.data);
      } else if (activeTab === 'AUDIT') {
        const res = await window.api.audit.getLogs({
          action: auditFilterAction || undefined,
          limit: 100,
        });
        if (res.success) setAuditLogs(res.data);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, auditFilterAction]);

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.api) return;
    setSavingSettings(true);
    setErrorMsg('');
    try {
      const payload: UpdateShopSettingsInput = {
        shop_name: shopSettings.shop_name,
        shop_address: shopSettings.shop_address,
        shop_phone: shopSettings.shop_phone,
        shop_email: shopSettings.shop_email,
        shop_gstin: shopSettings.shop_gstin,
        shop_state_code: shopSettings.shop_state_code,
        invoice_prefix: shopSettings.invoice_prefix,
        thermal_printer_name: shopSettings.thermal_printer_name,
        thermal_receipt_width: shopSettings.thermal_receipt_width,
        store_terms_and_conditions: shopSettings.store_terms_and_conditions,
        auto_backup_enabled: shopSettings.auto_backup_enabled,
        auto_backup_retention_days: shopSettings.auto_backup_retention_days,
        low_stock_warning_threshold: shopSettings.low_stock_warning_threshold,
      };

      const res = await window.api.systemSettings.update(payload);
      if (res.success) {
        setShopSettings(res.data);
        setSuccessMsg('Shop settings and receipt preferences saved successfully!');
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!window.api) return;
    setCreatingBackup(true);
    setErrorMsg('');
    try {
      const res = await window.api.backups.create(backupNotes.trim() || undefined);
      if (res.success) {
        setSuccessMsg(`Backup created successfully: ${res.data.backup_filename}`);
        setBackupNotes('');
        loadData();
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleVerifyBackup = async (filename: string) => {
    if (!window.api) return;
    try {
      const res = await window.api.backups.verify(filename);
      if (res.success) {
        setVerifyResult({ filename, result: res.data });
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (
      !window.confirm(
        `CRITICAL SAFETY CHECK:\nAre you sure you want to restore database from "${filename}"?\n\nAn automatic pre-restore safety snapshot will be taken first so no existing data is permanently lost.`
      )
    ) {
      return;
    }
    if (!window.api) return;

    try {
      const res = await window.api.backups.restore(filename);
      if (res.success) {
        setSuccessMsg(
          `Database successfully restored from ${res.data.restoredFrom}! Safety snapshot saved to ${res.data.preRestoreBackupPath}`
        );
        loadData();
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  // CSV Export/Import Handlers
  const handleExportProducts = async () => {
    if (!window.api) return;
    try {
      const res = await window.api.exportImport.exportProductsCsv();
      if (res.success) {
        downloadBlob(res.data.csvContent, res.data.filename);
        setSuccessMsg(`Exported catalog to ${res.data.filename}`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleExportCustomers = async () => {
    if (!window.api) return;
    try {
      const res = await window.api.exportImport.exportCustomersCsv();
      if (res.success) {
        downloadBlob(res.data.csvContent, res.data.filename);
        setSuccessMsg(`Exported customers to ${res.data.filename}`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleImportCsv = async () => {
    if (!window.api || !csvFileContent.trim()) return;
    try {
      const res = await window.api.exportImport.importProductsCsv(csvFileContent);
      if (res.success) {
        setImportResult({ count: res.data.importedCount, errors: res.data.errors });
        setSuccessMsg(`Import complete! ${res.data.importedCount} products processed.`);
        setCsvFileContent('');
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const downloadBlob = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-7 h-7 text-indigo-600" />
            Store Settings & Business Controls
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure business identity, receipts, database backup snapshots, CSV exports, role access, and audit logs.
          </p>
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px">
        {[
          { key: 'STORE', label: 'Store & Receipt Details', icon: Store },
          { key: 'BACKUPS', label: 'Database Backup & Restore', icon: Database },
          { key: 'EXPORT_IMPORT', label: 'CSV Data Sync', icon: FileSpreadsheet },
          { key: 'AUDIT', label: 'Security Audit Trail', icon: History },
          { key: 'PERMISSIONS', label: 'Roles & Privileges', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as SettingsTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-colors border-t border-x ${
                isActive
                  ? 'bg-white border-slate-200 text-indigo-700 border-b-transparent shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: STORE & RECEIPT SETTINGS */}
      {activeTab === 'STORE' && (
        <form onSubmit={handleSaveStoreSettings} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">
            Sports Pro-Shop Profile & GST Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Shop / Business Name *</label>
              <Input
                value={shopSettings.shop_name}
                onChange={(e) => setShopSettings({ ...shopSettings, shop_name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">GSTIN Number *</label>
              <Input
                value={shopSettings.shop_gstin}
                onChange={(e) => setShopSettings({ ...shopSettings, shop_gstin: e.target.value.toUpperCase() })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Phone *</label>
              <Input
                value={shopSettings.shop_phone}
                onChange={(e) => setShopSettings({ ...shopSettings, shop_phone: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Official Email *</label>
              <Input
                type="email"
                value={shopSettings.shop_email}
                onChange={(e) => setShopSettings({ ...shopSettings, shop_email: e.target.value })}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Showroom Address *</label>
              <Input
                value={shopSettings.shop_address}
                onChange={(e) => setShopSettings({ ...shopSettings, shop_address: e.target.value })}
                required
              />
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2 pt-4">
            Receipt & Invoice Formatting
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Invoice Prefix *</label>
              <Input
                value={shopSettings.invoice_prefix}
                onChange={(e) => setShopSettings({ ...shopSettings, invoice_prefix: e.target.value.toUpperCase() })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">POS Receipt Width</label>
              <select
                value={shopSettings.thermal_receipt_width || '80mm'}
                onChange={(e) => setShopSettings({ ...shopSettings, thermal_receipt_width: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="80mm">80mm (Standard Thermal Roll)</option>
                <option value="58mm">58mm (Compact Mobile Roll)</option>
                <option value="A4">A4 Full Page Laser/Inkjet</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">State Code (POS Place of Supply)</label>
              <Input
                value={shopSettings.shop_state_code}
                onChange={(e) => setShopSettings({ ...shopSettings, shop_state_code: e.target.value })}
                required
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Printable Terms & Conditions</label>
              <textarea
                value={shopSettings.store_terms_and_conditions || ''}
                onChange={(e) => setShopSettings({ ...shopSettings, store_terms_and_conditions: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <Button
              variant="primary"
              type="submit"
              disabled={savingSettings}
              icon={<Save className="w-4 h-4" />}
            >
              {savingSettings ? 'Saving...' : 'Save All Settings'}
            </Button>
          </div>
        </form>
      )}

      {/* TAB 2: DATABASE BACKUPS & RESTORE */}
      {activeTab === 'BACKUPS' && (
        <div className="space-y-6">
          {/* Create Backup Action Bar */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                ACID-Safe Database Backup Generator
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Creates an immutable snapshot of SQLite tables, WAL checkpoints, and integrity hashes using zero-lock online VACUUM INTO.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Optional backup note (e.g. Before weekend tournament rush)..."
                value={backupNotes}
                onChange={(e) => setBackupNotes(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="primary"
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                icon={<Save className="w-4 h-4" />}
              >
                {creatingBackup ? 'Creating...' : 'Create Full Snapshot'}
              </Button>
            </div>
          </div>

          {/* Verification Modal / Alert */}
          {verifyResult && (
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                  <FileCheck className="w-4 h-4" />
                  Integrity Verification: {verifyResult.filename}
                </span>
                <button onClick={() => setVerifyResult(null)} className="text-slate-400 hover:text-white font-bold">
                  &times;
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
                <div>Overall: <span className={verifyResult.result.isValid ? 'text-emerald-400 font-bold' : 'text-rose-400'}>{verifyResult.result.isValid ? 'PASSED' : 'FAILED'}</span></div>
                <div>SHA-256: <span className={verifyResult.result.sha256Matched ? 'text-emerald-400' : 'text-rose-400'}>{verifyResult.result.sha256Matched ? 'MATCH' : 'MISMATCH'}</span></div>
                <div>SQLite PRAGMA: <span className={verifyResult.result.sqliteIntegrityOk ? 'text-emerald-400' : 'text-rose-400'}>{verifyResult.result.sqliteIntegrityOk ? 'OK' : 'CORRUPTED'}</span></div>
                <div>Size: {(verifyResult.result.fileSizeBytes / 1024).toFixed(1)} KB</div>
              </div>
              <div className="text-slate-300 italic pt-1">{verifyResult.result.message}</div>
            </div>
          )}

          {/* Backups List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Existing Backup Snapshots
              </h3>
              <Button variant="ghost" size="sm" onClick={loadData} icon={<RefreshCw className="w-3.5 h-3.5" />}>
                Refresh
              </Button>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Filename</th>
                  <th className="py-2.5 px-4">Created Date</th>
                  <th className="py-2.5 px-4 text-center">Type</th>
                  <th className="py-2.5 px-4 text-center">Size</th>
                  <th className="py-2.5 px-4">SHA-256 Hash</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No backups created yet. Click "Create Full Snapshot" to generate one.
                    </td>
                  </tr>
                ) : (
                  backups.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">{b.backup_filename}</td>
                      <td className="py-2.5 px-4 text-slate-600">{b.created_at}</td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge variant={b.backup_type === 'PRE_RESTORE' ? 'warning' : 'neutral'}>
                          {b.backup_type}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono">{(b.file_size_bytes / 1024).toFixed(1)} KB</td>
                      <td className="py-2.5 px-4 font-mono text-[10px] text-slate-400 max-w-[140px] truncate" title={b.sha256_hash}>
                        {b.sha256_hash}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleVerifyBackup(b.backup_filename)}
                          >
                            Verify
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestoreBackup(b.backup_filename)}
                            className="text-amber-700 hover:text-amber-800 font-semibold"
                          >
                            Restore
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CSV DATA SYNC */}
      {activeTab === 'EXPORT_IMPORT' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600" />
                Data Export to CSV
              </h3>
              <p className="text-xs text-slate-500">
                Download verified tabular records of your products and customer Khata books for external spreadsheets or tax filing.
              </p>
              <div className="space-y-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={handleExportProducts}
                  className="w-full justify-start"
                  icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
                >
                  Export All Products Catalog (.csv)
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleExportCustomers}
                  className="w-full justify-start"
                  icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
                >
                  Export All Customer Accounts (.csv)
                </Button>
              </div>
            </div>

            {/* Import Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                Import Products Catalog from CSV
              </h3>
              <p className="text-xs text-slate-500">
                Paste CSV text to batch-upsert cricket products, opening inventory batches, and pricing.
              </p>
              <textarea
                placeholder="Paste CSV content here (Header: SKU,Product Name,Barcode,Category,Brand,Unit,HSN Code,Purchase Cost,Selling Price,MRP,Stock Qty,Min Stock,Reorder Level)..."
                value={csvFileContent}
                onChange={(e) => setCsvFileContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button
                variant="primary"
                onClick={handleImportCsv}
                disabled={!csvFileContent.trim()}
                icon={<Upload className="w-4 h-4" />}
              >
                Import Catalog Batch
              </Button>
            </div>
          </div>

          {importResult && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-800">
                Import Result: {importResult.count} products successfully processed.
              </div>
              {importResult.errors.length > 0 && (
                <div className="text-rose-700 space-y-1">
                  <div className="font-semibold">Row warnings/errors:</div>
                  {importResult.errors.map((err, idx) => (
                    <div key={idx}>&bull; {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL LOGS */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Auditable System Event Log
              </h3>
              <p className="text-xs text-slate-500">
                Tamper-resistant audit trail of financial refunds, stock adjustments, voids, settings, and backups.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={auditFilterAction}
                onChange={(e) => setAuditFilterAction(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">All Action Types</option>
                <option value="SALES_RETURN">SALES_RETURN</option>
                <option value="INVOICE_VOID">INVOICE_VOID</option>
                <option value="EXPENSE_CREATE">EXPENSE_CREATE</option>
                <option value="EXPENSE_DELETE">EXPENSE_DELETE</option>
                <option value="BACKUP_CREATE">BACKUP_CREATE</option>
                <option value="BACKUP_RESTORE">BACKUP_RESTORE</option>
                <option value="SETTINGS_UPDATE">SETTINGS_UPDATE</option>
              </select>
              <Button variant="secondary" size="sm" onClick={loadData} disabled={loading} icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}>
                Refresh
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Entity Type</th>
                  <th className="py-2.5 px-4">Entity ID</th>
                  <th className="py-2.5 px-4">User</th>
                  <th className="py-2.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                      No audit events recorded for current filter.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-600 font-sans">{log.created_at}</td>
                      <td className="py-2.5 px-4">
                        <Badge
                          variant={
                            log.action.includes('RETURN') || log.action.includes('VOID')
                              ? 'warning'
                              : log.action.includes('RESTORE')
                              ? 'danger'
                              : 'brand'
                          }
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">{log.entity_type}</td>
                      <td className="py-2.5 px-4 text-slate-700 font-bold">{log.entity_id || '-'}</td>
                      <td className="py-2.5 px-4 font-sans text-slate-600">{log.username_snapshot || 'system'}</td>
                      <td className="py-2.5 px-4 text-[11px] text-slate-500 max-w-xs truncate" title={log.details_json || ''}>
                        {log.details_json || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ROLES & PRIVILEGES */}
      {activeTab === 'PERMISSIONS' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Role-Based Access Control Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Active permission rules separating Cashier counter billing operations from Administrative controls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-900 text-sm">ADMINISTRATOR</span>
                <Badge variant="brand">Full Root Access</Badge>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li>Create, edit & void sales invoices</li>
                <li>Process sales returns & store credits</li>
                <li>Record & update procurement bills</li>
                <li>Execute database backup & restoration</li>
                <li>Configure shop details & tax rates</li>
                <li>View profit margins & financial reports</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 text-sm">CASHIER</span>
                <Badge variant="success">Counter Billing</Badge>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li>Create sales invoices & print receipts</li>
                <li>Select walk-in & credit customers</li>
                <li>Receive cash, UPI, & card payments</li>
                <li>View product catalog & stock levels</li>
                <li>Cannot void invoices without admin PIN</li>
                <li>Cannot access database restoration</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">STAFF / INVENTORY</span>
                <Badge variant="neutral">Warehouse Stock</Badge>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li>Check stock availability & SKU lookup</li>
                <li>Conduct physical inventory audits</li>
                <li>Log stock damage with mandatory reason</li>
                <li>Receive incoming purchase shipments</li>
                <li>No access to revenue or profit figures</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
