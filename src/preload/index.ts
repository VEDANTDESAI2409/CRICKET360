import { contextBridge, ipcRenderer } from 'electron';
import { IpcApi } from '../shared/types/ipc';

const api: IpcApi = {
  app: {
    getInfo: () => ipcRenderer.invoke('app:getInfo'),
    getHealthCheck: () => ipcRenderer.invoke('app:getHealthCheck'),
  },
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', { key, value }),
  },
  db: {
    getStats: () => ipcRenderer.invoke('db:getStats'),
  },
  dashboard: {
    getMetrics: () => ipcRenderer.invoke('dashboard:getMetrics'),
    getLowStockAlerts: () => ipcRenderer.invoke('dashboard:getLowStockAlerts'),
    getRecentTransactions: () => ipcRenderer.invoke('dashboard:getRecentTransactions'),
    getWeeklySalesSummary: () => ipcRenderer.invoke('dashboard:getWeeklySalesSummary'),
  },
  products: {
    getAll: (filters) => ipcRenderer.invoke('products:getAll', filters),
    getById: (id) => ipcRenderer.invoke('products:getById', id),
    create: (data) => ipcRenderer.invoke('products:create', data),
    update: (data) => ipcRenderer.invoke('products:update', data),
    toggleActive: (id, is_active) => ipcRenderer.invoke('products:toggleActive', id, is_active),
    delete: (id) => ipcRenderer.invoke('products:delete', id),
    validateSku: (sku, excludeProductId) => ipcRenderer.invoke('products:validateSku', sku, excludeProductId),
    validateBarcode: (barcode, excludeProductId) => ipcRenderer.invoke('products:validateBarcode', barcode, excludeProductId),
    generateSku: (categoryCode, brandCode) => ipcRenderer.invoke('products:generateSku', categoryCode, brandCode),
    generateBarcode: () => ipcRenderer.invoke('products:generateBarcode'),
    getVariants: (productId) => ipcRenderer.invoke('products:getVariants', productId),
  },
  inventory: {
    getStockMovements: (productId, limit) => ipcRenderer.invoke('inventory:getStockMovements', productId, limit),
    adjustStock: (data) => ipcRenderer.invoke('inventory:adjustStock', data),
    getAdjustments: (productId, limit) => ipcRenderer.invoke('inventory:getAdjustments', productId, limit),
  },
  masters: {
    getCategories: () => ipcRenderer.invoke('masters:getCategories'),
    getBrands: () => ipcRenderer.invoke('masters:getBrands'),
    getUnits: () => ipcRenderer.invoke('masters:getUnits'),
    getHsnCodes: () => ipcRenderer.invoke('masters:getHsnCodes'),
    createCategory: (name, code, description) => ipcRenderer.invoke('masters:createCategory', name, code, description),
    createBrand: (name, code) => ipcRenderer.invoke('masters:createBrand', name, code),
  },
  billing: {
    createInvoice: (data) => ipcRenderer.invoke('billing:createInvoice', data),
    getInvoices: (filters) => ipcRenderer.invoke('billing:getInvoices', filters),
    getInvoiceById: (id) => ipcRenderer.invoke('billing:getInvoiceById', id),
    cancelInvoice: (invoiceId, reason) => ipcRenderer.invoke('billing:cancelInvoice', { invoiceId, reason }),
    getNextInvoiceNumber: () => ipcRenderer.invoke('billing:getNextInvoiceNumber'),
    getShopSettings: () => ipcRenderer.invoke('billing:getShopSettings'),
  },
  customers: {
    search: (query) => ipcRenderer.invoke('customers:search', query),
    getById: (id) => ipcRenderer.invoke('customers:getById', id),
    create: (data) => ipcRenderer.invoke('customers:create', data),
    update: (data) => ipcRenderer.invoke('customers:update', data),
    getLedger: (id) => ipcRenderer.invoke('customers:getLedger', id),
  },
  suppliers: {
    getAll: (search) => ipcRenderer.invoke('suppliers:getAll', search),
    getById: (id) => ipcRenderer.invoke('suppliers:getById', id),
    create: (data) => ipcRenderer.invoke('suppliers:create', data),
    update: (data) => ipcRenderer.invoke('suppliers:update', data),
    getLedger: (id) => ipcRenderer.invoke('suppliers:getLedger', id),
  },
  purchases: {
    getAll: (filters) => ipcRenderer.invoke('purchases:getAll', filters),
    getById: (id) => ipcRenderer.invoke('purchases:getById', id),
    create: (data) => ipcRenderer.invoke('purchases:create', data),
    createReturn: (data) => ipcRenderer.invoke('purchases:createReturn', data),
    getNextNumber: () => ipcRenderer.invoke('purchases:getNextNumber'),
  },
  payments: {
    getAll: (filters) => ipcRenderer.invoke('payments:getAll', filters),
    recordSupplierPayment: (data) => ipcRenderer.invoke('payments:recordSupplierPayment', data),
    recordCustomerPayment: (data) => ipcRenderer.invoke('payments:recordCustomerPayment', data),
  },
};

// Expose the protected API to the renderer process
contextBridge.exposeInMainWorld('api', api);
