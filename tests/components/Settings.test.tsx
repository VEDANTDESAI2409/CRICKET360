import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Settings } from '../../src/renderer/features/settings/Settings';
import { ShopSettings, BackupMetadata, AuditLog } from '../../src/shared/types/models';

describe('Milestone 6: Settings & Business Controls Component', () => {
  const mockSettings: ShopSettings = {
    shop_name: 'Cricket360 Pro Arena',
    shop_address: 'Shop #4, Stadium Commercial Complex, Motera, Ahmedabad',
    shop_phone: '+91 98765 43210',
    shop_email: 'arena@cricket360.in',
    shop_gstin: '24AAACC1234D1Z5',
    shop_state_code: '24',
    invoice_prefix: 'INV-',
    next_invoice_number: '1001',
    thermal_printer_name: 'Default POS Printer',
    thermal_receipt_width: '80mm',
    currency_symbol: '₹',
    store_terms_and_conditions: '1. Returns accepted within 7 days with original invoice.',
    auto_backup_enabled: 'true',
    auto_backup_retention_days: '30',
    low_stock_warning_threshold: '5',
  };

  const mockBackups: BackupMetadata[] = [
    {
      id: 1,
      backup_filename: 'cricket360_backup_20261025.db',
      file_path: 'C:\\Users\\vedan\\AppData\\Roaming\\Cricket360\\backups\\cricket360_backup_20261025.db',
      file_size_bytes: 524288,
      sha256_hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      backup_type: 'MANUAL',
      status: 'VALID',
      notes: 'Initial production pre-launch snapshot',
      created_at: '2026-10-25T10:00:00Z',
    },
  ];

  const mockLogs: AuditLog[] = [
    {
      id: 1,
      action: 'SETTINGS_UPDATE',
      entity_type: 'settings',
      entity_id: 'store_profile',
      details_json: '{"shop_name":"Cricket360 Pro Arena"}',
      user_id: 1,
      username_snapshot: 'admin',
      created_at: '2026-10-25T10:05:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      systemSettings: {
        get: vi.fn().mockResolvedValue({ success: true, data: mockSettings }),
        update: vi.fn().mockImplementation((input) =>
          Promise.resolve({
            success: true,
            data: { ...mockSettings, ...input },
          })
        ),
      },
      backups: {
        getAll: vi.fn().mockResolvedValue({ success: true, data: mockBackups }),
        create: vi.fn().mockImplementation((notes?: string) =>
          Promise.resolve({
            success: true,
            data: {
              ...mockBackups[0],
              id: 2,
              backup_filename: 'cricket360_backup_manual.db',
              notes,
            },
          })
        ),
        verify: vi.fn().mockResolvedValue({
          success: true,
          data: {
            isValid: true,
            sha256Matched: true,
            sqliteIntegrityOk: true,
            fileSizeBytes: 524288,
            message: 'Integrity verified OK',
          },
        }),
        restore: vi.fn().mockResolvedValue({
          success: true,
          data: {
            success: true,
            preRestoreBackupFilename: 'pre_restore_backup_20261025.db',
            message: 'Database restored successfully.',
          },
        }),
      },
      audit: {
        getLogs: vi.fn().mockResolvedValue({ success: true, data: mockLogs }),
      },
      exportImport: {
        exportProducts: vi.fn().mockResolvedValue({ success: true, data: 'SKU,Name\nBAT-1,Ton Bat' }),
        exportCustomers: vi.fn().mockResolvedValue({ success: true, data: 'Name,Phone\nRohit,98200' }),
        exportSales: vi.fn().mockResolvedValue({ success: true, data: 'Invoice,Total\nINV-1,23000' }),
      },
    };
  });

  it('1. should render Store Profile settings and allow saving updates', async () => {
    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByText('Store Settings & Business Controls')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Cricket360 Pro Arena')).toBeInTheDocument();
    });

    const shopNameInput = screen.getByDisplayValue('Cricket360 Pro Arena');
    fireEvent.change(shopNameInput, { target: { value: 'Cricket360 Flagship Megastore' } });

    const saveBtn = screen.getByRole('button', { name: /Save All Settings/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect((window as any).api.systemSettings.update).toHaveBeenCalledWith(
        expect.objectContaining({ shop_name: 'Cricket360 Flagship Megastore' })
      );
    });
  });

  it('2. should switch to Backups tab and display snapshots and allow verification', async () => {
    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByText('Store Settings & Business Controls')).toBeInTheDocument();
    });

    const backupTab = screen.getByText('Database Backup & Restore');
    fireEvent.click(backupTab);

    await waitFor(() => {
      expect(screen.getByText('cricket360_backup_20261025.db')).toBeInTheDocument();
    });

    // Test verify button
    const verifyBtn = screen.getByText('Verify');
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect((window as any).api.backups.verify).toHaveBeenCalledWith('cricket360_backup_20261025.db');
    });
  });

  it('3. should switch to Audit Log tab and render audit trails', async () => {
    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByText('Store Settings & Business Controls')).toBeInTheDocument();
    });

    const auditTab = screen.getByText('Security Audit Trail');
    fireEvent.click(auditTab);

    await waitFor(() => {
      expect((window as any).api.audit.getLogs).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getAllByText('SETTINGS_UPDATE').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('store_profile')).toBeInTheDocument();
    });
  });
});
