import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Maximize2,
  LayoutGrid,
  Layers,
  Edit3,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { CartItem, Product } from '../types.ts';
import { useTranslation } from '../i18n/LanguageContext.tsx';
import { ProductImage } from './ProductImage.tsx';

interface SequentialShowcaseCardsProps {
  products: Product[];
  cart?: CartItem[];
  lowStockThreshold?: number;
  gridCols?: 'auto' | 2 | 3 | 4;
  onAddToCart?: (product: Product) => void;
  onUpdateCartQty?: (productId: number, newQty: number) => void;
  onInspectProduct: (product: Product) => void;
  hasActiveExternalFilters?: boolean;
  onClearAllFilters?: () => void;
  clearSignal?: number;
  // Optional Admin actions when used inside Admin Dashboard
  isAdminMode?: boolean;
  onAdminEdit?: (product: Product) => void;
  onAdminDelete?: (product: Product) => void;
}

const FAVORITES_STORAGE_KEY = 'sdb_showcase_favorites_v1';

/**
 * Custom SVG matching the exact Shopping Bag with Up-Arrow icon from `product card ui.jpeg`
 */
function BagAddUpIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Bag handle */}
      <path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
      {/* Bag body with bottom-right opening for arrow */}
      <path d="M12.5 19H6.8a2 2 0 0 1-1.98-1.72l-1.1-8A2 2 0 0 1 5.7 7h12.6a2 2 0 0 1 1.98 2.28l-.48 3.47" />
      {/* Upward arrow on bottom-right */}
      <path d="M17.5 20v-6" />
      <path d="m15 16.5 2.5-2.5 2.5 2.5" />
    </svg>
  );
}

export const SequentialShowcaseCards: React.FC<
  SequentialShowcaseCardsProps
> = ({
  products,
  cart = [],
  lowStockThreshold = 10,
  gridCols = 'auto',
  onAddToCart,
  onUpdateCartQty,
  onInspectProduct,
  hasActiveExternalFilters = false,
  onClearAllFilters,
  clearSignal = 0,
  isAdminMode = false,
  onAdminEdit,
  onAdminDelete,
}) => {
  const { t, translateSize } = useTranslation();

  // Sequential display mode: 'grid' (all cards in sequential order) or 'spotlight' (1-by-1 sequential deck)
  const [displayLayout, setDisplayLayout] = useState<'grid' | 'spotlight'>(
    'grid'
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const [favoriteIds, setFavoriteIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (clearSignal > 0) {
      setOnlyFavorites(false);
      setActiveIndex(0);
    }
  }, [clearSignal]);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
    } catch {
      // ignore quota error
    }
  }, [favoriteIds]);

  const toggleFavorite = (productId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const displayedProducts = useMemo(
    () =>
      onlyFavorites
        ? products.filter((p) => favoriteIds.includes(p.id))
        : products,
    [onlyFavorites, products, favoriteIds]
  );

  const handleClearAllFromShowcase = () => {
    setOnlyFavorites(false);
    setActiveIndex(0);
    if (onClearAllFilters) {
      onClearAllFilters();
    }
  };

  useEffect(() => {
    if (activeIndex >= displayedProducts.length) {
      setActiveIndex(0);
    }
  }, [displayedProducts.length, activeIndex]);

  // Keyboard navigation in Spotlight mode
  useEffect(() => {
    if (displayLayout !== 'spotlight' || displayedProducts.length <= 1) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setActiveIndex((prev) => (prev + 1) % displayedProducts.length);
      } else if (e.key === 'ArrowLeft') {
        setActiveIndex(
          (prev) =>
            (prev - 1 + displayedProducts.length) % displayedProducts.length
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayLayout, displayedProducts.length]);

  const renderShowcaseCard = (
    product: Product,
    seqIndex: number,
    isSpotlight = false
  ) => {
    const seqNumber = String(seqIndex + 1).padStart(2, '0');
    const isFav = favoriteIds.includes(product.id);
    const cartEntry = cart.find((c) => c.product.id === product.id);
    const outOfStock = product.stockQuantity <= 0;
    const isLowStock =
      !outOfStock && product.stockQuantity <= lowStockThreshold;

    return (
      <motion.article
        layout
        key={product.id}
        onClick={() => onInspectProduct(product)}
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{
          duration: 0.2,
          delay: isSpotlight ? 0 : Math.min(seqIndex * 0.035, 0.25),
          ease: [0.16, 1, 0.3, 1],
        }}
        className={`group relative bg-[#222224] text-white rounded-[20px] sm:rounded-[28px] p-2 sm:p-3.5 flex flex-col justify-between shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)] hover:shadow-[0_26px_56px_-10px_rgba(0,0,0,0.38)] ring-1 ring-white/10 transition-all duration-200 hover:-translate-y-1 cursor-pointer select-none ${
          isSpotlight ? 'max-w-[360px] w-full mx-auto p-3.5 rounded-[28px]' : 'w-full'
        }`}
      >
        {/* 1. Top Inset Light Image Container (Matching product card ui.jpeg) */}
        <div className="relative aspect-square w-full rounded-[14px] sm:rounded-[20px] bg-[#EDEDED] overflow-hidden shadow-inner">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            sizeLabel={product.size}
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.06]"
            enableHoverEffect={true}
          />

          {/* Subtle Studio Vignette on Hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

          {/* Sequential Order Pill (#01, #02, #03...) */}
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-[#222224]/85 backdrop-blur-xs text-white font-mono tabular-nums text-[9px] sm:text-[11px] font-extrabold tracking-wider shadow-sm flex items-center gap-0.5">
            <span className="text-amber-400">#</span>
            <span>{seqNumber}</span>
          </div>

          {/* Top-Right Circular Dark Heart Button (Exact match to product card ui.jpeg) */}
          <button
            type="button"
            onClick={(e) => toggleFavorite(product.id, e)}
            aria-label="Save to favorites"
            className="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-[#222224] hover:bg-zinc-800 text-white flex items-center justify-center shadow-md transition-transform duration-150 hover:scale-105 active:scale-90 cursor-pointer"
          >
            <Heart
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
                isFav ? 'fill-rose-500 text-rose-500' : 'text-white'
              }`}
            />
          </button>

          {/* Bottom-Left Quick Zoom Trigger on Hover */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInspectProduct(product);
            }}
            className="hidden sm:flex absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-[#222224]/80 backdrop-blur-xs text-white text-[10px] font-semibold items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
          >
            <Maximize2 className="w-3 h-3 text-amber-400" />
            <span>{t('zoomPhotoBtn')}</span>
          </button>
        </div>

        {/* 2. Middle Title & Subtitle Section (Matching product card ui.jpeg) */}
        <div className="px-1 sm:px-2.5 pt-2.5 sm:pt-4 pb-1 sm:pb-2 space-y-0.5 sm:space-y-1">
          <h3
            title={product.name}
            className="text-xs sm:text-[17px] font-semibold text-white tracking-tight truncate leading-snug"
          >
            {product.name}
          </h3>
          <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs text-zinc-400 font-medium">
            <span className="truncate">{translateSize(product.size)}</span>
            <span
              className={`font-mono tabular-nums font-semibold shrink-0 ${
                outOfStock
                  ? 'text-rose-400'
                  : isLowStock
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {outOfStock ? t('outOfStock') : `${product.stockQuantity} in stock`}
            </span>
          </div>
        </div>

        {/* 3. Bottom Price & Squircle Action Button Row (Matching product card ui.jpeg) */}
        <div className="px-1 sm:px-2.5 pt-1.5 sm:pt-3 pb-1 flex items-center justify-between gap-1.5 sm:gap-3">
          {/* Bold White Price */}
          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-[26px] font-extrabold text-white font-mono tabular-nums tracking-tight leading-none truncate">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
            {cartEntry && !isAdminMode && (
              <span className="hidden sm:inline text-[11px] font-mono tabular-nums text-amber-400 font-semibold mt-1">
                {cartEntry.quantity} in cart · ₹
                {(cartEntry.quantity * product.price).toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Right Action Area */}
          {isAdminMode ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 sm:gap-2 shrink-0"
            >
              {onAdminEdit && (
                <button
                  type="button"
                  onClick={() => onAdminEdit(product)}
                  title={t('editProductBtn')}
                  className="px-2.5 sm:px-3.5 h-8 sm:h-10 rounded-[12px] sm:rounded-[14px] bg-[#EDEDED] hover:bg-white text-[#1E1E20] text-[11px] sm:text-xs font-extrabold inline-flex items-center gap-1 shadow-sm transition-transform duration-100 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 shrink-0" />
                  <span>Edit</span>
                </button>
              )}
              {onAdminDelete && (
                <button
                  type="button"
                  onClick={() => onAdminDelete(product)}
                  title={t('deleteProductBtn')}
                  className="px-2.5 sm:px-3.5 h-8 sm:h-10 rounded-[12px] sm:rounded-[14px] bg-red-600 hover:bg-red-500 text-white text-[11px] sm:text-xs font-extrabold inline-flex items-center gap-1 shadow-sm transition-transform duration-100 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          ) : (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 sm:gap-2 shrink-0"
            >
              {/* If already in cart, show compact - button */}
              {cartEntry && onUpdateCartQty && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateCartQty(product.id, cartEntry.quantity - 1)
                  }
                  aria-label="Decrease quantity"
                  className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center border border-zinc-700 transition-colors cursor-pointer"
                >
                  <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}

              {/* Signature Squircle Light Bag Button from product card ui.jpeg */}
              <button
                type="button"
                disabled={
                  outOfStock ||
                  Boolean(
                    cartEntry && cartEntry.quantity >= product.stockQuantity
                  )
                }
                onClick={() => onAddToCart && onAddToCart(product)}
                aria-label={t('addToCart')}
                className="relative w-9 h-9 sm:w-13 sm:h-13 rounded-[12px] sm:rounded-[18px] bg-[#EDEDED] hover:bg-white disabled:bg-zinc-700 disabled:text-zinc-500 text-[#1E1E20] flex items-center justify-center shadow-md transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <BagAddUpIcon className="w-4 h-4 sm:w-6 sm:h-6" />
                {cartEntry && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 sm:min-w-5 h-4 sm:h-5 px-1 rounded-full bg-amber-500 text-zinc-950 font-mono tabular-nums text-[9px] sm:text-[11px] font-extrabold flex items-center justify-center shadow-xs">
                    {cartEntry.quantity}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.article>
    );
  };

  return (
    <div className="space-y-6">
      {/* Sub-Toolbar: Sequential Order Indicator + Saved Filter + Grid vs Spotlight Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-900">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>{t('tabShowcaseCards')}</span>
          </span>
          <span className="text-zinc-300" aria-hidden="true">
            ·
          </span>
          <span className="text-xs font-mono tabular-nums text-zinc-500">
            #01 → #{String(displayedProducts.length).padStart(2, '0')}
          </span>

          {/* Saved Favorites Filter Toggle */}
          <button
            type="button"
            onClick={() => setOnlyFavorites((prev) => !prev)}
            className={`ml-1 px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
              onlyFavorites
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : 'bg-stone-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                onlyFavorites ? 'fill-rose-500 text-rose-500' : 'text-zinc-400'
              }`}
            />
            <span>
              {t('savedFavoritesOnly')} ({favoriteIds.length})
            </span>
          </button>

          {/* Convenience Clear All button inside Sequential Showcase sub-bar */}
          {(onlyFavorites || hasActiveExternalFilters) && (
            <button
              type="button"
              onClick={handleClearAllFromShowcase}
              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('clearAllBtn')}</span>
            </button>
          )}
        </div>

        {/* Switch between All Cards Sequential Grid & Single-Card Sequential Spotlight */}
        <div className="inline-flex items-center gap-1 p-1 bg-stone-100 rounded-lg border border-zinc-200">
          <button
            type="button"
            onClick={() => setDisplayLayout('grid')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              displayLayout === 'grid'
                ? 'bg-zinc-900 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{t('sequentialGridMode')}</span>
          </button>
          <button
            type="button"
            onClick={() => setDisplayLayout('spotlight')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              displayLayout === 'spotlight'
                ? 'bg-zinc-900 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('sequentialDeckMode')}</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {displayedProducts.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center space-y-3">
          <p className="text-base font-bold text-zinc-800">
            {onlyFavorites
              ? 'No saved favorite models match current filters. Tap Clear All to view all models.'
              : t('noProductsFound')}
          </p>
          <button
            type="button"
            onClick={handleClearAllFromShowcase}
            className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 cursor-pointer inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('clearAllBtn')}</span>
          </button>
        </div>
      ) : displayLayout === 'grid' ? (
        /* SEQUENTIAL GRID VIEW (#01, #02, #03...) WITH CONFIGURABLE COLUMNS (2, 3, or max 4 in a row) */
        <div
          className={`grid pt-2 pb-4 ${
            gridCols === 2
              ? 'grid-cols-2 gap-3 sm:gap-6'
              : gridCols === 3
              ? 'grid-cols-3 gap-2.5 sm:gap-5'
              : gridCols === 4
              ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5'
              : 'grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6'
          }`}
        >
          <AnimatePresence mode="popLayout">
            {displayedProducts.map((product, idx) =>
              renderShowcaseCard(product, idx, false)
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* SEQUENTIAL SPOTLIGHT DECK VIEW (Step 1-by-1 in order) */
        <div className="bg-stone-200/70 border border-stone-300/80 rounded-3xl p-6 sm:p-10 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-10">
            {/* Previous Sequential Button */}
            <button
              type="button"
              onClick={() =>
                setActiveIndex(
                  (prev) =>
                    (prev - 1 + displayedProducts.length) %
                    displayedProducts.length
                )
              }
              className="hidden sm:flex w-12 h-12 rounded-full bg-white hover:bg-zinc-900 text-zinc-800 hover:text-white border border-zinc-300 items-center justify-center shadow-sm transition-colors cursor-pointer shrink-0"
              aria-label={t('seqPrevBtn')}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Active Spotlight Card */}
            <div className="w-full max-w-[360px]">
              <AnimatePresence mode="wait">
                {displayedProducts[activeIndex] &&
                  renderShowcaseCard(
                    displayedProducts[activeIndex],
                    activeIndex,
                    true
                  )}
              </AnimatePresence>
            </div>

            {/* Next Sequential Button */}
            <button
              type="button"
              onClick={() =>
                setActiveIndex((prev) => (prev + 1) % displayedProducts.length)
              }
              className="hidden sm:flex w-12 h-12 rounded-full bg-white hover:bg-zinc-900 text-zinc-800 hover:text-white border border-zinc-300 items-center justify-center shadow-sm transition-colors cursor-pointer shrink-0"
              aria-label={t('seqNextBtn')}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Prev/Next + Sequential Stepper Strip */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setActiveIndex(
                    (prev) =>
                      (prev - 1 + displayedProducts.length) %
                      displayedProducts.length
                  )
                }
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-900 text-zinc-900 hover:text-white border border-zinc-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{t('seqPrevBtn')}</span>
              </button>

              <span className="px-3.5 py-1.5 rounded-xl bg-zinc-900 text-white font-mono tabular-nums text-xs font-bold">
                #{String(activeIndex + 1).padStart(2, '0')} / #
                {String(displayedProducts.length).padStart(2, '0')}
              </span>

              <button
                type="button"
                onClick={() =>
                  setActiveIndex(
                    (prev) => (prev + 1) % displayedProducts.length
                  )
                }
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-900 text-zinc-900 hover:text-white border border-zinc-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <span>{t('seqNextBtn')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Sequential Number Pills Bar */}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {displayedProducts.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`px-2.5 py-1 rounded-lg font-mono tabular-nums text-xs font-bold transition-all cursor-pointer ${
                    idx === activeIndex
                      ? 'bg-zinc-900 text-amber-400 scale-105 shadow-xs'
                      : 'bg-white/80 text-zinc-600 hover:bg-white hover:text-zinc-900 border border-zinc-200'
                  }`}
                >
                  #{String(idx + 1).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
