import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Dashboard } from '../../src/renderer/features/dashboard/Dashboard';
import { MetricCard } from '../../src/renderer/components/MetricCard';
import { SearchInput } from '../../src/renderer/components/SearchInput';
import { Table, Column } from '../../src/renderer/components/Table';
import { BarChart } from '../../src/renderer/components/BarChart';
import { ProgressDonut } from '../../src/renderer/components/ProgressDonut';

describe('Milestone 2: UI Components & Dashboard Integration', () => {
  it('1. should render MetricCard in featured and standard variants', () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <MetricCard
        title="Total Products"
        value={24}
        badgeText="Active in Catalog"
        variant="featured"
        onClick={handleClick}
      />
    );

    expect(screen.getByText('Total Products')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('Active in Catalog')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Total Products'));
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Standard variant
    rerender(
      <MetricCard
        title="Product Categories"
        value={6}
        badgeText="Active Brands"
        variant="standard"
      />
    );
    expect(screen.getByText('Product Categories')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('2. should render SearchInput with controlled input, shortcut badge, and clear action', () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <SearchInput
        value=""
        onChange={handleChange}
        placeholder="Search items..."
        shortcutBadge="F4"
      />
    );

    const input = screen.getByPlaceholderText('Search items...');
    expect(input).toBeInTheDocument();
    expect(screen.getByText('F4')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'English Willow' } });
    expect(handleChange).toHaveBeenCalledWith('English Willow');

    // Rerender with value present
    rerender(
      <SearchInput
        value="English Willow"
        onChange={handleChange}
        placeholder="Search items..."
        shortcutBadge="F4"
      />
    );

    // Clear button should now be visible and clickable
    const clearBtn = screen.getByTitle('Clear search');
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('3. should render Table with columns, rows, sorting, and empty states', () => {
    interface TestItem {
      id: number;
      name: string;
      stock: number;
    }

    const columns: Column<TestItem>[] = [
      { id: 'name', header: 'Product Name', accessor: 'name', sortable: true },
      { id: 'stock', header: 'Stock Count', accessor: 'stock', sortable: true },
    ];

    const data: TestItem[] = [
      { id: 1, name: 'SG Bat', stock: 5 },
      { id: 2, name: 'SS Bat', stock: 12 },
    ];

    const handleSort = vi.fn();
    const { rerender } = render(
      <Table
        data={data}
        columns={columns}
        keyExtractor={(item) => item.id}
        onSort={handleSort}
      />
    );

    expect(screen.getByText('SG Bat')).toBeInTheDocument();
    expect(screen.getByText('SS Bat')).toBeInTheDocument();

    // Click sortable header
    const sortBtn = screen.getByText('Product Name');
    fireEvent.click(sortBtn);
    expect(handleSort).toHaveBeenCalledWith('name');

    // Empty state
    rerender(
      <Table
        data={[]}
        columns={columns}
        keyExtractor={(item) => item.id}
        emptyTitle="No Items Available"
        emptySubtitle="Catalog is empty"
      />
    );
    expect(screen.getByText('No Items Available')).toBeInTheDocument();
    expect(screen.getByText('Catalog is empty')).toBeInTheDocument();
  });

  it('4. should render BarChart and ProgressDonut with proportionate data', () => {
    const weeklyData = [
      { dayName: 'Sun', date: '2026-10-19', salesAmountPaise: 0, invoiceCount: 0 },
      { dayName: 'Mon', date: '2026-10-20', salesAmountPaise: 50000, invoiceCount: 1 },
      { dayName: 'Tue', date: '2026-10-21', salesAmountPaise: 0, invoiceCount: 0 },
      { dayName: 'Wed', date: '2026-10-22', salesAmountPaise: 0, invoiceCount: 0 },
      { dayName: 'Thu', date: '2026-10-23', salesAmountPaise: 0, invoiceCount: 0 },
      { dayName: 'Fri', date: '2026-10-24', salesAmountPaise: 0, invoiceCount: 0 },
      { dayName: 'Sat', date: '2026-10-25', salesAmountPaise: 120000, invoiceCount: 2 },
    ];

    render(
      <div>
        <BarChart data={weeklyData} title="Weekly Performance" />
        <ProgressDonut inStockCount={10} lowStockCount={3} outOfStockCount={1} />
      </div>
    );

    expect(screen.getByText('Weekly Performance')).toBeInTheDocument();
    expect(screen.getByText('Stock Health & Availability')).toBeInTheDocument();
    expect(screen.getByText('In Stock (10)')).toBeInTheDocument();
    expect(screen.getByText('Low (3)')).toBeInTheDocument();
    expect(screen.getByText('Out (1)')).toBeInTheDocument();
  });

  it('5. should render full Dashboard with real metrics and handle search filtering and actions', async () => {
    const handleNavigate = vi.fn();

    // Mock window.api.dashboard
    (window as any).api = {
      dashboard: {
        getMetrics: vi.fn().mockResolvedValue({
          success: true,
          data: {
            totalActiveProducts: 14,
            totalCategories: 6,
            totalBrands: 8,
            totalStockQuantity: 140,
            totalStockValuationPaise: 35000000,
            todaySalesPaise: 450000,
            todayPurchasesPaise: 0,
            outOfStockCount: 1,
            lowStockCount: 2,
            inStockCount: 11,
          },
        }),
        getLowStockAlerts: vi.fn().mockResolvedValue({
          success: true,
          data: [
            {
              id: 1,
              name: 'SG Club Ball',
              sku: 'BALL-SG-01',
              categoryName: 'Balls',
              brandName: 'SG',
              stockQuantity: 2,
              minStockLevel: 5,
              reorderLevel: 10,
              mrpPaise: 28000,
              sellingPricePaise: 24000,
              status: 'LOW_STOCK',
            },
          ],
        }),
        getRecentTransactions: vi.fn().mockResolvedValue({
          success: true,
          data: [],
        }),
        getWeeklySalesSummary: vi.fn().mockResolvedValue({
          success: true,
          data: [
            { dayName: 'Sat', date: '2026-10-25', salesAmountPaise: 450000, invoiceCount: 1 },
          ],
        }),
      },
    };

    render(<Dashboard onNavigateToModule={handleNavigate} />);

    // Wait for metrics to load
    await waitFor(() => {
      expect(screen.getByText('14')).toBeInTheDocument();
      expect(screen.getByText('6 Cats')).toBeInTheDocument();
      expect(screen.getByText('140 Units')).toBeInTheDocument();
    });

    // Verify low stock item is in table
    expect(screen.getByText('SG Club Ball')).toBeInTheDocument();
    expect(screen.getByText('BALL-SG-01')).toBeInTheDocument();

    // Test filter search inside low stock table
    const filterInput = screen.getByPlaceholderText('Filter alert items...');
    fireEvent.change(filterInput, { target: { value: 'Non-existent item' } });

    // Table empty state should appear
    expect(screen.getByText('Inventory Fully Stocked')).toBeInTheDocument();

    // Clear filter
    fireEvent.change(filterInput, { target: { value: '' } });
    expect(screen.getByText('SG Club Ball')).toBeInTheDocument();

    // Click "+ New Bill (F2)" button
    const newBillBtn = screen.getByText('+ New Bill (F2)');
    fireEvent.click(newBillBtn);
    expect(handleNavigate).toHaveBeenCalledWith('billing');
  });
});
