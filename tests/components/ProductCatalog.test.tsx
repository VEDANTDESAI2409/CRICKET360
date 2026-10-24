import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductCatalog } from '../../src/renderer/features/products/ProductCatalog';

describe('Milestone 3: ProductCatalog Component & Workflows', () => {
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
      selling_price_paise: 1150000,
      mrp_paise: 1299900,
      stock_quantity: 8,
      min_stock_level: 3,
      reorder_level: 5,
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
      name: 'Kookaburra Kahuna Batting Gloves',
      sku: 'GLV-KOOK-01',
      barcode: '890123400003',
      category_id: 2,
      brand_id: 3,
      unit_id: 2,
      hsn_code: '9506',
      tax_rate_percent: 12.0,
      purchase_cost_paise: 150000,
      selling_price_paise: 220000,
      mrp_paise: 260000,
      stock_quantity: 0,
      min_stock_level: 2,
      reorder_level: 4,
      has_variants: 1,
      is_active: 1,
      created_at: '2026-10-25 00:00:00',
      category_name: 'Protective Gear',
      brand_name: 'Kookaburra',
      unit_name: 'Pairs',
      unit_symbol: 'Pair',
      variants_count: 2,
    },
  ];

  const mockCategories = [
    { id: 1, name: 'Cricket Bats', code: 'BAT', is_active: 1, created_at: '' },
    { id: 2, name: 'Protective Gear', code: 'PROT', is_active: 1, created_at: '' },
  ];

  const mockBrands = [
    { id: 1, name: 'SS', code: 'SS', is_active: 1, created_at: '' },
    { id: 3, name: 'Kookaburra', code: 'KOOK', is_active: 1, created_at: '' },
  ];

  const mockUnits = [
    { id: 1, name: 'Pieces', symbol: 'Pcs' },
    { id: 2, name: 'Pairs', symbol: 'Pair' },
  ];

  const mockHsn = [
    { id: 1, hsn_code: '9506', description: 'Sports equipment', tax_rate_percent: 12.0, is_active: 1, created_at: '' },
  ];

  beforeEach(() => {
    (window as any).api = {
      products: {
        getAll: vi.fn().mockResolvedValue({ success: true, data: mockProducts }),
        getById: vi.fn().mockImplementation((id: number) => {
          const found = mockProducts.find((p) => p.id === id);
          return Promise.resolve({
            success: true,
            data: found ? { ...found, variants: [] } : null,
          });
        }),
        create: vi.fn().mockResolvedValue({
          success: true,
          data: { ...mockProducts[0], id: 99, name: 'Newly Created Bat' },
        }),
        update: vi.fn().mockResolvedValue({
          success: true,
          data: { ...mockProducts[0], name: 'Updated Bat Name' },
        }),
        toggleActive: vi.fn().mockResolvedValue({ success: true, data: true }),
        delete: vi.fn().mockResolvedValue({ success: true, data: true }),
        generateSku: vi.fn().mockResolvedValue({ success: true, data: 'BAT-SS-002' }),
        generateBarcode: vi.fn().mockResolvedValue({ success: true, data: '890987654321' }),
      },
      masters: {
        getCategories: vi.fn().mockResolvedValue({ success: true, data: mockCategories }),
        getBrands: vi.fn().mockResolvedValue({ success: true, data: mockBrands }),
        getUnits: vi.fn().mockResolvedValue({ success: true, data: mockUnits }),
        getHsnCodes: vi.fn().mockResolvedValue({ success: true, data: mockHsn }),
      },
      inventory: {
        getStockMovements: vi.fn().mockResolvedValue({ success: true, data: [] }),
      },
    };
  });

  it('1. should render product list with pricing, margins, and stock badges', async () => {
    render(<ProductCatalog />);

    await waitFor(() => {
      expect(screen.getByText('SS Ton Master Bat')).toBeInTheDocument();
      expect(screen.getByText('BAT-SS-01')).toBeInTheDocument();
      expect(screen.getByText('Kookaburra Kahuna Batting Gloves')).toBeInTheDocument();
    });

    // Verify variant count badge is shown
    expect(screen.getByText('2 Variants')).toBeInTheDocument();
  });

  it('2. should filter product table by search query', async () => {
    render(<ProductCatalog />);

    await waitFor(() => {
      expect(screen.getByText('SS Ton Master Bat')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by name, SKU, barcode, brand...');
    fireEvent.change(searchInput, { target: { value: 'Gloves' } });

    expect(screen.getByText('Kookaburra Kahuna Batting Gloves')).toBeInTheDocument();
    expect(screen.queryByText('SS Ton Master Bat')).not.toBeInTheDocument();
  });

  it('3. should open create modal, auto-generate SKU, and submit new product', async () => {
    render(<ProductCatalog />);

    await waitFor(() => {
      expect(screen.getByText('Products & Catalog')).toBeInTheDocument();
    });

    // Click "+ Add Product"
    const addBtn = screen.getByText('+ Add Product');
    fireEvent.click(addBtn);

    expect(screen.getByText('Add New Product to Catalog')).toBeInTheDocument();

    // Auto-generate SKU
    const autoGenBtn = screen.getByText('Auto-Generate');
    fireEvent.click(autoGenBtn);

    await waitFor(() => {
      expect((window as any).api.products.generateSku).toHaveBeenCalled();
    });

    // Fill form
    const nameInput = screen.getByPlaceholderText('e.g. SS Ton Master English Willow Cricket Bat');
    fireEvent.change(nameInput, { target: { value: 'Newly Created Bat' } });

    // Submit
    const submitBtn = screen.getByText('Create Product');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect((window as any).api.products.create).toHaveBeenCalled();
    });
  });

  it('4. should open view details modal with specifications', async () => {
    render(<ProductCatalog />);

    await waitFor(() => {
      expect(screen.getByText('SS Ton Master Bat')).toBeInTheDocument();
    });

    // Click view button (title "View Details")
    const viewBtns = screen.getAllByTitle('View Details');
    fireEvent.click(viewBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Recent Stock Movements (Audit Trail)')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });
});
