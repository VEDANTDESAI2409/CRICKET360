import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Purchases } from '../../src/renderer/features/purchases/Purchases';
import { Purchase, Supplier, ProductWithDetails } from '../../src/shared/types/models';

describe('Combined Milestone 5: Purchases Component & Inwarding Workflows', () => {
  const mockSuppliers: Supplier[] = [
    {
      id: 1,
      name: 'BDM Cricket Gear India',
      company_name: 'BDM Sports Ltd',
      phone: '+91 98370 55555',
      email: 'sales@bdmcricket.com',
      gstin: '09AABCU9876F1Z2',
      address: 'Meerut, UP',
      state_code: '09',
      payment_terms_days: 30,
      balance_paise: 1500000,
      is_active: 1,
    },
  ];

  const mockProducts: ProductWithDetails[] = [
    {
      id: 1,
      name: 'SG English Willow Cricket Bat',
      sku: 'BAT-SG-EW',
      barcode: '8901234567890',
      category_id: 1,
      category_name: 'Bats',
      brand_id: 1,
      brand_name: 'SG',
      unit_id: 1,
      unit_name: 'Pieces',
      unit_symbol: 'PCS',
      hsn_code: '9506',
      tax_rate_percent: 12,
      purchase_cost_paise: 500000, // ₹5,000
      selling_price_paise: 800000,
      mrp_paise: 950000,
      stock_quantity: 10,
      min_stock_level: 2,
      reorder_level: 5,
      is_active: 1,
      has_variants: 0,
      variants_count: 0,
      created_at: '2026-10-25',
      updated_at: '2026-10-25',
    },
  ];

  const mockPurchases: Purchase[] = [
    {
      id: 1,
      purchase_number: 'PUR-1001',
      supplier_id: 1,
      supplier_name_snapshot: 'BDM Cricket Gear India',
      supplier_invoice_number: 'INV-BDM-982',
      purchase_date: '2026-10-20',
      place_of_supply: '09',
      is_inter_state: 1,
      subtotal_paise: 5000000, // ₹50,000
      discount_amount_paise: 0,
      taxable_amount_paise: 5000000,
      cgst_amount_paise: 0,
      sgst_amount_paise: 0,
      igst_amount_paise: 600000, // ₹6,000 (12%)
      total_tax_paise: 600000,
      round_off_paise: 0,
      total_amount_paise: 5600000, // ₹56,000
      paid_amount_paise: 3000000, // ₹30,000
      balance_amount_paise: 2600000, // ₹26,000
      payment_status: 'PARTIALLY_PAID',
      status: 'RECEIVED',
      notes: '10 bats inwarded',
      created_at: '2026-10-20',
      items: [
        {
          id: 1,
          purchase_id: 1,
          product_id: 1,
          product_name_snapshot: 'SG English Willow Cricket Bat',
          sku_snapshot: 'BAT-SG-EW',
          hsn_code_snapshot: '9506',
          unit_snapshot: 'PCS',
          quantity: 10,
          unit_cost_paise: 500000,
          discount_amount_paise: 0,
          taxable_amount_paise: 5000000,
          tax_rate_percent: 12,
          cgst_amount_paise: 0,
          sgst_amount_paise: 0,
          igst_amount_paise: 600000,
          total_amount_paise: 5600000,
          returned_quantity: 0,
          created_at: '2026-10-20',
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      purchases: {
        getAll: vi.fn().mockResolvedValue({ success: true, data: mockPurchases }),
        getById: vi.fn().mockImplementation((id: number) => {
          const p = mockPurchases.find((item) => item.id === id);
          return Promise.resolve({ success: true, data: p || null });
        }),
        create: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 2,
            purchase_number: 'PUR-1002',
            supplier_id: 1,
            supplier_invoice_number: 'INV-NEW-001',
            total_amount_paise: 2800000,
          },
        }),
        createReturn: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 1,
            return_number: 'PR-1001',
            grand_total_paise: 560000,
          },
        }),
      },
      suppliers: {
        getAll: vi.fn().mockResolvedValue({ success: true, data: mockSuppliers }),
      },
      products: {
        getAll: vi.fn().mockResolvedValue({ success: true, data: mockProducts }),
        getVariants: vi.fn().mockResolvedValue({ success: true, data: [] }),
      },
      payments: {
        recordSupplierPayment: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 20,
            payment_number: 'PAY-PUR-01',
            amount_paise: 2600000,
          },
        }),
      },
    };
  });

  it('1. should render purchases directory with KPI cards and table list', async () => {
    render(<Purchases />);

    await waitFor(() => {
      expect(screen.getByText('PUR-1001')).toBeInTheDocument();
      expect(screen.getByText(/INV-BDM-982/)).toBeInTheDocument();
      expect(screen.getByText('BDM Cricket Gear India')).toBeInTheDocument();
    });

    // Verify KPI banner cards
    expect(screen.getByText('Total Purchases (All Time)')).toBeInTheDocument();
    expect(screen.getByText('Outstanding Bill Dues')).toBeInTheDocument();
    expect(screen.getByText('Inter-State Inward')).toBeInTheDocument();

    // Verify bill amounts and status badge
    expect(screen.getByText(/56,000.00/)).toBeInTheDocument();
    expect(screen.getByText(/26,000.00/)).toBeInTheDocument();
    expect(screen.getByText('PARTIALLY_PAID')).toBeInTheDocument();
  });

  it('2. should open Inward Goods modal and submit new purchase bill', async () => {
    render(<Purchases />);

    await screen.findByText('PUR-1001');

    const newBtn = screen.getByText('+ New Purchase Bill');
    fireEvent.click(newBtn);

    await screen.findByText('Inward Goods & Create Purchase Bill');

    // Fill supplier invoice number
    const billInput = screen.getByPlaceholderText('e.g. INV-2026-9901');
    fireEvent.change(billInput, { target: { value: 'INV-NEW-001' } });

    // Add item to cart
    const addLineBtn = screen.getByText('+ Add Item');
    fireEvent.click(addLineBtn);

    // Verify item row in builder cart
    expect(screen.getByText('SG English Willow Cricket Bat')).toBeInTheDocument();

    // Submit purchase
    const submitBtn = screen.getByRole('button', { name: /Confirm Inward & Update Stock/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect((window as any).api.purchases.create).toHaveBeenCalledWith(
        expect.objectContaining({
          supplier_id: 1,
          supplier_invoice_number: 'INV-NEW-001',
          items: expect.arrayContaining([
            expect.objectContaining({
              product_id: 1,
              quantity: 1,
            }),
          ]),
        })
      );
    });
  });

  it('3. should open Purchase Details modal and display items with tax breakdowns', async () => {
    render(<Purchases />);

    await waitFor(() => {
      expect(screen.getByText('PUR-1001')).toBeInTheDocument();
    });

    const viewBtn = screen.getByTitle('View Details');
    fireEvent.click(viewBtn);

    await waitFor(() => {
      expect(screen.getByText('Purchase Details: PUR-1001')).toBeInTheDocument();
    });

    // Check detail modal elements
    expect(screen.getByText('INV-BDM-982')).toBeInTheDocument();
    expect(screen.getByText('SG English Willow Cricket Bat')).toBeInTheDocument();
  });

  it('4. should open Pay Bill modal and allow recording supplier payout', async () => {
    render(<Purchases />);

    await waitFor(() => {
      expect(screen.getByText('PUR-1001')).toBeInTheDocument();
    });

    const payBtn = screen.getByRole('button', { name: 'Pay' });
    fireEvent.click(payBtn);

    await waitFor(() => {
      expect(screen.getByText('Record Payment for PUR-1001')).toBeInTheDocument();
    });

    const confirmPayBtn = screen.getByRole('button', { name: /Confirm Payment/i });
    fireEvent.click(confirmPayBtn);

    await waitFor(() => {
      expect((window as any).api.payments.recordSupplierPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          purchase_id: 1,
          supplier_id: 1,
          amount_paise: 2600000,
        })
      );
    });
  });
});
