import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryManagement } from '../../src/renderer/features/inventory/InventoryManagement';

describe('Milestone 3: InventoryManagement Component & Stock Reconciliation', () => {
  const mockProducts = [
    {
      id: 1,
      name: 'SS Ton Master Bat',
      sku: 'BAT-SS-01',
      category_id: 1,
      brand_id: 1,
      unit_id: 1,
      hsn_code: '9506',
      tax_rate_percent: 12.0,
      purchase_cost_paise: 750000,
      selling_price_paise: 1150000,
      mrp_paise: 1299900,
      stock_quantity: 8,
      min_stock_level: 3,
      reorder_level: 5,
      has_variants: 0,
      is_active: 1,
      created_at: '2026-10-25',
      category_name: 'Cricket Bats',
      brand_name: 'SS',
      unit_name: 'Pieces',
      unit_symbol: 'Pcs',
      variants_count: 0,
    },
  ];

  const mockMovements = [
    {
      id: 101,
      product_id: 1,
      product_name: 'SS Ton Master Bat',
      product_sku: 'BAT-SS-01',
      movement_type: 'OPENING_STOCK' as const,
      quantity_change: 8,
      balance_quantity_after: 8,
      notes: 'Initial intake',
      created_at: '2026-10-25 01:00:00',
    },
  ];

  beforeEach(() => {
    (window as any).api = {
      products: {
        getAll: vi.fn().mockResolvedValue({ success: true, data: mockProducts }),
      },
      inventory: {
        getStockMovements: vi.fn().mockResolvedValue({ success: true, data: mockMovements }),
        adjustStock: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 1,
            adjustment_number: 'ADJ-2026-0001',
            product_id: 1,
            product_name: 'SS Ton Master Bat',
            product_sku: 'BAT-SS-01',
            old_quantity: 8,
            new_quantity: 12,
            variance_quantity: 4,
            reason: 'PHYSICAL_AUDIT_MISMATCH',
            created_at: '2026-10-25 01:30:00',
          },
        }),
      },
    };
  });

  it('1. should render summary metrics and reconciliation table', async () => {
    render(<InventoryManagement />);

    await waitFor(() => {
      expect(screen.getByText('Inventory & Stock Audits')).toBeInTheDocument();
      expect(screen.getByText('8 Units')).toBeInTheDocument();
      expect(screen.getByText('SS Ton Master Bat')).toBeInTheDocument();
    });
  });

  it('2. should switch between Reconciliation and Ledger tabs', async () => {
    render(<InventoryManagement />);

    await waitFor(() => {
      expect(screen.getByText(/Stock Reconciliation & Audit/i)).toBeInTheDocument();
    });

    // Click Ledger Tab
    const ledgerTab = screen.getByText(/Immutable Movement Ledger/i);
    fireEvent.click(ledgerTab);

    await waitFor(() => {
      expect(screen.getByText('OPENING_STOCK')).toBeInTheDocument();
      expect(screen.getByText('+8')).toBeInTheDocument();
    });
  });

  it('3. should open stock adjustment modal, compute variance, and submit adjustment', async () => {
    render(<InventoryManagement />);

    await waitFor(() => {
      expect(screen.getByText('Adjust Stock')).toBeInTheDocument();
    });

    // Click "Adjust Stock" button
    const adjustBtn = screen.getByText('Adjust Stock');
    fireEvent.click(adjustBtn);

    expect(screen.getByText(/Adjust Physical Stock: SS Ton Master Bat/i)).toBeInTheDocument();

    // Change physical count from 8 to 12
    const input = screen.getByLabelText(/New Verified Physical Count/i) || screen.getByDisplayValue('8');
    fireEvent.change(input, { target: { value: '12' } });

    // Variance of +4 should be calculated
    expect(screen.getByText('+4')).toBeInTheDocument();

    // Select reason
    const reasonSelect = screen.getByDisplayValue(/Physical Stock Audit Mismatch/i);
    fireEvent.change(reasonSelect, { target: { value: 'FOUND_SURPLUS' } });

    // Submit
    const submitBtn = screen.getByText('Apply Stock Adjustment');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect((window as any).api.inventory.adjustStock).toHaveBeenCalledWith({
        product_id: 1,
        new_quantity: 12,
        reason: 'FOUND_SURPLUS',
        notes: undefined,
      });
    });
  });
});
