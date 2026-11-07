import React, { useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package,
  Layers,
  AlertTriangle,
  History,
  Plus,
  Minus,
  Edit3,
  RotateCcw,
  Trash2,
  Settings,
  LogOut,
  RefreshCw,
  Check,
  CheckCircle2,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  ShieldCheck,
  Search,
  ArrowUpDown,
  ZoomIn,
} from 'lucide-react';
import {
  AdminProfile,
  BusinessSettings,
  OfflineAction,
  Product,
  StockMovement,
} from '../types.ts';
import { useTranslation } from '../i18n/LanguageContext.tsx';
import { ProductImage } from './ProductImage.tsx';
import { AdminSmartEntry } from './AdminSmartEntry.tsx';
import { ImageUploaderField } from './ImageUploaderField.tsx';
import { SequentialShowcaseCards } from './SequentialShowcaseCards.tsx';
import { useDebounce } from '../hooks/useDebounce.ts';

interface AdminDashboardViewProps {
  currentAdmin: AdminProfile;
  admins: AdminProfile[];
  products: Product[];
  movements: StockMovement[];
  settings: BusinessSettings;
  authToken: string;
  isOnline: boolean;
  offlineQueue: OfflineAction[];
  isSyncing: boolean;
  onSyncNow: () => Promise<void>;
  onLogout: () => void;
  onCreateProduct: (data: {
    name: string;
    size: string;
    imageUrl: string;
    price: number;
    stockQuantity: number;
    note?: string;
  }) => Promise<void>;
  onUpdateProduct: (
    productId: number,
    data: {
      name?: string;
      size?: string;
      imageUrl?: string;
      price?: number;
      stockQuantity?: number;
      stockNote?: string;
      isActive?: boolean;
    }
  ) => Promise<void>;
  onAdjustStock: (
    productId: number,
    actionType: 'ADD' | 'REMOVE' | 'ADJUST',
    amount: number,
    note?: string
  ) => Promise<void>;
  onDeleteProduct: (productId: number) => Promise<void>;
  onUpdateSettings: (data: Partial<BusinessSettings>) => Promise<void>;
  onUpdateAdminProfile: (
    adminId: number,
    email: string,
    name: string,
    newPassword?: string
  ) => Promise<void>;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentAdmin,
  admins,
  products,
  movements,
  settings,
  authToken,
  isOnline,
  offlineQueue,
  isSyncing,
  onSyncNow,
  onLogout,
  onCreateProduct,
  onUpdateProduct,
  onAdjustStock,
  onDeleteProduct,
  onUpdateSettings,
  onUpdateAdminProfile,
}) => {
  const { t, translateSize } = useTranslation();
  const [activeTab, setActiveTab] = useState<
    'inventory' | 'showcase' | 'smart_entry' | 'history' | 'settings'
  >('inventory');

  // Admin Inventory Search, Filter & Sort State (with Debounced Input)
  const [adminSearch, setAdminSearch] = useState('');
  const {
    debouncedValue: debouncedAdminSearch,
    isDebouncing: isAdminSearchDebouncing,
    flushNow: flushAdminSearchNow,
  } = useDebounce(adminSearch, 220);
  const [adminSizeFilter, setAdminSizeFilter] = useState('ALL');
  const [adminStatusFilter, setAdminStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'ARCHIVED' | 'LOW_STOCK'
  >('ALL');
  const [adminSortBy, setAdminSortBy] = useState<
    'FEATURED' | 'PRICE_ASC' | 'PRICE_DESC' | 'STOCK_DESC' | 'NAME_ASC'
  >('FEATURED');
  const [adminClearSignal, setAdminClearSignal] = useState(0);
  const [zoomedAdminProduct, setZoomedAdminProduct] = useState<Product | null>(
    null
  );

  // Stock Adjustment Modal State
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(
    null
  );
  const [stockActionType, setStockActionType] = useState<
    'ADD' | 'REMOVE' | 'ADJUST'
  >('ADD');
  const [stockAmount, setStockAmount] = useState('10');
  const [stockNote, setStockNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Unified Fast Edit Product & Stock Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editSize, setEditSize] = useState('Medium');
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editStockNote, setEditStockNote] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editImage, setEditImage] = useState('');

  // Fast Delete Row Flash & Notification Pop-up State
  const [deletingProductId, setDeletingProductId] = useState<number | null>(
    null
  );
  const [actionPopup, setActionPopup] = useState<{
    id: number;
    type: 'deleted' | 'updated' | 'restored';
    title: string;
    subtitle: string;
    productSnapshot?: Product;
  } | null>(null);
  const popupTimerRef = useRef<number | null>(null);

  const triggerActionPopup = useCallback(
    (popup: {
      type: 'deleted' | 'updated' | 'restored';
      title: string;
      subtitle: string;
      productSnapshot?: Product;
    }) => {
      if (popupTimerRef.current) {
        window.clearTimeout(popupTimerRef.current);
      }
      setActionPopup({
        id: Date.now(),
        ...popup,
      });
      popupTimerRef.current = window.setTimeout(() => {
        setActionPopup(null);
      }, 4200);
    },
    []
  );

  // Quick Add Product Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addSize, setAddSize] = useState('Medium');
  const [addPrice, setAddPrice] = useState('');
  const [addStock, setAddStock] = useState('');
  const [addImage, setAddImage] = useState('');

  // Settings Form State
  const [bizName, setBizName] = useState(settings.businessName);
  const [waNumber, setWaNumber] = useState(settings.whatsappNumber);
  const [lowThreshold, setLowThreshold] = useState(
    String(settings.lowStockThreshold || 10)
  );
  const [defLang, setDefLang] = useState(settings.defaultLanguage || 'en');
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Admin Profile Edit State
  const [editingAdminId, setEditingAdminId] = useState<number | null>(null);
  const [adminEditName, setAdminEditName] = useState('');
  const [adminEditEmail, setAdminEditEmail] = useState('');
  const [adminEditPassword, setAdminEditPassword] = useState('');
  const [adminSavedBanner, setAdminSavedBanner] = useState<string | null>(null);

  // Metrics
  const totalProducts = products.length;
  const totalStock = products
    .filter((p) => p.isActive)
    .reduce((acc, p) => acc + p.stockQuantity, 0);
  const lowStockProducts = products.filter(
    (p) => p.isActive && p.stockQuantity <= (settings.lowStockThreshold || 10)
  );

  // Memoized Filtered & Sorted Admin Products using debouncedAdminSearch
  const filteredAdminProducts = useMemo(() => {
    const q = debouncedAdminSearch.trim().toLowerCase();
    const threshold = settings.lowStockThreshold || 10;

    return products
      .filter((p) => {
        if (
          q &&
          !p.name.toLowerCase().includes(q) &&
          !p.size.toLowerCase().includes(q) &&
          !String(p.price).includes(q) &&
          !String(p.id).includes(q)
        ) {
          return false;
        }
        if (
          adminSizeFilter !== 'ALL' &&
          p.size.toLowerCase() !== adminSizeFilter.toLowerCase()
        ) {
          return false;
        }
        if (adminStatusFilter === 'ACTIVE' && !p.isActive) return false;
        if (adminStatusFilter === 'ARCHIVED' && p.isActive) return false;
        if (adminStatusFilter === 'LOW_STOCK' && p.stockQuantity > threshold) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (adminSortBy === 'PRICE_ASC') return a.price - b.price;
        if (adminSortBy === 'PRICE_DESC') return b.price - a.price;
        if (adminSortBy === 'STOCK_DESC')
          return b.stockQuantity - a.stockQuantity;
        if (adminSortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
        return a.id - b.id;
      });
  }, [
    products,
    debouncedAdminSearch,
    adminSizeFilter,
    adminStatusFilter,
    adminSortBy,
    settings.lowStockThreshold,
  ]);

  const hasActiveAdminFilters =
    adminSearch.trim() !== '' ||
    debouncedAdminSearch.trim() !== '' ||
    adminSizeFilter !== 'ALL' ||
    adminStatusFilter !== 'ALL' ||
    adminSortBy !== 'FEATURED';

  const resetAdminFilters = useCallback(() => {
    setAdminSearch('');
    flushAdminSearchNow('');
    setAdminSizeFilter('ALL');
    setAdminStatusFilter('ALL');
    setAdminSortBy('FEATURED');
    setAdminClearSignal((prev) => prev + 1);
  }, [flushAdminSearchNow]);

  const openStockModal = (
    product: Product,
    defaultAction: 'ADD' | 'REMOVE' | 'ADJUST' = 'ADD'
  ) => {
    setStockModalProduct(product);
    setStockActionType(defaultAction);
    setStockAmount(
      defaultAction === 'ADJUST' ? String(product.stockQuantity) : '10'
    );
    setStockNote('');
    setActionError(null);
  };

  const handleConfirmStockModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalProduct) return;
    setActionError(null);

    const amt = Number(stockAmount);
    if (isNaN(amt) || amt < 0) {
      setActionError('Please enter a valid non-negative quantity.');
      return;
    }
    if (
      stockActionType === 'REMOVE' &&
      amt > stockModalProduct.stockQuantity
    ) {
      setActionError(
        `Cannot remove ${amt} units; only ${stockModalProduct.stockQuantity} in stock.`
      );
      return;
    }

    try {
      await onAdjustStock(
        stockModalProduct.id,
        stockActionType,
        Math.round(amt),
        stockNote.trim() || undefined
      );
      setStockModalProduct(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update stock');
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditSize(product.size);
    setEditPrice(String(product.price));
    setEditStock(String(product.stockQuantity));
    setEditStockNote('');
    setEditIsActive(product.isActive);
    setEditImage(product.imageUrl);
    setActionError(null);
  };

  const handleSaveEditModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const priceNum = Number(editPrice);
    const stockNum = Number(editStock);
    if (
      !editName.trim() ||
      !editImage.trim() ||
      isNaN(priceNum) ||
      priceNum <= 0 ||
      isNaN(stockNum) ||
      stockNum < 0
    ) {
      setActionError(t('validationAllFieldsReq'));
      return;
    }

    const targetId = editingProduct.id;
    const updatedName = editName.trim();
    const updatedSize = editSize;
    const updatedPrice = Math.round(priceNum);
    const updatedStock = Math.round(stockNum);

    // Close modal immediately for 0ms perceived latency
    setEditingProduct(null);
    triggerActionPopup({
      type: 'updated',
      title: 'Product & Stock Updated',
      subtitle: `${updatedName} (${updatedSize}) · ₹${updatedPrice.toLocaleString(
        'en-IN'
      )} · Stock: ${updatedStock}`,
    });

    try {
      await onUpdateProduct(targetId, {
        name: updatedName,
        size: updatedSize,
        price: updatedPrice,
        stockQuantity: updatedStock,
        stockNote: editStockNote.trim() || 'Quick Edit Product & Stock',
        isActive: editIsActive,
        imageUrl: editImage,
      });
    } catch (err: any) {
      setActionError(err.message || 'Failed to update product');
    }
  };

  const handleQuickDeleteProduct = (product: Product) => {
    setDeletingProductId(product.id);
    // Show immediate notification pop-up with quick effect + Undo option
    triggerActionPopup({
      type: 'deleted',
      title: 'Product Deleted',
      subtitle: `${product.name} (${product.size}) removed from inventory`,
      productSnapshot: product,
    });

    // Brief 110ms visual shrink/flash effect before removing row
    window.setTimeout(() => {
      setDeletingProductId((prev) => (prev === product.id ? null : prev));
      void onDeleteProduct(product.id);
    }, 110);
  };

  const handleUndoDelete = async (snapshot: Product) => {
    setActionPopup(null);
    triggerActionPopup({
      type: 'restored',
      title: 'Product Restored',
      subtitle: `${snapshot.name} (${snapshot.size}) restored to inventory`,
    });
    await onCreateProduct({
      name: snapshot.name,
      size: snapshot.size,
      imageUrl: snapshot.imageUrl,
      price: snapshot.price,
      stockQuantity: snapshot.stockQuantity,
      note: 'Restored after quick delete',
    });
  };

  const handleSaveAddModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    const priceNum = Number(addPrice);
    const stockNum = Number(addStock);
    if (
      !addName.trim() ||
      !addSize.trim() ||
      !addImage.trim() ||
      isNaN(priceNum) ||
      priceNum <= 0 ||
      isNaN(stockNum) ||
      stockNum < 0
    ) {
      setActionError(t('validationAllFieldsReq'));
      return;
    }

    try {
      await onCreateProduct({
        name: addName.trim(),
        size: addSize,
        imageUrl: addImage,
        price: Math.round(priceNum),
        stockQuantity: Math.round(stockNum),
        note: 'Added via Admin Product Modal',
      });
      setIsAddModalOpen(false);
      setAddName('');
      setAddPrice('');
      setAddStock('');
      setAddImage('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to add product');
    }
  };

  const handleSaveBusinessSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaved(false);
    await onUpdateSettings({
      businessName: bizName.trim() || 'SONU DIESEL BHATTI',
      whatsappNumber: waNumber.replace(/[^0-9]/g, '') || '919876543210',
      lowStockThreshold: Math.max(1, Number(lowThreshold) || 10),
      defaultLanguage: defLang,
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Top Bar Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <span>{t('activeAdminLabel')}</span>
            <span className="font-semibold text-zinc-900">
              {currentAdmin.name} ({currentAdmin.email})
            </span>
            <span aria-hidden="true">·</span>
            <span>{t('sharedDbNotice')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            {t('dashboardTitle')}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {offlineQueue.length > 0 && (
            <button
              type="button"
              onClick={onSyncNow}
              disabled={!isOnline || isSyncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#00C1FD] text-zinc-950 font-extrabold text-xs hover:bg-[#00b0e6] disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
              />
              <span>
                {offlineQueue.length} {t('pendingSyncCount')} ·{' '}
                {t('syncNowBtn')}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#00C1FD]" />
            <span>{t('addProductBtn')}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-700 text-xs font-semibold hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('logoutBtn')}</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
            <span>{t('totalProductsMetric')}</span>
            <Package className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-zinc-900">
            {totalProducts}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
            <span>{t('totalStockMetric')}</span>
            <Layers className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-zinc-900">
            {totalStock.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
            <span>{t('lowStockMetric')}</span>
            <AlertTriangle
              className={`w-4 h-4 ${
                lowStockProducts.length > 0 ? 'text-[#00C1FD]' : 'text-zinc-400'
              }`}
            />
          </div>
          <div
            className={`text-2xl font-extrabold font-mono tabular-nums ${
              lowStockProducts.length > 0 ? 'text-[#00C1FD]' : 'text-zinc-900'
            }`}
          >
            {lowStockProducts.length}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
            <span>{t('recentUpdatesMetric')}</span>
            <History className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-zinc-900">
            {movements.length}
          </div>
        </div>
      </div>

      {/* Low Stock Alert Strip (if any) */}
      {lowStockProducts.length > 0 && (
        <div className="bg-[#00C1FD]/10 border border-[#00C1FD]/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 text-xs text-zinc-900">
            <AlertTriangle className="w-4 h-4 text-[#00C1FD] shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold">{t('lowStockLabel')}: </span>
              <span>
                {lowStockProducts
                  .map(
                    (p) =>
                      `${p.name} (${p.size}: ${p.stockQuantity} ${t(
                        'unitsInStock'
                      )})`
                  )
                  .join(' · ')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-200/70 rounded-xl w-fit">
        {(
          [
            { id: 'inventory', label: t('tabInventory') },
            { id: 'showcase', label: t('tabShowcaseCards') },
            { id: 'smart_entry', label: t('tabSmartEntry') },
            { id: 'history', label: t('tabHistory') },
            { id: 'settings', label: t('tabSettings') },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* =================================================================== */}
      {/* TAB 1 & TAB 2: INVENTORY TABLE OR SEQUENTIAL SHOWCASE CARDS         */}
      {/* =================================================================== */}
      {(activeTab === 'inventory' || activeTab === 'showcase') && (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            {/* Shared Admin Search, Filter & Sort Toolbar */}
            <div className="p-4 border-b border-zinc-200 bg-stone-50/70 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search Box with Debounce Indicator */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full pl-9 pr-14 py-2 rounded-lg border border-zinc-300 bg-white text-xs sm:text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {isAdminSearchDebouncing && (
                    <RefreshCw
                      className="w-3.5 h-3.5 text-amber-600 animate-spin"
                      aria-label="Updating search results"
                    />
                  )}
                  {adminSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdminSearch('');
                        flushAdminSearchNow('');
                      }}
                      className="text-zinc-400 hover:text-zinc-700 cursor-pointer p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sort, Status & Clear All Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={adminStatusFilter}
                  onChange={(e) =>
                    setAdminStatusFilter(e.target.value as any)
                  }
                  className="px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs font-semibold text-zinc-800 cursor-pointer"
                >
                  <option value="ALL">{t('filterStockAll')}</option>
                  <option value="ACTIVE">{t('statusActive')}</option>
                  <option value="ARCHIVED">{t('statusArchived')}</option>
                  <option value="LOW_STOCK">{t('filterLowStock')}</option>
                </select>

                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <select
                    value={adminSortBy}
                    onChange={(e) => setAdminSortBy(e.target.value as any)}
                    className="bg-transparent font-semibold text-zinc-800 focus:outline-none cursor-pointer"
                  >
                    <option value="FEATURED">{t('sortSequentialAsc')}</option>
                    <option value="PRICE_ASC">{t('sortPriceAsc')}</option>
                    <option value="PRICE_DESC">{t('sortPriceDesc')}</option>
                    <option value="STOCK_DESC">{t('sortStockDesc')}</option>
                    <option value="NAME_ASC">{t('sortNameAsc')}</option>
                  </select>
                </div>

                <button
                  type="button"
                  disabled={!hasActiveAdminFilters}
                  onClick={resetAdminFilters}
                  className={`px-3 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
                    hasActiveAdminFilters
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-stone-100 text-zinc-400 border-zinc-200 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('clearAllBtn')}</span>
                </button>
              </div>
            </div>

            {/* Size Filter Row + Matching Count */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-1 bg-stone-200/80 p-1 rounded-lg">
                {[
                  { value: 'ALL', label: t('filterAllSizes') },
                  { value: 'Small', label: t('sizeSmall') },
                  { value: 'Medium', label: t('sizeMedium') },
                  { value: 'Large', label: t('sizeLarge') },
                  { value: 'Extra Large', label: t('sizeExtraLarge') },
                ].map((sz) => (
                  <button
                    key={sz.value}
                    type="button"
                    onClick={() => setAdminSizeFilter(sz.value)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      adminSizeFilter === sz.value
                        ? 'bg-white text-zinc-900 shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono tabular-nums text-zinc-500">
                  {filteredAdminProducts.length} / {products.length}{' '}
                  {t('showingResults')}
                </span>
                {hasActiveAdminFilters && (
                  <button
                    type="button"
                    onClick={resetAdminFilters}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('clearAllBtn')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {activeTab === 'inventory' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-stone-50 text-[11px] font-semibold text-zinc-500">
                  <th className="py-3 px-4">{t('productCol')}</th>
                  <th className="py-3 px-4">{t('sizeCol')}</th>
                  <th className="py-3 px-4 text-right">{t('priceCol')}</th>
                  <th className="py-3 px-4 text-right">
                    {t('stockAvailable')}
                  </th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-sm">
                {filteredAdminProducts.map((product) => {
                  const isLow =
                    product.stockQuantity <=
                    (settings.lowStockThreshold || 10);
                  const isBeingDeleted = deletingProductId === product.id;
                  return (
                    <tr
                      key={product.id}
                      className={`transition-all duration-150 ${
                        isBeingDeleted
                          ? 'bg-red-100/90 scale-[0.98] opacity-0 -translate-x-4'
                          : !product.isActive
                          ? 'opacity-60 bg-stone-50/40 hover:bg-stone-50/80'
                          : 'hover:bg-stone-50/80'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => setZoomedAdminProduct(product)}
                            className="group relative w-14 h-12 rounded-lg overflow-hidden border border-zinc-200 shrink-0 bg-stone-100 cursor-pointer shadow-2xs"
                            title={t('zoomPhotoBtn')}
                          >
                            <ProductImage
                              src={product.imageUrl}
                              alt={product.name}
                              sizeLabel={product.size}
                              enableHoverEffect={true}
                            />
                            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900">
                              {product.name}
                            </div>
                            <div className="text-xs text-zinc-500 font-mono">
                              ID #{product.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-zinc-700 whitespace-nowrap">
                        {translateSize(product.size)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-zinc-900 whitespace-nowrap">
                        ₹{product.price.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          title="Click to quickly edit stock & product"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-zinc-200/80 transition-colors cursor-pointer"
                        >
                          <span
                            className={`font-extrabold ${
                              product.stockQuantity === 0
                                ? 'text-red-600'
                                : isLow
                                ? 'text-amber-700'
                                : 'text-zinc-900'
                            }`}
                          >
                            {product.stockQuantity}
                          </span>
                          <span className="text-xs text-zinc-500">units</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-zinc-600 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold ${
                            product.isActive
                              ? 'text-emerald-700'
                              : 'text-zinc-500'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              product.isActive
                                ? 'bg-emerald-500'
                                : 'bg-zinc-400'
                            }`}
                          />
                          {product.isActive
                            ? t('statusActive')
                            : t('statusArchived')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {/* Strictly ONLY fast Edit and Delete buttons */}
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(product)}
                            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all duration-100 cursor-pointer"
                            title={t('editProductBtn')}
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickDeleteProduct(product)}
                            className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 active:scale-95 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all duration-100 cursor-pointer"
                            title={t('deleteProductBtn')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
          </div>

          {activeTab === 'showcase' && (
            <SequentialShowcaseCards
              products={filteredAdminProducts}
              lowStockThreshold={settings.lowStockThreshold || 10}
              onInspectProduct={(p) => setZoomedAdminProduct(p)}
              hasActiveExternalFilters={hasActiveAdminFilters}
              onClearAllFilters={resetAdminFilters}
              clearSignal={adminClearSignal}
              isAdminMode={true}
              onAdminEdit={(p) => openEditModal(p)}
              onAdminDelete={(p) => handleQuickDeleteProduct(p)}
            />
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: SMART ENTRY (VOICE, OCR, MANUAL FORM)                        */}
      {/* =================================================================== */}
      {activeTab === 'smart_entry' && (
        <AdminSmartEntry
          products={products}
          authToken={authToken}
          isOnline={isOnline}
          onCreateProduct={async (data) => {
            await onCreateProduct(data);
          }}
          onUpdateProduct={async (id, data) => {
            await onUpdateProduct(id, data);
          }}
          onAdjustStock={async (id, type, amount, note) => {
            await onAdjustStock(id, type, amount, note);
          }}
        />
      )}

      {/* =================================================================== */}
      {/* TAB 3: STOCK MOVEMENT HISTORY LOG                                   */}
      {/* =================================================================== */}
      {activeTab === 'history' && (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-stone-50 text-[11px] font-semibold text-zinc-500">
                  <th className="py-3 px-4">{t('receiptDate')}</th>
                  <th className="py-3 px-4">{t('productCol')}</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4 text-right">{t('previousQty')}</th>
                  <th className="py-3 px-4 text-right">{t('changeQty')}</th>
                  <th className="py-3 px-4 text-right">{t('newQty')}</th>
                  <th className="py-3 px-4">{t('updatedBy')}</th>
                  <th className="py-3 px-4">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-xs">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-stone-50/70">
                    <td className="py-3 px-4 font-mono tabular-nums text-zinc-500 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-900">
                      {m.productName}{' '}
                      <span className="text-zinc-500 font-normal">
                        ({m.productSize})
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-zinc-700 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        {m.changeAmount > 0 ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                        ) : m.changeAmount < 0 ? (
                          <ArrowDownRight className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                        {m.actionType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-zinc-600">
                      {m.previousQuantity}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono tabular-nums font-bold ${
                        m.changeAmount > 0
                          ? 'text-emerald-700'
                          : m.changeAmount < 0
                          ? 'text-red-600'
                          : 'text-zinc-500'
                      }`}
                    >
                      {m.changeAmount > 0
                        ? `+${m.changeAmount}`
                        : m.changeAmount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-extrabold text-zinc-900">
                      {m.newQuantity}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-600">
                      {m.adminId}
                    </td>
                    <td className="py-3 px-4 text-zinc-500">
                      {m.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: BUSINESS & WHATSAPP SETTINGS + TWO-ADMIN ACCOUNTS            */}
      {/* =================================================================== */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleSaveBusinessSettings}
            className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-200">
              <Settings className="w-4 h-4 text-amber-600" />
              <h3 className="text-base font-bold text-zinc-900">
                {t('settingsTitle')}
              </h3>
            </div>

            {settingsSaved && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                {t('settingsSavedMsg')}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                {t('businessNameInput')}
              </label>
              <input
                type="text"
                required
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                {t('whatsappNumberInput')}
              </label>
              <input
                type="text"
                required
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value)}
                placeholder="919876543210"
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm font-mono tabular-nums text-zinc-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  {t('lowStockInput')}
                </label>
                <input
                  type="number"
                  min={1}
                  value={lowThreshold}
                  onChange={(e) => setLowThreshold(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm font-mono tabular-nums text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  {t('defaultLangInput')}
                </label>
                <select
                  value={defLang}
                  onChange={(e) => setDefLang(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm bg-white text-zinc-900"
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer"
            >
              {t('saveSettingsBtn')}
            </button>
          </form>

          {/* Two Pre-Authorized Admin Accounts Management */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-200">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <h3 className="text-base font-bold text-zinc-900">
                {t('coAdminsSectionTitle')}
              </h3>
            </div>

            {adminSavedBanner && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                {adminSavedBanner}
              </div>
            )}

            <div className="space-y-3">
              {admins.map((adm, index) => (
                <div
                  key={adm.id}
                  className="p-4 rounded-xl border border-zinc-200 bg-stone-50/60 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono text-zinc-500 block">
                        Authorized Administrator #{index + 1} · Equal Permissions
                      </span>
                      <h4 className="text-sm font-bold text-zinc-900">
                        {adm.name}
                      </h4>
                      <p className="text-xs font-mono text-zinc-600">
                        {adm.email}
                      </p>
                    </div>
                    {editingAdminId !== adm.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAdminId(adm.id);
                          setAdminEditName(adm.name);
                          setAdminEditEmail(adm.email);
                          setAdminEditPassword('');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white text-xs font-semibold text-zinc-700 hover:bg-stone-100 cursor-pointer"
                      >
                        {t('editProductBtn')}
                      </button>
                    )}
                  </div>

                  {editingAdminId === adm.id && (
                    <div className="pt-2 border-t border-zinc-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          value={adminEditName}
                          onChange={(e) => setAdminEditName(e.target.value)}
                          placeholder="Admin Name"
                          className="px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs"
                        />
                        <input
                          type="email"
                          value={adminEditEmail}
                          onChange={(e) => setAdminEditEmail(e.target.value)}
                          placeholder="Admin Email"
                          className="px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs font-mono"
                        />
                      </div>
                      <input
                        type="password"
                        value={adminEditPassword}
                        onChange={(e) => setAdminEditPassword(e.target.value)}
                        placeholder="New Password (leave blank to keep current)"
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await onUpdateAdminProfile(
                              adm.id,
                              adminEditEmail,
                              adminEditName,
                              adminEditPassword || undefined
                            );
                            setEditingAdminId(null);
                            setAdminSavedBanner(
                              `Updated Administrator #${index + 1} (${adminEditEmail})`
                            );
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-bold cursor-pointer"
                        >
                          Save Admin
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAdminId(null)}
                          className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-600 cursor-pointer"
                        >
                          {t('cancelBtn')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: EXPLICIT STOCK ADJUSTMENT (ADD / REMOVE / ADJUST)            */}
      {/* =================================================================== */}
      {stockModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white border border-zinc-200 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {t('updateStockBtn')}: {stockModalProduct.name}
                </h3>
                <p className="text-xs text-zinc-500">
                  {stockModalProduct.size} · Current Stock:{' '}
                  <span className="font-mono font-bold text-zinc-900">
                    {stockModalProduct.stockQuantity}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStockModalProduct(null)}
                className="p-1 text-zinc-400 hover:text-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {actionError}
              </div>
            )}

            <form onSubmit={handleConfirmStockModal} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'ADD', label: t('stockActionAdd') },
                    { id: 'REMOVE', label: t('stockActionRemove') },
                    { id: 'ADJUST', label: t('stockActionAdjust') },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setStockActionType(mode.id)}
                    className={`py-2 px-2 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                      stockActionType === mode.id
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-stone-50 text-zinc-700 border-zinc-200 hover:bg-stone-100'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  {t('stockAmountLabel')}
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={stockAmount}
                  onChange={(e) => setStockAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm font-mono tabular-nums text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  {t('stockNoteLabel')}
                </label>
                <input
                  type="text"
                  value={stockNote}
                  onChange={(e) => setStockNote(e.target.value)}
                  placeholder="e.g. Workshop morning batch / Dispatch adjustment"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm text-zinc-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStockModalProduct(null)}
                  className="px-4 py-2 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-700 cursor-pointer"
                >
                  {t('cancelBtn')}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('stockSaveBtn')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: UNIFIED FAST EDIT PRODUCT DETAILS, STOCK & PHOTOGRAPH        */}
      {/* =================================================================== */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl bg-white border border-zinc-200 p-6 shadow-xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {t('editProductBtn')}: {editingProduct.name}
                </h3>
                <p className="text-xs text-zinc-500">
                  Fast-update product details, price, photo, and available stock in one step.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 text-zinc-400 hover:text-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {actionError}
              </div>
            )}

            <form onSubmit={handleSaveEditModal} className="space-y-4">
              <ImageUploaderField
                label={`${t('productImageLabel')} *`}
                imageUrl={editImage}
                sizeLabel={editSize}
                onChange={(newUrl) => {
                  setEditImage(newUrl);
                  setActionError(null);
                }}
              />

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  {t('productNameLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm text-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {t('productSizeLabel')}
                  </label>
                  <select
                    value={editSize}
                    onChange={(e) => setEditSize(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm bg-white text-zinc-900"
                  >
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                    <option value="Extra Large">Extra Large</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {t('productPriceLabel')} (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm font-mono tabular-nums text-zinc-900"
                  />
                </div>
              </div>

              {/* Fast Stock Quantity Control inside Edit Modal */}
              <div className="p-3.5 rounded-xl bg-stone-50 border border-zinc-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-800">
                    {t('stockAvailable')} (Current: {editingProduct.stockQuantity})
                  </label>
                  <div className="flex items-center gap-1">
                    {[-10, -5, -1, 1, 5, 10].map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() =>
                          setEditStock((prev) =>
                            String(Math.max(0, (Number(prev) || 0) + delta))
                          )
                        }
                        className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold border transition-transform active:scale-95 cursor-pointer ${
                          delta > 0
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-stone-200/70 hover:bg-stone-300/70 text-zinc-700 border-zinc-300'
                        }`}
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setEditStock((prev) =>
                          String(Math.max(0, (Number(prev) || 0) - 1))
                        )
                      }
                      className="w-9 h-9 rounded-lg border border-zinc-300 bg-white hover:bg-stone-100 flex items-center justify-center text-zinc-700 cursor-pointer shrink-0"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      required
                      min={0}
                      value={editStock}
                      onChange={(e) => setEditStock(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm font-mono tabular-nums font-bold text-center text-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setEditStock((prev) =>
                          String(Math.max(0, (Number(prev) || 0) + 1))
                        )
                      }
                      className="w-9 h-9 rounded-lg bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-white cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={editStockNote}
                    onChange={(e) => setEditStockNote(e.target.value)}
                    placeholder="Optional stock note..."
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-800"
                  />
                </div>
              </div>

              {/* Public Catalogue Visibility Toggle */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-stone-50 border border-zinc-200">
                <span className="text-xs font-semibold text-zinc-700">
                  Catalogue Visibility Status
                </span>
                <button
                  type="button"
                  onClick={() => setEditIsActive((prev) => !prev)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    editIsActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-300 text-zinc-800'
                  }`}
                >
                  {editIsActive ? t('statusActive') : t('statusArchived')}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => {
                    const prodToDelete = editingProduct;
                    setEditingProduct(null);
                    handleQuickDeleteProduct(prodToDelete);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Product</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-4 py-2 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-700 cursor-pointer"
                  >
                    {t('cancelBtn')}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer"
                  >
                    {t('saveProductBtn')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADD NEW PRODUCT WITH IMAGE UPLOAD                            */}
      {/* =================================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-xl bg-white border border-zinc-200 p-6 shadow-xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {t('addProductBtn')}
                </h3>
                <p className="text-xs text-zinc-500">
                  Upload a product photograph (Camera or Gallery) and enter product details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {actionError}
              </div>
            )}

            <form onSubmit={handleSaveAddModal} className="space-y-4">
              <ImageUploaderField
                label={`1. ${t('productImageLabel')} *`}
                imageUrl={addImage}
                sizeLabel={addSize}
                onChange={(newUrl) => {
                  setAddImage(newUrl);
                  setActionError(null);
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    2. {t('productNameLabel')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Diesel Bhatti — Heavy Duty"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm text-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    3. {t('productSizeLabel')} *
                  </label>
                  <select
                    value={addSize}
                    onChange={(e) => setAddSize(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm bg-white text-zinc-900"
                  >
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                    <option value="Extra Large">Extra Large</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    4. {t('productPriceLabel')} *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={addPrice}
                    onChange={(e) => setAddPrice(e.target.value)}
                    placeholder="2500"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm font-mono tabular-nums text-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    5. {t('productStockLabel')} *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={addStock}
                    onChange={(e) => setAddStock(e.target.value)}
                    placeholder="50"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm font-mono tabular-nums text-zinc-900"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setActiveTab('smart_entry');
                  }}
                  className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
                >
                  Or use Voice / OCR Scanner →
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-700 cursor-pointer"
                  >
                    {t('cancelBtn')}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer"
                  >
                    {t('saveProductBtn')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADMIN ATTACHED PRODUCT PHOTO INSPECTOR                       */}
      {/* =================================================================== */}
      {zoomedAdminProduct && (
        <div
          onClick={() => setZoomedAdminProduct(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl w-full rounded-xl bg-zinc-900 text-white border border-zinc-700 overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-bold">{zoomedAdminProduct.name}</h3>
                <p className="text-xs text-zinc-400">
                  {translateSize(zoomedAdminProduct.size)} · ₹
                  {zoomedAdminProduct.price.toLocaleString('en-IN')} · Stock:{' '}
                  {zoomedAdminProduct.stockQuantity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const prod = zoomedAdminProduct;
                    setZoomedAdminProduct(null);
                    openEditModal(prod);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
                >
                  {t('replaceImageBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => setZoomedAdminProduct(null)}
                  className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="aspect-[4/3] bg-black">
              <ProductImage
                src={zoomedAdminProduct.imageUrl}
                alt={zoomedAdminProduct.name}
                sizeLabel={zoomedAdminProduct.size}
              />
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* FLOATING ANIMATED NOTIFICATION POP-UP (DELETE / EDIT / RESTORE)     */}
      {/* =================================================================== */}
      <AnimatePresence>
        {actionPopup && (
          <motion.div
            key={actionPopup.id}
            initial={{ opacity: 0, y: 28, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.94 }}
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 26,
            }}
            className="fixed bottom-5 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-md rounded-2xl bg-zinc-950 text-white border border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.45)] overflow-hidden"
          >
            <div className="p-4 flex items-center gap-3.5">
              {/* Animated Icon or Product Thumbnail */}
              <div className="relative shrink-0">
                {actionPopup.productSnapshot ? (
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900">
                    <ProductImage
                      src={actionPopup.productSnapshot.imageUrl}
                      alt={actionPopup.productSnapshot.name}
                      sizeLabel={actionPopup.productSnapshot.size}
                    />
                  </div>
                ) : null}
                <motion.div
                  initial={{ scale: 0.4, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  className={`flex items-center justify-center rounded-full shadow-md ${
                    actionPopup.productSnapshot
                      ? 'absolute -bottom-1 -right-1 w-6 h-6 border-2 border-zinc-950'
                      : 'w-10 h-10'
                  } ${
                    actionPopup.type === 'deleted'
                      ? 'bg-red-600 text-white'
                      : 'bg-emerald-500 text-zinc-950'
                  }`}
                >
                  {actionPopup.type === 'deleted' ? (
                    <Trash2
                      className={
                        actionPopup.productSnapshot ? 'w-3 h-3' : 'w-5 h-5'
                      }
                    />
                  ) : (
                    <CheckCircle2
                      className={
                        actionPopup.productSnapshot ? 'w-3.5 h-3.5' : 'w-5 h-5'
                      }
                    />
                  )}
                </motion.div>
              </div>

              {/* Notification Copy */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-extrabold tracking-wide uppercase ${
                      actionPopup.type === 'deleted'
                        ? 'text-red-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {actionPopup.title}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 truncate mt-0.5">
                  {actionPopup.subtitle}
                </p>
              </div>

              {/* Quick Undo Button when Deleted */}
              {actionPopup.type === 'deleted' &&
                actionPopup.productSnapshot && (
                  <button
                    type="button"
                    onClick={() =>
                      handleUndoDelete(actionPopup.productSnapshot!)
                    }
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 text-xs font-extrabold inline-flex items-center gap-1 transition-all cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Undo</span>
                  </button>
                )}

              <button
                type="button"
                onClick={() => setActionPopup(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Animated 4.2s Countdown Progress Strip */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 4.2, ease: 'linear' }}
              className={`h-1 ${
                actionPopup.type === 'deleted'
                  ? 'bg-red-500'
                  : 'bg-emerald-500'
              }`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

