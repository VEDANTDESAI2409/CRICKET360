import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Suppliers } from '../../src/renderer/features/suppliers/Suppliers';
import { Supplier, SupplierStatement } from '../../src/shared/types/models';

describe('Combined Milestone 5: Suppliers Component & Ledger Workflows', () => {
  const mockSuppliers: Supplier[] = [
    {
      id: 1,
      name: 'Meerut Sports Crafts LLP',
      company_name: 'Meerut Crafts',
      phone: '+91 98370 12345',
      email: 'sales@meerutcrafts.com',
      gstin: '09AABCM1234F1Z1',
      address: 'Partapur Industrial Estate, Meerut, UP',
      state_code: '09',
      payment_terms_days: 30,
      balance_paise: 2500000, // ₹25,000
      is_active: 1,
    },
    {
      id: 2,
      name: 'Jalandhar Protective Gear Co',
      company_name: 'Jalandhar Sports Mfg Pvt Ltd',
      phone: '+91 98140 54321',
      email: 'contact@jalandhargear.in',
      gstin: '03AAACJ9876E1Z5',
      address: 'Basti Nau, Jalandhar, Punjab',
      state_code: '03',
      payment_terms_days: 45,
      balance_paise: 0,
      is_active: 1,
    },
  ];

  const mockStatement: SupplierStatement = {
    supplier: mockSuppliers[0],
    totalPurchasesPaise: 5000000,
    totalPaidPaise: 2500000,
    totalReturnsPaise: 0,
    outstandingBalancePaise: 2500000,
    purchases: [],
    payments: [],
    returns: [],
    entries: [
      {
        id: 'LED-1',
        date: '2026-10-25',
        type: 'PURCHASE',
        reference_number: 'PUR-1001',
        description: 'Purchase Bill #INV-001',
        debit_paise: 0,
        credit_paise: 5000000,
        running_balance_paise: 5000000,
      },
      {
        id: 'LED-2',
        date: '2026-10-26',
        type: 'PAYMENT',
        reference_number: 'PAY-001',
        description: 'Payment (BANK_TRANSFER)',
        debit_paise: 2500000,
        credit_paise: 0,
        running_balance_paise: 2500000,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      suppliers: {
        getAll: vi.fn().mockResolvedValue({ success: true, data: mockSuppliers }),
        getById: vi.fn().mockImplementation((id: number) => {
          const sup = mockSuppliers.find((s) => s.id === id);
          return Promise.resolve({ success: true, data: sup || null });
        }),
        create: vi.fn().mockImplementation((input) =>
          Promise.resolve({
            success: true,
            data: { id: 3, ...input, balance_paise: 0, is_active: 1 },
          })
        ),
        update: vi.fn().mockImplementation((input) =>
          Promise.resolve({
            success: true,
            data: { ...mockSuppliers[0], ...input },
          })
        ),
        getLedger: vi.fn().mockResolvedValue({ success: true, data: mockStatement }),
      },
      payments: {
        recordSupplierPayment: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 10,
            payment_number: 'PAY-100',
            amount_paise: 2500000,
            payment_type: 'SUPPLIER_PAYOUT',
          },
        }),
      },
    };
  });

  it('1. should render supplier directory with KPI cards and table list', async () => {
    render(<Suppliers />);

    await waitFor(() => {
      expect(screen.getByText('Meerut Sports Crafts LLP')).toBeInTheDocument();
      expect(screen.getByText('Jalandhar Protective Gear Co')).toBeInTheDocument();
    });

    // Check KPI cards
    expect(screen.getByText('Total Suppliers')).toBeInTheDocument();
    expect(screen.getByText('Total Accounts Payable')).toBeInTheDocument();

    // Check payable balance badge
    expect(screen.getAllByText(/25,000.00/)[0]).toBeInTheDocument();
    expect(screen.getByText('Nil / Settled')).toBeInTheDocument();
  });

  it('2. should open Add Supplier modal and submit new vendor details', async () => {
    render(<Suppliers />);

    const addBtn = screen.getByText('Add Supplier');
    fireEvent.click(addBtn);

    expect(screen.getByText('Add New Supplier')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('e.g. Meerut Sports Crafts LLP');
    fireEvent.change(nameInput, { target: { value: 'DSC Cricket Gear Mfg' } });

    const submitBtn = screen.getByRole('button', { name: 'Create Supplier' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect((window as any).api.suppliers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'DSC Cricket Gear Mfg',
        })
      );
    });
  });

  it('3. should open Vendor Ledger statement modal and display chronological transactions', async () => {
    render(<Suppliers />);

    await waitFor(() => {
      expect(screen.getByText('Meerut Sports Crafts LLP')).toBeInTheDocument();
    });

    const khataBtns = screen.getAllByRole('button', { name: /Khata/i });
    fireEvent.click(khataBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Vendor Ledger / Khata: Meerut Sports Crafts LLP')).toBeInTheDocument();
    });

    // Verify transactions in statement table
    expect(screen.getByText('PUR-1001')).toBeInTheDocument();
    expect(screen.getByText('PAY-001')).toBeInTheDocument();
    expect(screen.getByText('Purchase Bill #INV-001')).toBeInTheDocument();
  });
});
