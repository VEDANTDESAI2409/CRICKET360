import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Customers } from '../../src/renderer/features/customers/Customers';
import { Customer, CustomerStatement } from '../../src/shared/types/models';

describe('Combined Milestone 5: Customers Component & Khata Workflows', () => {
  const mockCustomers: Customer[] = [
    {
      id: 1,
      name: 'Walk-in Customer',
      phone: '0000000000',
      state_code: '27',
      credit_limit_paise: 0,
      balance_paise: 0,
      is_active: 1,
    },
    {
      id: 2,
      name: 'Shivaji Park Cricket Club',
      phone: '+91 98220 12345',
      email: 'contact@shivajiparkcc.org',
      gstin: '27AAAAA0000A1Z5',
      address: 'Dadar West, Mumbai',
      state_code: '27',
      credit_limit_paise: 5000000,
      balance_paise: 1500000, // ₹15,000
      is_active: 1,
    },
  ];

  const mockStatement: CustomerStatement = {
    customer: mockCustomers[1],
    totalSalesPaise: 3000000,
    totalPaidPaise: 1500000,
    outstandingBalancePaise: 1500000,
    invoices: [],
    payments: [],
    entries: [
      {
        id: 'LED-C1',
        date: '2026-10-25',
        type: 'INVOICE',
        reference_number: 'CR360-1001',
        description: 'Sales Invoice #CR360-1001',
        debit_paise: 3000000,
        credit_paise: 0,
        running_balance_paise: 3000000,
      },
      {
        id: 'LED-C2',
        date: '2026-10-26',
        type: 'PAYMENT',
        reference_number: 'PAY-C10',
        description: 'Payment (UPI)',
        debit_paise: 0,
        credit_paise: 1500000,
        running_balance_paise: 1500000,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      customers: {
        search: vi.fn().mockResolvedValue({ success: true, data: mockCustomers }),
        getById: vi.fn().mockImplementation((id: number) => {
          const cust = mockCustomers.find((c) => c.id === id);
          return Promise.resolve({ success: true, data: cust || null });
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
            data: { ...mockCustomers[1], ...input },
          })
        ),
        getLedger: vi.fn().mockResolvedValue({ success: true, data: mockStatement }),
      },
      payments: {
        recordCustomerPayment: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 20,
            payment_number: 'PAY-CUST-100',
            amount_paise: 1500000,
            payment_type: 'CUSTOMER_RECEIPT',
          },
        }),
      },
    };
  });

  it('1. should render customer directory and display Khata balance', async () => {
    render(<Customers />);

    await waitFor(() => {
      expect(screen.getByText('Shivaji Park Cricket Club')).toBeInTheDocument();
      expect(screen.getByText('Walk-in Customer')).toBeInTheDocument();
    });

    expect(screen.getByText('Registered Customers')).toBeInTheDocument();
    expect(screen.getByText('Total Accounts Receivable')).toBeInTheDocument();

    // Check balance display
    expect(screen.getAllByText(/15,000.00/)[0]).toBeInTheDocument();
  });

  it('2. should open Register Customer modal and submit details', async () => {
    render(<Customers />);

    const addBtn = screen.getByText('Add Customer');
    fireEvent.click(addBtn);

    expect(screen.getByText('Register New Customer')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('e.g. Shivaji Park Cricket Club');
    fireEvent.change(nameInput, { target: { value: 'Wankhede Youth Academy' } });

    const submitBtn = screen.getByRole('button', { name: 'Register Customer' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect((window as any).api.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Wankhede Youth Academy',
        })
      );
    });
  });

  it('3. should open Customer Khata statement modal and show invoice vs payment entries', async () => {
    render(<Customers />);

    await waitFor(() => {
      expect(screen.getByText('Shivaji Park Cricket Club')).toBeInTheDocument();
    });

    const khataBtns = screen.getAllByRole('button', { name: /Khata/i });
    fireEvent.click(khataBtns[1]); // Click for Shivaji Park CC

    await waitFor(() => {
      expect(screen.getByText('Customer Khata Ledger: Shivaji Park Cricket Club')).toBeInTheDocument();
    });

    expect(screen.getByText('CR360-1001')).toBeInTheDocument();
    expect(screen.getByText('PAY-C10')).toBeInTheDocument();
    expect(screen.getByText('Sales Invoice #CR360-1001')).toBeInTheDocument();
  });
});
