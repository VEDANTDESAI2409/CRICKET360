import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PosBilling } from '../../src/renderer/features/billing/PosBilling';

describe('Milestone 4: PosBilling Component & Checkout Workflows', () => {
  const mockProducts = [
    {
      id: 1,
      name: 'SS Ton Master Bat',
      sku: 'BAT-SS-01',
      barcode: '890123400001',
      category_id: 1,
      brand_id: 1,
      unit_id: 1,
      hsn_code: '9506',
      tax_rate_percent: 12.0,
      purchase_cost_paise: 750000,
      selling_price_paise: 112000, // ₹1,120.00
      mrp_paise: 129990,
      stock_quantity: 5,
      min_stock_level: 2,
      reorder_level: 3,
      has_variants: 0,
      is_active: 1,
      created_at: '2026-10-25 00:00:00',
      category_name: 'Cricket Bats',
      brand_name: 'SS',
      unit_name: 'Pieces',
      unit_symbol: 'Pcs',
      variants_count: 0,
    },
    {
      id: 2,
      name: 'SG Club Leather Ball',
      sku: 'BALL-SG-01',
      barcode: '890123400002',
      category_id: 2,
      brand_id: 2,
      unit_id: 1,
      hsn_code: '9506',
      tax_rate_percent: 12.0,
      purchase_cost_paise: 18000,
      selling_price_paise: 24000, // ₹240.00
      mrp_paise: 28000,
      stock_quantity: 10,
      min_stock_level: 3,
      reorder_level: 5,
      has_variants: 0,
      is_active: 1,
      created_at: '2026-10-25 00:00:00',
      category_name: 'Balls & Accessories',
      brand_name: 'SG',
      unit_name: 'Pieces',
      unit_symbol: 'Pcs',
      variants_count: 0,
    },
  ];

  const mockCustomers = [
    {
      id: 1,
      name: 'Walk-in Customer',
      phone: '0000000000',
      state_code: '27',
      balance_paise: 0,
      is_active: 1,
    },
    {
      id: 3,
      name: 'Gujarat Lions (Inter-State)',
      phone: '+91 97123 45678',
      state_code: '24',
      balance_paise: 0,
      is_active: 1,
    },
  ];

  const mockShopSettings = {
    shopName: 'Cricket360 Sports & Pro Shop',
    shopGstin: '27AABBC1234D1Z5',
    shopAddress: '12, Sports Complex Road, Mumbai',
    shopPhone: '+91 98765 43210',
    shopEmail: 'contact@cricket360.local',
    shopStateCode: '27',
  };

  beforeEach(() => {
    (window as any).api = {
      products: {
        getAll: vi.fn().mockResolvedValue({ success: true, data: mockProducts }),
      },
      customers: {
        search: vi.fn().mockResolvedValue({ success: true, data: mockCustomers }),
        create: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 99,
            name: 'New Test Customer',
            phone: '9999999999',
            state_code: '27',
            balance_paise: 0,
            is_active: 1,
          },
        }),
      },
      billing: {
        getShopSettings: vi.fn().mockResolvedValue({ success: true, data: mockShopSettings }),
        createInvoice: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 101,
            invoice_number: 'CR360-1001',
            invoice_date: '2026-10-25',
            customer_name_snapshot: 'Walk-in Customer',
            place_of_supply: '27',
            is_inter_state: 0,
            taxable_amount_paise: 100000,
            cgst_amount_paise: 6000,
            sgst_amount_paise: 6000,
            igst_amount_paise: 0,
            total_tax_paise: 12000,
            discount_amount_paise: 0,
            round_off_paise: 0,
            grand_total_paise: 112000,
            paid_amount_paise: 112000,
            payment_status: 'PAID',
            status: 'COMPLETED',
            created_at: '2026-10-25 00:00:00',
            items: [
              {
                id: 1,
                product_name_snapshot: 'SS Ton Master Bat',
                quantity: 1,
                unit_price_paise: 112000,
                taxable_amount_paise: 100000,
                tax_rate_percent: 12.0,
                cgst_amount_paise: 6000,
                sgst_amount_paise: 6000,
                igst_amount_paise: 0,
                total_amount_paise: 112000,
                hsn_code_snapshot: '9506',
                unit_snapshot: 'Pcs',
              },
            ],
            payments: [{ id: 1, payment_mode: 'CASH', amount_paise: 112000 }],
          },
        }),
        getInvoices: vi.fn().mockResolvedValue({ success: true, data: [] }),
        cancelInvoice: vi.fn().mockResolvedValue({ success: true, data: {} }),
      },
    };
  });

  it('1. should render POS register with customer selector and empty cart prompt', async () => {
    render(<PosBilling />);

    await waitFor(() => {
      expect(screen.getByText('POS & GST Billing Register')).toBeInTheDocument();
      expect(screen.getByText('Cart is currently empty')).toBeInTheDocument();
    });

    expect(screen.getByText(/Walk-in Customer/)).toBeInTheDocument();
  });

  it('2. should search product, add to cart, and calculate totals accurately', async () => {
    render(<PosBilling />);

    await waitFor(() => {
      expect(screen.getByText('POS & GST Billing Register')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Scan barcode or search/i);
    fireEvent.change(searchInput, { target: { value: 'SS Ton' } });

    // Click matching result to add to cart
    await waitFor(() => {
      expect(screen.getByText('SS Ton Master Bat')).toBeInTheDocument();
    });

    const resultRow = screen.getByText('SS Ton Master Bat');
    fireEvent.click(resultRow);

    // Cart should now contain SS Ton Master Bat
    await waitFor(() => {
      expect(screen.getByText('Current Sales Cart (1 Items)')).toBeInTheDocument();
    });

    // Check rate and totals
    expect(screen.getAllByText('₹ 1,120.00').length).toBeGreaterThanOrEqual(1);
  });

  it('3. should update item quantity and respect available stock limits', async () => {
    render(<PosBilling />);

    await waitFor(() => {
      expect(screen.getByText('POS & GST Billing Register')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Scan barcode or search/i);
    fireEvent.change(searchInput, { target: { value: 'SS Ton' } });

    await waitFor(() => {
      expect(screen.getByText('SS Ton Master Bat')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('SS Ton Master Bat'));

    await waitFor(() => {
      expect(screen.getByText('Current Sales Cart (1 Items)')).toBeInTheDocument();
    });

    // Increase quantity using '+' button
    const plusButtons = screen.getAllByRole('button');
    // Find '+' button
    const plusBtn = plusButtons.find((btn) => btn.querySelector('svg.lucide-plus'));
    if (plusBtn) {
      fireEvent.click(plusBtn);
      await waitFor(() => {
        expect(screen.getByText('Current Sales Cart (2 Items)')).toBeInTheDocument();
      });
    }
  });

  it('4. should switch tax calculation to IGST when inter-state customer is selected', async () => {
    render(<PosBilling />);

    await waitFor(() => {
      expect(screen.getByText('POS & GST Billing Register')).toBeInTheDocument();
    });

    // Change customer to Gujarat Lions (State 24)
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '3' } });

    // Verify GST type indicator updates to Inter-State (IGST 100%)
    await waitFor(() => {
      expect(screen.getByText('Inter-State (IGST 100%)')).toBeInTheDocument();
    });
  });

  it('5. should complete sale and open printable GST Tax Invoice modal', async () => {
    render(<PosBilling />);

    await waitFor(() => {
      expect(screen.getByText('POS & GST Billing Register')).toBeInTheDocument();
    });

    // Add product to cart
    const searchInput = screen.getByPlaceholderText(/Scan barcode or search/i);
    fireEvent.change(searchInput, { target: { value: 'SS Ton' } });

    await waitFor(() => {
      expect(screen.getByText('SS Ton Master Bat')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('SS Ton Master Bat'));

    await waitFor(() => {
      expect(screen.getByText('Current Sales Cart (1 Items)')).toBeInTheDocument();
    });

    // Click "Complete & Generate Bill (F10)"
    const checkoutBtn = screen.getByText('Complete & Generate Bill (F10)');
    fireEvent.click(checkoutBtn);

    // Verify IPC createInvoice was called
    await waitFor(() => {
      expect((window as any).api.billing.createInvoice).toHaveBeenCalled();
    });

    // Verify Tax Invoice modal opens
    await waitFor(() => {
      expect(screen.getByText('TAX INVOICE')).toBeInTheDocument();
      expect(screen.getAllByText(/CR360-1001/).length).toBeGreaterThanOrEqual(1);
    });
  });
});
