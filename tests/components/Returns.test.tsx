import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Returns } from '../../src/renderer/features/returns/Returns';
import { SalesReturn, SalesInvoice } from '../../src/shared/types/models';

describe('Milestone 6: Returns Component & Workflows', () => {
  const mockReturns: SalesReturn[] = [
    {
      id: 1,
      return_number: 'RET-202610-0001',
      invoice_id: 101,
      customer_id: 1,
      customer_name_snapshot: 'Rohit Sharma',
      return_date: '2026-10-25',
      taxable_amount_paise: 1026786,
      cgst_amount_paise: 61607,
      sgst_amount_paise: 61607,
      igst_amount_paise: 0,
      total_tax_paise: 123214,
      round_off_paise: 0,
      grand_total_paise: 1150000,
      refund_mode: 'CASH',
      refund_reference: 'REF-TXN-01',
      reason: 'Wrong size selected',
      notes: 'Customer returned 1 bat in unused condition',
      user_id: 1,
      created_at: '2026-10-25T10:00:00Z',
      items: [
        {
          id: 1,
          sales_return_id: 1,
          sales_invoice_item_id: 201,
          product_id: 1,
          product_name_snapshot: 'SS Master 7000 English Willow Cricket Bat',
          sku_snapshot: 'BAT-ENG-SS-M7000',
          quantity: 1,
          unit_price_paise: 1150000,
          discount_amount_paise: 0,
          taxable_amount_paise: 1026786,
          tax_rate_percent: 12,
          cgst_amount_paise: 61607,
          sgst_amount_paise: 61607,
          igst_amount_paise: 0,
          total_amount_paise: 1150000,
          restock: 1,
          created_at: '2026-10-25T10:00:00Z',
        },
      ],
    },
  ];

  const mockInvoice: SalesInvoice = {
    id: 101,
    invoice_number: 'INV-202610-0001',
    customer_id: 1,
    customer_name_snapshot: 'Rohit Sharma',
    customer_phone_snapshot: '+91 98200 12345',
    invoice_date: '2026-10-24',
    status: 'COMPLETED',
    discount_amount_paise: 0,
    taxable_amount_paise: 2053572,
    cgst_amount_paise: 123214,
    sgst_amount_paise: 123214,
    igst_amount_paise: 0,
    total_tax_paise: 246428,
    round_off_paise: 0,
    grand_total_paise: 2300000,
    paid_amount_paise: 2300000,
    balance_amount_paise: 0,
    payment_status: 'PAID',
    place_of_supply: '27',
    is_inter_state: 0,
    created_at: '2026-10-24T10:00:00Z',
    items: [
      {
        id: 201,
        invoice_id: 101,
        product_id: 1,
        product_name_snapshot: 'SS Master 7000 English Willow Cricket Bat',
        sku_snapshot: 'BAT-ENG-SS-M7000',
        hsn_code_snapshot: '9506',
        unit_snapshot: 'Pcs',
        quantity: 2,
        unit_price_paise: 1150000,
        mrp_paise: 1200000,
        discount_amount_paise: 0,
        taxable_amount_paise: 2053572,
        tax_rate_percent: 12,
        cgst_amount_paise: 123214,
        sgst_amount_paise: 123214,
        igst_amount_paise: 0,
        total_amount_paise: 2300000,
        created_at: '2026-10-24T10:00:00Z',
        returned_quantity: 0,
      } as any,
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      returns: {
        getAll: vi.fn().mockResolvedValue({ success: true, data: mockReturns }),
        getById: vi.fn().mockImplementation((id: number) => {
          const ret = mockReturns.find((r) => r.id === id);
          return Promise.resolve({ success: true, data: ret || null });
        }),
        create: vi.fn().mockImplementation((input) =>
          Promise.resolve({
            success: true,
            data: {
              ...mockReturns[0],
              id: 2,
              return_number: 'RET-202610-0002',
              reason: input.reason,
            },
          })
        ),
      },
      billing: {
        getInvoices: vi.fn().mockResolvedValue({ success: true, data: [mockInvoice] }),
        getByInvoiceNumber: vi.fn().mockResolvedValue({ success: true, data: mockInvoice }),
        getInvoiceById: vi.fn().mockResolvedValue({ success: true, data: mockInvoice }),
      },
    };
  });

  it('1. should render returns directory with KPI statistics and return records', async () => {
    render(<Returns />);

    await waitFor(() => {
      expect(screen.getByText('RET-202610-0001')).toBeInTheDocument();
    });

    expect(screen.getByText('Sales Returns & Refunds')).toBeInTheDocument();
    expect(screen.getByText('Rohit Sharma')).toBeInTheDocument();
    expect(screen.getByText('Wrong size selected')).toBeInTheDocument();
  });

  it('2. should open New Return modal, fetch invoice, and allow refund submission', async () => {
    render(<Returns />);

    await waitFor(() => {
      expect(screen.getByText('RET-202610-0001')).toBeInTheDocument();
    });

    // Click Process New Return
    const newReturnBtn = screen.getByRole('button', { name: /Process New Return/i });
    fireEvent.click(newReturnBtn);

    expect(screen.getByText('Process Sales Return & Refund')).toBeInTheDocument();

    // Type invoice number and click "Search"
    const invInput = screen.getByPlaceholderText('Enter Invoice Number (e.g. INV-1001) or customer name...');
    fireEvent.change(invInput, { target: { value: 'INV-202610-0001' } });

    const lookupBtn = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(lookupBtn);

    await waitFor(() => {
      expect(screen.getByText('INV-202610-0001')).toBeInTheDocument();
    });

    // Click the found invoice to select it
    fireEvent.click(screen.getByText('INV-202610-0001'));

    await waitFor(() => {
      expect(screen.getByText('SS Master 7000 English Willow Cricket Bat')).toBeInTheDocument();
    });

    // Fill in return quantity: find the quantity input
    const qtyInputs = screen.getAllByRole('spinbutton');
    if (qtyInputs.length > 0) {
      fireEvent.change(qtyInputs[0], { target: { value: '1' } });
    }

    // Fill in return notes
    const notesInput = screen.getByPlaceholderText('Auditable internal notes...');
    fireEvent.change(notesInput, { target: { value: 'Customer requested size exchange' } });

    // Submit return
    const submitBtn = screen.getByRole('button', { name: /Confirm Return & Refund/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect((window as any).api.returns.create).toHaveBeenCalled();
    });
  });

  it('3. should open return details modal when view button is clicked', async () => {
    render(<Returns />);

    await waitFor(() => {
      expect(screen.getByText('RET-202610-0001')).toBeInTheDocument();
    });

    const viewBtn = screen.getByRole('button', { name: /View/i });
    fireEvent.click(viewBtn);

    await waitFor(() => {
      expect((window as any).api.returns.getById).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/Sales Return Details/i)).toBeInTheDocument();
    });
  });
});
