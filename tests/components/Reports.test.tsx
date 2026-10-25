import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Reports } from '../../src/renderer/features/reports/Reports';
import {
  SalesReportSummary,
  ProfitLossReport,
  InventoryValuationReport,
  TaxSummaryReport,
  PaymentRegisterSummary,
} from '../../src/shared/types/models';

describe('Milestone 6: Reports & Business Analytics Component', () => {
  const mockSalesReport: SalesReportSummary = {
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    totalInvoicesCount: 15,
    grossSalesPaise: 45000000,
    totalDiscountsPaise: 1500000,
    returnsAmountPaise: 2000000,
    netSalesPaise: 41500000,
    taxableAmountPaise: 37053571,
    cgstPaise: 2223214,
    sgstPaise: 2223214,
    igstPaise: 0,
    totalTaxPaise: 4446429,
    roundOffPaise: 0,
    paymentBreakdown: {
      CASH: 10000000,
      UPI: 25000000,
      CARD: 6500000,
    },
    dailyTrend: [
      { date: '2026-10-24', invoiceCount: 8, netSalesPaise: 22000000 },
      { date: '2026-10-25', invoiceCount: 7, netSalesPaise: 19500000 },
    ],
  };

  const mockPnlReport: ProfitLossReport = {
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    costingMethod: 'WEIGHTED_LANDED_COST',
    grossRevenuePaise: 45000000,
    discountsPaise: 1500000,
    returnsPaise: 2000000,
    netRevenuePaise: 41500000,
    cogsPaise: 27000000,
    grossProfitPaise: 14500000,
    grossMarginPercent: 34.94,
    operatingExpensesPaise: 4500000,
    netOperatingProfitPaise: 10000000,
    netMarginPercent: 24.1,
    expensesByCategory: [
      { categoryName: 'Store Rent & Lease', amountPaise: 3500000 },
      { categoryName: 'Electricity & Utilities', amountPaise: 1000000 },
    ],
  };

  const mockValuationReport: InventoryValuationReport = {
    totalStockUnits: 342,
    totalCostValuationPaise: 35000000,
    totalRetailValuationPaise: 54000000,
    potentialGrossProfitPaise: 19000000,
    categoryBreakdown: [
      {
        categoryName: 'English Willow Bats',
        units: 45,
        costValuationPaise: 18000000,
        retailValuationPaise: 28000000,
      },
      {
        categoryName: 'Batting Pads',
        units: 60,
        costValuationPaise: 8000000,
        retailValuationPaise: 12500000,
      },
    ],
    lowStockCount: 2,
    outOfStockCount: 0,
  };

  const mockGstReport: TaxSummaryReport = {
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    b2bSales: [],
    b2cIntraStateTaxablePaise: 30000000,
    b2cIntraStateTaxPaise: 3600000,
    b2cInterStateTaxablePaise: 7053571,
    b2cInterStateTaxPaise: 846429,
    hsnSummary: [
      {
        hsnCode: '9506',
        description: 'Sports goods',
        taxRatePercent: 12,
        totalQuantity: 34,
        taxableAmountPaise: 37053571,
        cgstPaise: 1800000,
        sgstPaise: 1800000,
        igstPaise: 846429,
        totalTaxPaise: 4446429,
      },
    ],
    totalOutputTaxPaise: 4446429,
    totalInputTaxPaise: 2500000,
  };

  const mockPaymentReport: PaymentRegisterSummary = {
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    totalInflowsPaise: 45000000,
    totalOutflowsPaise: 20000000,
    netCashFlowPaise: 25000000,
    inflowsByMode: { CASH: 10000000, UPI: 25000000, CARD: 10000000 },
    outflowsByMode: { BANK_TRANSFER: 15000000, UPI: 5000000 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      reports: {
        getSalesReport: vi.fn().mockResolvedValue({ success: true, data: mockSalesReport }),
        getProfitLossReport: vi.fn().mockResolvedValue({ success: true, data: mockPnlReport }),
        getInventoryValuationReport: vi.fn().mockResolvedValue({ success: true, data: mockValuationReport }),
        getTaxReport: vi.fn().mockResolvedValue({ success: true, data: mockGstReport }),
        getPaymentsSummaryReport: vi.fn().mockResolvedValue({ success: true, data: mockPaymentReport }),
        exportCsv: vi.fn().mockResolvedValue({
          success: true,
          data: { filename: 'test_report.csv', csvContent: 'Report Header\nMetric,100' },
        }),
      },
    };
  });

  it('1. should render Sales Report by default and display sales KPI figures', async () => {
    render(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('Reports & Business Intelligence')).toBeInTheDocument();
      expect(screen.getByText('₹415000.00')).toBeInTheDocument(); // Net Sales
    });

    expect(screen.getByText('15 invoices billed')).toBeInTheDocument();
    expect(screen.getByText('Gross Sales')).toBeInTheDocument();
    expect(screen.getByText('Discounts & Returns')).toBeInTheDocument();
  });

  it('2. should switch tabs to Profit & Loss and render Gross and Net margins', async () => {
    render(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('Reports & Business Intelligence')).toBeInTheDocument();
    });

    const pnlTab = screen.getByText('Profit & Loss');
    fireEvent.click(pnlTab);

    await waitFor(() => {
      expect(screen.getByText('34.94% Gross Margin')).toBeInTheDocument(); // Gross margin
      expect(screen.getByText('24.1% Net Operating Margin')).toBeInTheDocument(); // Net margin
    });

    expect(screen.getByText(/WEIGHTED_LANDED_COST/)).toBeInTheDocument();
    expect(screen.getByText('Store Rent & Lease')).toBeInTheDocument();
  });

  it('3. should switch tabs to Inventory Valuation and display stock metrics', async () => {
    render(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('Reports & Business Intelligence')).toBeInTheDocument();
    });

    const valTab = screen.getByText('Stock Valuation');
    fireEvent.click(valTab);

    await waitFor(() => {
      expect(screen.getByText('342')).toBeInTheDocument(); // Total Stock Units
      expect(screen.getByText('English Willow Bats')).toBeInTheDocument();
    });
  });

  it('4. should trigger CSV export when Export CSV button is clicked', async () => {
    render(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });

    const exportBtn = screen.getByText('Export CSV');
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect((window as any).api.reports.exportCsv).toHaveBeenCalledWith(
        'sales',
        expect.objectContaining({ start_date: expect.any(String), end_date: expect.any(String) })
      );
    });
  });
});
