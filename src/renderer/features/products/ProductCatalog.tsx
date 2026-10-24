import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Edit2,
  Trash2,
  Boxes,
  Barcode,
  Layers,
  Info,
} from 'lucide-react';
import { Table, Column } from '../../components/Table';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { formatPaiseToRupees, parseRupeesToPaise } from '../../utils/currency';
import {
  ProductWithDetails,
  Category,
  Brand,
  Unit,
  HsnCode,
  CreateProductInput,
  UpdateProductInput,
  CreateVariantInput,
  StockMovement,
} from '../../../shared/types/models';

interface ProductCatalogProps {
  onNavigateToModule?: (module: any) => void;
  onOpenAdjustStock?: (product: ProductWithDetails) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  onNavigateToModule,
  onOpenAdjustStock,
}) => {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [hsnCodes, setHsnCodes] = useState<HsnCode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<number | 'ALL'>('ALL');
  const [selectedStockStatus, setSelectedStockStatus] = useState<
    'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'INACTIVE'
  >('ALL');
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithDetails | null>(null);
  const [viewingProduct, setViewingProduct] = useState<ProductWithDetails | null>(null);
  const [viewingProductMovements, setViewingProductMovements] = useState<StockMovement[]>([]);
  const [productToDelete, setProductToDelete] = useState<ProductWithDetails | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category_id: 1,
    brand_id: 1,
    unit_id: 1,
    hsn_code: '9506',
    tax_rate_percent: 12.0,
    purchaseCostRupees: '',
    sellingPriceRupees: '',
    mrpRupees: '',
    min_stock_level: '3',
    reorder_level: '5',
    opening_stock_quantity: '0',
    has_variants: false,
    is_active: 1,
  });

  const [formVariants, setFormVariants] = useState<CreateVariantInput[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!window.api) {
      // Mock data for browser testing
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      const [prodRes, catRes, brandRes, unitRes, hsnRes] = await Promise.all([
        window.api.products.getAll(),
        window.api.masters.getCategories(),
        window.api.masters.getBrands(),
        window.api.masters.getUnits(),
        window.api.masters.getHsnCodes(),
      ]);

      if (prodRes.success) setProducts(prodRes.data);
      else setError(prodRes.error);

      if (catRes.success) setCategories(catRes.data);
      if (brandRes.success) setBrands(brandRes.data);
      if (unitRes.success) setUnits(unitRes.data);
      if (hsnRes.success) setHsnCodes(hsnRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered & Sorted products list
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          p.category_name.toLowerCase().includes(q) ||
          p.brand_name.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'ALL') {
      result = result.filter((p) => p.category_id === selectedCategory);
    }

    if (selectedBrand !== 'ALL') {
      result = result.filter((p) => p.brand_id === selectedBrand);
    }

    if (selectedStockStatus !== 'ALL') {
      if (selectedStockStatus === 'OUT_OF_STOCK') {
        result = result.filter((p) => p.stock_quantity === 0 && p.is_active === 1);
      } else if (selectedStockStatus === 'LOW_STOCK') {
        result = result.filter(
          (p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_level && p.is_active === 1
        );
      } else if (selectedStockStatus === 'IN_STOCK') {
        result = result.filter((p) => p.stock_quantity > p.min_stock_level && p.is_active === 1);
      } else if (selectedStockStatus === 'INACTIVE') {
        result = result.filter((p) => p.is_active === 0);
      }
    }

    result.sort((a, b) => {
      let valA: any = a[sortKey as keyof ProductWithDetails];
      let valB: any = b[sortKey as keyof ProductWithDetails];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [products, searchQuery, selectedCategory, selectedBrand, selectedStockStatus, sortKey, sortDirection]);

  const handleSort = (columnId: string) => {
    if (sortKey === columnId) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(columnId);
      setSortDirection('asc');
    }
  };

  // Form Handlers
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormError(null);
    setFormData({
      name: '',
      sku: '',
      barcode: '',
      category_id: categories[0]?.id || 1,
      brand_id: brands[0]?.id || 1,
      unit_id: units[0]?.id || 1,
      hsn_code: '9506',
      tax_rate_percent: 12.0,
      purchaseCostRupees: '',
      sellingPriceRupees: '',
      mrpRupees: '',
      min_stock_level: '3',
      reorder_level: '5',
      opening_stock_quantity: '0',
      has_variants: false,
      is_active: 1,
    });
    setFormVariants([]);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (product: ProductWithDetails) => {
    setEditingProduct(product);
    setFormError(null);
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      category_id: product.category_id,
      brand_id: product.brand_id,
      unit_id: product.unit_id,
      hsn_code: product.hsn_code || '9506',
      tax_rate_percent: product.tax_rate_percent || 12.0,
      purchaseCostRupees: (product.purchase_cost_paise / 100).toFixed(2),
      sellingPriceRupees: (product.selling_price_paise / 100).toFixed(2),
      mrpRupees: (product.mrp_paise / 100).toFixed(2),
      min_stock_level: String(product.min_stock_level),
      reorder_level: String(product.reorder_level),
      opening_stock_quantity: String(product.stock_quantity),
      has_variants: Boolean(product.has_variants),
      is_active: product.is_active,
    });
    setFormVariants([]);
    setIsFormModalOpen(true);
  };

  const handleOpenViewModal = async (product: ProductWithDetails) => {
    setViewingProduct(product);
    setViewingProductMovements([]);

    if (window.api) {
      try {
        const [fullProdRes, movRes] = await Promise.all([
          window.api.products.getById(product.id),
          window.api.inventory.getStockMovements(product.id, 10),
        ]);
        if (fullProdRes.success && fullProdRes.data) {
          setViewingProduct(fullProdRes.data);
        }
        if (movRes.success) {
          setViewingProductMovements(movRes.data);
        }
      } catch (err) {
        console.error('Error fetching product details:', err);
      }
    }
  };

  const handleAutoGenerateSku = async () => {
    if (!window.api) return;
    const cat = categories.find((c) => c.id === formData.category_id);
    const brd = brands.find((b) => b.id === formData.brand_id);
    const catCode = cat?.code || 'CRIC';
    const brdCode = brd?.code || 'GEN';

    const res = await window.api.products.generateSku(catCode, brdCode);
    if (res.success) {
      setFormData((prev) => ({ ...prev, sku: res.data }));
    }
  };

  const handleGenerateBarcode = async () => {
    if (!window.api) return;
    const res = await window.api.products.generateBarcode();
    if (res.success) {
      setFormData((prev) => ({ ...prev, barcode: res.data }));
    }
  };

  // Quick Preset for Cricket Bat Variants (SH, LH, Harrow, 6)
  const handleAddPresetBatVariants = () => {
    const pCost = parseRupeesToPaise(formData.purchaseCostRupees || '0');
    const sPrice = parseRupeesToPaise(formData.sellingPriceRupees || '0');
    const mrp = parseRupeesToPaise(formData.mrpRupees || '0');
    const baseSku = formData.sku || 'BAT';

    const presets: CreateVariantInput[] = [
      {
        variant_name: 'Short Handle (SH)',
        sku: `${baseSku}-SH`,
        size: 'SH',
        color: 'Standard',
        purchase_cost_paise: pCost,
        selling_price_paise: sPrice,
        mrp_paise: mrp,
        opening_stock_quantity: 2,
      },
      {
        variant_name: 'Long Handle (LH)',
        sku: `${baseSku}-LH`,
        size: 'LH',
        color: 'Standard',
        purchase_cost_paise: pCost,
        selling_price_paise: sPrice,
        mrp_paise: mrp,
        opening_stock_quantity: 1,
      },
      {
        variant_name: 'Harrow (Junior)',
        sku: `${baseSku}-HAR`,
        size: 'Harrow',
        color: 'Standard',
        purchase_cost_paise: Math.round(pCost * 0.85),
        selling_price_paise: Math.round(sPrice * 0.85),
        mrp_paise: Math.round(mrp * 0.85),
        opening_stock_quantity: 1,
      },
    ];

    setFormVariants(presets);
    setFormData((prev) => ({ ...prev, has_variants: true }));
  };

  const handleAddBlankVariant = () => {
    const pCost = parseRupeesToPaise(formData.purchaseCostRupees || '0');
    const sPrice = parseRupeesToPaise(formData.sellingPriceRupees || '0');
    const mrp = parseRupeesToPaise(formData.mrpRupees || '0');
    const baseSku = formData.sku || 'ITEM';
    const index = formVariants.length + 1;

    setFormVariants((prev) => [
      ...prev,
      {
        variant_name: `Variant ${index}`,
        sku: `${baseSku}-V${index}`,
        size: '',
        color: '',
        purchase_cost_paise: pCost,
        selling_price_paise: sPrice,
        mrp_paise: mrp,
        opening_stock_quantity: 0,
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    setFormVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVariantFieldChange = (
    index: number,
    field: keyof CreateVariantInput,
    value: any
  ) => {
    setFormVariants((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Product Name is required.');
      return;
    }
    if (!formData.sku.trim()) {
      setFormError('SKU is required.');
      return;
    }

    const purchaseCostPaise = parseRupeesToPaise(formData.purchaseCostRupees || '0');
    const sellingPricePaise = parseRupeesToPaise(formData.sellingPriceRupees || '0');
    const mrpPaise = parseRupeesToPaise(formData.mrpRupees || '0');

    if (mrpPaise > 0 && sellingPricePaise > mrpPaise) {
      setFormError('Selling price cannot exceed Maximum Retail Price (MRP).');
      return;
    }

    setFormSubmitting(true);

    try {
      if (editingProduct) {
        // Update product
        const updatePayload: UpdateProductInput = {
          id: editingProduct.id,
          name: formData.name.trim(),
          sku: formData.sku.trim(),
          barcode: formData.barcode ? formData.barcode.trim() : undefined,
          category_id: Number(formData.category_id),
          brand_id: Number(formData.brand_id),
          unit_id: Number(formData.unit_id),
          hsn_code: formData.hsn_code,
          tax_rate_percent: Number(formData.tax_rate_percent),
          purchase_cost_paise: purchaseCostPaise,
          selling_price_paise: sellingPricePaise,
          mrp_paise: mrpPaise,
          min_stock_level: Number(formData.min_stock_level),
          reorder_level: Number(formData.reorder_level),
          is_active: formData.is_active,
        };

        const res = await window.api.products.update(updatePayload);
        if (res.success) {
          showNotification(`Product "${res.data.name}" updated successfully.`);
          setIsFormModalOpen(false);
          loadData();
        } else {
          setFormError(res.error);
        }
      } else {
        // Create product
        const createPayload: CreateProductInput = {
          name: formData.name.trim(),
          sku: formData.sku.trim(),
          barcode: formData.barcode ? formData.barcode.trim() : undefined,
          category_id: Number(formData.category_id),
          brand_id: Number(formData.brand_id),
          unit_id: Number(formData.unit_id),
          hsn_code: formData.hsn_code,
          tax_rate_percent: Number(formData.tax_rate_percent),
          purchase_cost_paise: purchaseCostPaise,
          selling_price_paise: sellingPricePaise,
          mrp_paise: mrpPaise,
          min_stock_level: Number(formData.min_stock_level),
          reorder_level: Number(formData.reorder_level),
          opening_stock_quantity: Number(formData.opening_stock_quantity),
          has_variants: formData.has_variants,
          variants: formData.has_variants ? formVariants : undefined,
        };

        const res = await window.api.products.create(createPayload);
        if (res.success) {
          showNotification(`Product "${res.data.name}" created successfully.`);
          setIsFormModalOpen(false);
          loadData();
        } else {
          setFormError(res.error);
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleActive = async (product: ProductWithDetails) => {
    if (!window.api) return;
    const nextActive = product.is_active === 1 ? 0 : 1;
    const res = await window.api.products.toggleActive(product.id, nextActive);
    if (res.success) {
      showNotification(`Product is now ${nextActive === 1 ? 'Active' : 'Inactive'}.`);
      loadData();
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete || !window.api) return;
    setDeleteError(null);
    try {
      const res = await window.api.products.delete(productToDelete.id);
      if (res.success) {
        showNotification(`Product "${productToDelete.name}" deleted.`);
        setProductToDelete(null);
        loadData();
      } else {
        setDeleteError(res.error);
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    }
  };

  // Table Columns
  const columns: Column<ProductWithDetails>[] = [
    {
      id: 'name',
      header: 'Product Details',
      sortable: true,
      render: (p) => (
        <div>
          <div className="font-bold text-retail-text leading-tight">{p.name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-mono text-retail-muted">{p.sku}</span>
            {p.has_variants === 1 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-brand-light text-brand-dark border border-brand-primary/20">
                {p.variants_count} Variants
              </span>
            )}
            {p.barcode && (
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                [{p.barcode}]
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'category_name',
      header: 'Category & Brand',
      sortable: true,
      render: (p) => (
        <div>
          <span className="text-retail-text font-medium">{p.category_name}</span>
          <span className="text-retail-muted text-[11px] block">{p.brand_name}</span>
        </div>
      ),
    },
    {
      id: 'selling_price_paise',
      header: 'Pricing & Margin',
      sortable: true,
      align: 'right',
      render: (p) => {
        const marginPaise = p.selling_price_paise - p.purchase_cost_paise;
        const marginPct =
          p.selling_price_paise > 0
            ? Math.round((marginPaise / p.selling_price_paise) * 100)
            : 0;
        return (
          <div className="text-right">
            <div className="font-bold text-retail-text">
              {formatPaiseToRupees(p.selling_price_paise)}
            </div>
            <div className="text-[10px] text-retail-muted flex items-center justify-end gap-1.5 mt-0.5">
              <span>Cost: {formatPaiseToRupees(p.purchase_cost_paise)}</span>
              <span className="text-brand-primary font-bold">({marginPct}%)</span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'stock_quantity',
      header: 'Available Stock',
      sortable: true,
      align: 'center',
      render: (p) => {
        const isOut = p.stock_quantity === 0;
        const isLow = p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_level;
        return (
          <div className="inline-flex flex-col items-center">
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                isOut
                  ? 'bg-retail-error/15 text-retail-error'
                  : isLow
                  ? 'bg-retail-warning/15 text-retail-warning'
                  : 'bg-brand-light text-brand-dark'
              }`}
            >
              {p.stock_quantity} {p.unit_symbol}
            </span>
            <span className="text-[10px] text-retail-muted mt-0.5">
              Reorder: {p.reorder_level}
            </span>
          </div>
        );
      },
    },
    {
      id: 'is_active',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (p) => (
        <span
          onClick={(e) => {
            e.stopPropagation();
            handleToggleActive(p);
          }}
          className={`cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-opacity hover:opacity-80 ${
            p.is_active === 1
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-500 border border-slate-200'
          }`}
          title="Click to toggle Active status"
        >
          {p.is_active === 1 ? (
            <>
              <CheckCircle2 size={11} />
              <span>Active</span>
            </>
          ) : (
            <>
              <XCircle size={11} />
              <span>Inactive</span>
            </>
          )}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleOpenViewModal(p)}
            className="p-1.5 rounded-lg text-retail-muted hover:text-retail-text hover:bg-retail-bg transition-colors"
            title="View Details"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => handleOpenEditModal(p)}
            className="p-1.5 rounded-lg text-brand-primary hover:bg-brand-light transition-colors"
            title="Edit Product"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => {
              if (onOpenAdjustStock) {
                onOpenAdjustStock(p);
              } else if (onNavigateToModule) {
                onNavigateToModule('inventory');
              }
            }}
            className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 transition-colors"
            title="Adjust Stock"
          >
            <Boxes size={15} />
          </button>
          <button
            onClick={() => {
              setProductToDelete(p);
              setDeleteError(null);
            }}
            className="p-1.5 rounded-lg text-retail-error hover:bg-red-50 transition-colors"
            title="Delete Product"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-retail-text tracking-tight font-sans flex items-center gap-2.5">
            <Package size={26} className="text-brand-primary" />
            <span>Products & Catalog</span>
          </h1>
          <p className="text-xs text-retail-muted mt-1">
            Master sports equipment inventory, bat sizes, cricket protective gear, variants, and barcodes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="dark"
            icon={<Plus size={16} />}
            onClick={handleOpenCreateModal}
            className="rounded-full px-5 py-2.5 font-semibold shadow-sm"
          >
            + Add Product
          </Button>

          <Button
            variant="secondary"
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={loadData}
            disabled={loading}
            className="rounded-full px-4 py-2.5 font-medium shadow-2xs"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 shadow-2xs">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-retail-error text-xs flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="danger" onClick={loadData}>
            Retry
          </Button>
        </div>
      )}

      {/* 2. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-retail-border p-4 shadow-card space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-retail-muted">
              <Search size={15} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, SKU, barcode, brand..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-retail-bg border border-retail-border rounded-xl text-retail-text placeholder:text-retail-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
              }
              className="w-full py-2 px-3 text-xs bg-retail-bg border border-retail-border rounded-xl text-retail-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedBrand}
              onChange={(e) =>
                setSelectedBrand(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
              }
              className="w-full py-2 px-3 text-xs bg-retail-bg border border-retail-border rounded-xl text-retail-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="ALL">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedStockStatus}
              onChange={(e) => setSelectedStockStatus(e.target.value as any)}
              className="w-full py-2 px-3 text-xs bg-retail-bg border border-retail-border rounded-xl text-retail-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="ALL">All Status</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {/* Counter Summary Bar */}
        <div className="flex items-center justify-between text-xs text-retail-muted pt-1 border-t border-retail-border/60">
          <div>
            Showing <strong className="text-retail-text">{filteredProducts.length}</strong> of{' '}
            <strong className="text-retail-text">{products.length}</strong> products in catalog
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Live Local SQLite Master Catalog</span>
          </div>
        </div>
      </div>

      {/* 3. Product Catalog Table */}
      <Table
        data={filteredProducts}
        columns={columns}
        keyExtractor={(p) => p.id}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={handleSort}
        loading={loading}
        onRowClick={(p) => handleOpenViewModal(p)}
        emptyTitle="No Products Found"
        emptySubtitle="Try adjusting your search criteria or create a new product to expand your sports catalog."
      />

      {/* 4. Product Create / Edit Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Product to Catalog'}
        subtitle="Configure sports specifications, pricing in paise, HSN codes, and equipment variants."
        maxWidth="3xl"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsFormModalOpen(false)}
              disabled={formSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleFormSubmit}
              loading={formSubmitting}
            >
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleFormSubmit} className="space-y-5 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-retail-error flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>{formError}</span>
            </div>
          )}

          {/* Section A: Product General Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-retail-text uppercase tracking-wider text-brand-dark flex items-center gap-1.5">
              <Info size={14} className="text-brand-primary" />
              <span>1. General Information</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-retail-text mb-1 uppercase tracking-wider">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. SS Ton Master English Willow Cricket Bat"
                  className="w-full p-2.5 rounded-lg border border-retail-border bg-white text-retail-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-retail-text mb-1 uppercase tracking-wider">
                  Category *
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: Number(e.target.value) })
                  }
                  className="w-full p-2.5 rounded-lg border border-retail-border bg-white text-retail-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-retail-text mb-1 uppercase tracking-wider">
                  Brand *
                </label>
                <select
                  value={formData.brand_id}
                  onChange={(e) =>
                    setFormData({ ...formData, brand_id: Number(e.target.value) })
                  }
                  className="w-full p-2.5 rounded-lg border border-retail-border bg-white text-retail-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-retail-text mb-1 uppercase tracking-wider">
                  Measurement Unit *
                </label>
                <select
                  value={formData.unit_id}
                  onChange={(e) =>
                    setFormData({ ...formData, unit_id: Number(e.target.value) })
                  }
                  className="w-full p-2.5 rounded-lg border border-retail-border bg-white text-retail-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-retail-text mb-1 uppercase tracking-wider">
                  HSN Code & GST Rate
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.hsn_code}
                    onChange={(e) => {
                      const selectedHsn = hsnCodes.find((h) => h.hsn_code === e.target.value);
                      setFormData({
                        ...formData,
                        hsn_code: e.target.value,
                        tax_rate_percent: selectedHsn ? selectedHsn.tax_rate_percent : 12.0,
                      });
                    }}
                    className="w-full p-2.5 rounded-lg border border-retail-border bg-white text-retail-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  >
                    {hsnCodes.map((h) => (
                      <option key={h.id} value={h.hsn_code}>
                        HSN {h.hsn_code} ({h.tax_rate_percent}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Identifiers & Barcodes */}
          <div className="space-y-3 pt-2 border-t border-retail-border">
            <h4 className="text-xs font-bold text-retail-text uppercase tracking-wider text-brand-dark flex items-center gap-1.5">
              <Barcode size={14} className="text-brand-primary" />
              <span>2. Identifiers & Barcode</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-retail-text uppercase tracking-wider">
                    SKU Code *
                  </label>
                  {!editingProduct && (
                    <button
                      type="button"
                      onClick={handleAutoGenerateSku}
                      className="text-[10px] text-brand-primary font-bold hover:underline"
                    >
                      Auto-Generate
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  placeholder="e.g. BAT-SS-TON-01"
                  className="w-full p-2.5 rounded-lg border border-retail-border bg-white text-retail-text font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-retail-text uppercase tracking-wider">
                    Barcode (EAN-13 / Code-128)
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    className="text-[10px] text-brand-primary font-bold hover:underline"
                  >
                    Generate Barcode
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="e.g. 890123400001"
                  className="w-full p-2.5 rounded-lg border border-retail-border bg-white text-retail-text font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
            </div>
          </div>

          {/* Section C: Pricing & Margin */}
          <div className="space-y-3 pt-2 border-t border-retail-border">
            <h4 className="text-xs font-bold text-retail-text uppercase tracking-wider text-brand-dark flex items-center gap-1.5">
              <SlidersHorizontal size={14} className="text-brand-primary" />
              <span>3. Pricing & Margin Structure</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-retail-text mb-1 uppercase tracking-wider">
                  Purchase Cost (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.purchaseCostRupees}
                  onChange={(e) => setFormData({ ...formData, purchaseCostRupees: e.target.value })}
                  placeholder="0.00"
                  className="w-full p-2.5 rounded-lg border border-retail-border bg-white text-retail-text font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-retail-text mb-1 uppercase tracking-wider">
                  Selling Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.sellingPriceRupees}
                  onChange={(e) => setFormData({ ...formData, sellingPriceRupees: e.target.value })}
                  placeholder="0.00"
                  className="w-full p-2.5 rounded-lg border border-retail-border bg-white text-retail-text font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-retail-text mb-1 uppercase tracking-wider">
                  Maximum Retail Price MRP (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.mrpRupees}
                  onChange={(e) => setFormData({ ...formData, mrpRupees: e.target.value })}
                  placeholder="0.00"
                  className="w-full p-2.5 rounded-lg border border-retail-border bg-white text-retail-text font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
            </div>
          </div>

          {/* Section D: Inventory Thresholds */}
          <div className="space-y-3 pt-2 border-t border-retail-border">
            <h4 className="text-xs font-bold text-retail-text uppercase tracking-wider text-brand-dark flex items-center gap-1.5">
              <Boxes size={14} className="text-brand-primary" />
              <span>4. Stock & Threshold Alerts</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {!editingProduct && !formData.has_variants && (
                <div>
                  <label className="block text-[11px] font-semibold text-retail-text mb-1 uppercase tracking-wider">
                    Opening Stock Units
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.opening_stock_quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, opening_stock_quantity: e.target.value })
                    }
                    className="w-full p-2.5 rounded-lg border border-retail-border bg-white text-retail-text font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-retail-text mb-1 uppercase tracking-wider">
                  Min Stock Alert Level
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-retail-border bg-white text-retail-text font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-retail-text mb-1 uppercase tracking-wider">
                  Reorder Threshold Level
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.reorder_level}
                  onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-retail-border bg-white text-retail-text font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
            </div>
          </div>

          {/* Section E: Equipment Variants (Creation Only) */}
          {!editingProduct && (
            <div className="space-y-3 pt-2 border-t border-retail-border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-retail-text uppercase tracking-wider text-brand-dark flex items-center gap-1.5">
                    <Layers size={14} className="text-brand-primary" />
                    <span>5. Product Variants (Sizes & Colors)</span>
                  </h4>
                  <p className="text-[11px] text-retail-muted">
                    Enable multi-variant inventory for cricket bats, gloves, shoes, or apparel.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_variants}
                    onChange={(e) => setFormData({ ...formData, has_variants: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary" />
                </label>
              </div>

              {formData.has_variants && (
                <div className="space-y-3 bg-retail-bg p-3.5 rounded-xl border border-retail-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-retail-text">
                      Variant Matrix ({formVariants.length} Defined)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleAddPresetBatVariants}
                      >
                        + Bat Preset (SH/LH/Harrow)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={handleAddBlankVariant}
                      >
                        + Add Custom Variant
                      </Button>
                    </div>
                  </div>

                  {formVariants.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-retail-muted bg-white rounded-lg border border-dashed border-retail-border">
                      No variants added yet. Use the presets above or click "Add Custom Variant".
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formVariants.map((v, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-white rounded-lg border border-retail-border grid grid-cols-1 sm:grid-cols-6 gap-2 items-center"
                        >
                          <div className="sm:col-span-2">
                            <label className="text-[10px] text-retail-muted block">
                              Variant Name & Size
                            </label>
                            <input
                              type="text"
                              value={v.variant_name}
                              onChange={(e) =>
                                handleVariantFieldChange(idx, 'variant_name', e.target.value)
                              }
                              placeholder="e.g. Size: Short Handle"
                              className="w-full text-xs p-1.5 border border-retail-border rounded"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-retail-muted block">SKU</label>
                            <input
                              type="text"
                              value={v.sku}
                              onChange={(e) =>
                                handleVariantFieldChange(idx, 'sku', e.target.value.toUpperCase())
                              }
                              className="w-full text-xs p-1.5 border border-retail-border rounded font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-retail-muted block">Price (₹)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={(v.selling_price_paise / 100).toFixed(2)}
                              onChange={(e) =>
                                handleVariantFieldChange(
                                  idx,
                                  'selling_price_paise',
                                  parseRupeesToPaise(e.target.value)
                                )
                              }
                              className="w-full text-xs p-1.5 border border-retail-border rounded font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-retail-muted block">Opening Stock</label>
                            <input
                              type="number"
                              min="0"
                              value={v.opening_stock_quantity}
                              onChange={(e) =>
                                handleVariantFieldChange(
                                  idx,
                                  'opening_stock_quantity',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full text-xs p-1.5 border border-retail-border rounded font-mono"
                            />
                          </div>

                          <div className="text-right pt-3">
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(idx)}
                              className="p-1 text-retail-error hover:bg-red-50 rounded"
                              title="Remove Variant"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </form>
      </Modal>

      {/* 5. View Product Details Modal */}
      {viewingProduct && (
        <Modal
          isOpen={Boolean(viewingProduct)}
          onClose={() => setViewingProduct(null)}
          title={viewingProduct.name}
          subtitle={`SKU: ${viewingProduct.sku} | Barcode: ${viewingProduct.barcode || 'N/A'}`}
          maxWidth="2xl"
          footer={
            <div className="flex justify-between w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const p = viewingProduct;
                  setViewingProduct(null);
                  handleOpenEditModal(p);
                }}
                icon={<Edit2 size={14} />}
              >
                Edit Product
              </Button>
              <Button variant="primary" size="sm" onClick={() => setViewingProduct(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-retail-bg p-3.5 rounded-xl border border-retail-border">
              <div>
                <span className="text-[10px] text-retail-muted uppercase font-semibold">Category</span>
                <div className="font-bold text-retail-text text-sm mt-0.5">
                  {viewingProduct.category_name}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-retail-muted uppercase font-semibold">Brand</span>
                <div className="font-bold text-retail-text text-sm mt-0.5">
                  {viewingProduct.brand_name}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-retail-muted uppercase font-semibold">Selling Price</span>
                <div className="font-bold text-brand-dark text-sm mt-0.5">
                  {formatPaiseToRupees(viewingProduct.selling_price_paise)}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-retail-muted uppercase font-semibold">Stock Available</span>
                <div className="font-bold text-retail-text text-sm mt-0.5">
                  {viewingProduct.stock_quantity} {viewingProduct.unit_symbol}
                </div>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="grid grid-cols-3 gap-3 border border-retail-border rounded-xl p-3">
              <div>
                <span className="text-[10px] text-retail-muted uppercase">Purchase Cost</span>
                <div className="font-semibold text-retail-text">
                  {formatPaiseToRupees(viewingProduct.purchase_cost_paise)}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-retail-muted uppercase">MRP</span>
                <div className="font-semibold text-retail-text">
                  {formatPaiseToRupees(viewingProduct.mrp_paise)}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-retail-muted uppercase">GST Rate</span>
                <div className="font-semibold text-retail-text">
                  {viewingProduct.tax_rate_percent}% (HSN {viewingProduct.hsn_code})
                </div>
              </div>
            </div>

            {/* Variants Listing if any */}
            {viewingProduct.variants && viewingProduct.variants.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-retail-text text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-brand-primary" />
                  <span>Equipment Variants ({viewingProduct.variants.length})</span>
                </h4>
                <div className="divide-y divide-retail-border border border-retail-border rounded-xl overflow-hidden">
                  {viewingProduct.variants.map((v) => (
                    <div key={v.id} className="p-2.5 bg-white flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-retail-text">{v.variant_name}</span>
                        <span className="font-mono text-retail-muted text-[11px] ml-2">{v.sku}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-retail-text">
                          {formatPaiseToRupees(v.selling_price_paise)}
                        </span>
                        <span className="font-bold px-2 py-0.5 rounded-full bg-brand-light text-brand-dark">
                          {v.stock_quantity} units
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Stock Movement Audit Trail for this product */}
            <div className="space-y-2">
              <h4 className="font-bold text-retail-text text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Boxes size={14} className="text-brand-primary" />
                <span>Recent Stock Movements (Audit Trail)</span>
              </h4>

              {viewingProductMovements.length === 0 ? (
                <div className="p-3 text-center text-retail-muted bg-retail-bg rounded-lg">
                  No stock movements recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-retail-border border border-retail-border rounded-xl overflow-hidden">
                  {viewingProductMovements.map((m) => (
                    <div key={m.id} className="p-2.5 bg-white flex items-center justify-between text-xs">
                      <div>
                        <Badge variant="brand">{m.movement_type}</Badge>
                        <span className="text-retail-muted text-[11px] ml-2">
                          {m.notes || 'Routine stock intake/audit'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-bold font-mono ${
                            m.quantity_change >= 0 ? 'text-emerald-700' : 'text-retail-error'
                          }`}
                        >
                          {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                        </span>
                        <span className="text-[11px] text-retail-muted">
                          Balance: {m.balance_quantity_after}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Delete Confirmation Dialog */}
      {productToDelete && (
        <Modal
          isOpen={Boolean(productToDelete)}
          onClose={() => setProductToDelete(null)}
          title="Confirm Product Deletion"
          maxWidth="md"
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setProductToDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteProduct}>
                Permanently Delete
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs">
            {deleteError ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-retail-error space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle size={15} />
                  <span>Cannot Delete Product</span>
                </div>
                <p className="leading-relaxed">{deleteError}</p>
              </div>
            ) : (
              <p className="text-retail-text leading-relaxed">
                Are you sure you want to delete{' '}
                <strong className="text-brand-dark">{productToDelete.name}</strong> (SKU:{' '}
                {productToDelete.sku})? This will permanently remove its catalog entry if no sales
                movements exist.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
