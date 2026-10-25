import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Expenses } from '../../src/renderer/features/expenses/Expenses';
import { Expense, ExpenseCategory } from '../../src/shared/types/models';

describe('Milestone 6: Expenses Component & Workflows', () => {
  const mockCategories: ExpenseCategory[] = [
    { id: 1, name: 'Store Rent & Lease', code: 'RENT', description: 'Monthly shop premises lease', is_active: 1, created_at: '2026-10-01' },
    { id: 2, name: 'Staff Salaries & Wages', code: 'SALARY', description: 'Coaching and store assistants', is_active: 1, created_at: '2026-10-01' },
    { id: 3, name: 'Electricity & Utilities', code: 'POWER', description: 'Power and water bills', is_active: 1, created_at: '2026-10-01' },
  ];

  const mockExpenses: Expense[] = [
    {
      id: 1,
      expense_number: 'EXP-202610-0001',
      category_id: 1,
      category_name: 'Store Rent & Lease',
      expense_date: '2026-10-01',
      amount_paise: 3500000, // ₹35,000
      payment_mode: 'BANK_TRANSFER',
      payment_status: 'PAID',
      payee_name: 'Commercial Realty Ltd',
      reference_number: 'NEFT-OCT-RENT-01',
      notes: 'October 2026 store lease',
      user_id: 1,
      created_at: '2026-10-01T09:00:00Z',
      updated_at: '2026-10-01T09:00:00Z',
    },
    {
      id: 2,
      expense_number: 'EXP-202610-0002',
      category_id: 3,
      category_name: 'Electricity & Utilities',
      expense_date: '2026-10-15',
      amount_paise: 450000, // ₹4,500
      payment_mode: 'UPI',
      payment_status: 'PAID',
      payee_name: 'Torrent Power',
      reference_number: 'UPI-PWR-9988',
      notes: 'AC electricity bill',
      user_id: 1,
      created_at: '2026-10-15T10:00:00Z',
      updated_at: '2026-10-15T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      expenses: {
        getAll: vi.fn().mockResolvedValue({ success: true, data: mockExpenses }),
        getCategories: vi.fn().mockResolvedValue({ success: true, data: mockCategories }),
        createCategory: vi.fn().mockImplementation((input) =>
          Promise.resolve({
            success: true,
            data: { id: 4, ...input, is_active: 1 },
          })
        ),
        create: vi.fn().mockImplementation((input) =>
          Promise.resolve({
            success: true,
            data: {
              ...mockExpenses[0],
              id: 3,
              expense_number: 'EXP-202610-0003',
              ...input,
            },
          })
        ),
        update: vi.fn().mockImplementation((input) =>
          Promise.resolve({
            success: true,
            data: { ...mockExpenses[0], ...input },
          })
        ),
        delete: vi.fn().mockResolvedValue({ success: true }),
      },
      suppliers: {
        getAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
      },
    };
  });

  it('1. should render expenses directory with KPI totals and expense rows', async () => {
    render(<Expenses />);

    await waitFor(() => {
      expect(screen.getByText('EXP-202610-0001')).toBeInTheDocument();
      expect(screen.getByText('EXP-202610-0002')).toBeInTheDocument();
    });

    expect(screen.getByText('Operating Expenses')).toBeInTheDocument();
    expect(screen.getByText('Commercial Realty Ltd')).toBeInTheDocument();
    expect(screen.getByText('Torrent Power')).toBeInTheDocument();
  });

  it('2. should open Add Expense modal and record new operating expense', async () => {
    render(<Expenses />);

    await waitFor(() => {
      expect(screen.getByText('EXP-202610-0001')).toBeInTheDocument();
    });

    // Click "Record Expense"
    const addBtn = screen.getByRole('button', { name: /Record Expense/i });
    fireEvent.click(addBtn);

    expect(screen.getByText('Record Operating Expense')).toBeInTheDocument();

    // Fill amount ₹2,000
    const amountInput = screen.getByPlaceholderText('e.g. 15000.00');
    fireEvent.change(amountInput, { target: { value: '2000' } });

    // Fill payee
    const payeeInput = screen.getByPlaceholderText('e.g. Landlord, Electricity Board, Courier');
    fireEvent.change(payeeInput, { target: { value: 'Bluedart Courier Logistics' } });

    // Submit
    const saveBtn = screen.getByRole('button', { name: /Save Expense/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect((window as any).api.expenses.create).toHaveBeenCalled();
    });
  });

  it('3. should open Category Management modal and allow adding category', async () => {
    render(<Expenses />);

    await waitFor(() => {
      expect(screen.getByText('EXP-202610-0001')).toBeInTheDocument();
    });

    const catBtn = screen.getByRole('button', { name: /Add Category/i });
    fireEvent.click(catBtn);

    expect(screen.getByText('Create Expense Category')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('e.g. Internet & Broadband');
    fireEvent.change(nameInput, { target: { value: 'Digital Marketing & Ads' } });

    const codeInput = screen.getByPlaceholderText('e.g. INTERNET');
    fireEvent.change(codeInput, { target: { value: 'MKTG' } });

    const addCatBtn = screen.getByRole('button', { name: /Create Category/i });
    fireEvent.click(addCatBtn);

    await waitFor(() => {
      expect((window as any).api.expenses.createCategory).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Digital Marketing & Ads', code: 'MKTG' })
      );
    });
  });
});
