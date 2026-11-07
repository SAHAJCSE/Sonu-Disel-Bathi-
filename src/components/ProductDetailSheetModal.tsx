import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Phone,
  MessageCircle,
  MessageSquareText,
  Star,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Plus,
  Minus,
  ShoppingBag,
  Video,
} from 'lucide-react';
import { BusinessSettings, CartItem, Product } from '../types.ts';
import { useTranslation } from '../i18n/LanguageContext.tsx';
import { ProductImage } from './ProductImage.tsx';

interface ProductDetailSheetModalProps {
  product: Product | null;
  allProducts: Product[];
  cart: CartItem[];
  settings: BusinessSettings;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onUpdateCartQty: (productId: number, newQty: number) => void;
  onOpenCartReceipt: () => void;
}

function getDimensionsBySize(size: string): string {
  const normalized = size.toLowerCase();
  if (normalized.includes('small')) return '10x24 inch (Compact)';
  if (normalized.includes('extra') || normalized.includes('xl'))
    return '24x60 inch (Jumbo)';
  if (normalized.includes('large')) return '18x42 inch (Heavy)';
  return '12x36 inch (Standard)';
}

function getBurnerConfig(name: string, size: string): string {
  const lower = `${name} ${size}`.toLowerCase();
  if (lower.includes('double') || lower.includes('jumbo')) {
    return 'Two Burner Diesel Bhatti';
  }
  if (lower.includes('dual')) {
    return 'Dual-Valve High-Pressure Burner';
  }
  return 'Single High-Flame Commercial Burner';
}

function getReviewCount(productId: number): { rating: string; count: number } {
  const counts = [61, 84, 49, 73, 58, 92];
  const ratings = ['4.5', '4.7', '4.6', '4.8', '4.5', '4.9'];
  const idx = Math.abs(productId - 1) % counts.length;
  return { rating: ratings[idx], count: counts[idx] };
}

export const ProductDetailSheetModal: React.FC<
  ProductDetailSheetModalProps
> = ({
  product,
  allProducts,
  cart,
  settings,
  onClose,
  onSelectProduct,
  onAddToCart,
  onUpdateCartQty,
  onOpenCartReceipt,
}) => {
  const { t, translateSize } = useTranslation();
  const [zoomLevel, setZoomLevel] = useState<1 | 1.75 | 2.5>(1);
  const [showMoreSpecs, setShowMoreSpecs] = useState(false);

  if (!product) return null;

  const currentIndex = allProducts.findIndex((p) => p.id === product.id);
  const cartEntry = cart.find((c) => c.product.id === product.id);
  const outOfStock = product.stockQuantity <= 0;
  const cleanPhone = (settings.whatsappNumber || '919876543210').replace(
    /[^0-9]/g,
    ''
  );
  const { rating, count } = getReviewCount(product.id);

  const buildDirectWhatsAppUrl = (mode: 'inquiry' | 'best_price') => {
    const qty = cartEntry ? cartEntry.quantity : 1;
    const prefix =
      mode === 'best_price'
        ? `Hello *${
            settings.businessName || 'SONU DIESEL BHATTI'
          }*, please share the *Best Price* & availability for:`
        : `Hello *${
            settings.businessName || 'SONU DIESEL BHATTI'
          }*, I am interested in ordering:`;

    const lines = [
      prefix,
      `• *Product:* ${product.name}`,
      `• *Size:* ${product.size} (${getDimensionsBySize(product.size)})`,
      `• *Listed Price:* ₹${product.price.toLocaleString('en-IN')}`,
      `• *Required Qty:* ${qty} unit(s)`,
    ];
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
      lines.join('\n')
    )}`;
  };

  const handlePrev = () => {
    if (allProducts.length <= 1) return;
    const prevIdx =
      currentIndex <= 0 ? allProducts.length - 1 : currentIndex - 1;
    setZoomLevel(1);
    onSelectProduct(allProducts[prevIdx]);
  };

  const handleNext = () => {
    if (allProducts.length <= 1) return;
    const nextIdx =
      currentIndex >= allProducts.length - 1 ? 0 : currentIndex + 1;
    setZoomLevel(1);
    onSelectProduct(allProducts[nextIdx]);
  };

  const primarySpecs: Array<{
    label: string;
    value: string;
    highlight?: string;
  }> = [
    {
      label: 'No Of Burners',
      value: getBurnerConfig(product.name, product.size),
    },
    {
      label: 'Grade',
      value: 'SS202 / Heavy-Gauge Steel',
    },
    {
      label: 'Usage/Application',
      value: 'Commercial Kitchen / Halwai / Catering',
    },
    {
      label: 'Size',
      value: `${translateSize(product.size)} (${getDimensionsBySize(
        product.size
      )})`,
    },
    {
      label: 'Color',
      value: 'Silver / Industrial Steel Finish',
    },
    {
      label: 'Availability',
      value: outOfStock
        ? t('outOfStock')
        : `In Stock (${product.stockQuantity} Units)`,
      highlight: outOfStock ? 'text-red-600' : 'text-emerald-700 font-semibold',
    },
  ];

  const extraSpecs: Array<{
    label: string;
    value: string;
    highlight?: string;
  }> = [
    {
      label: 'Fuel Type',
      value: 'Pressurized Diesel / Kerosene Burner',
    },
    {
      label: 'Unit Price',
      value: `₹ ${product.price.toLocaleString('en-IN')}`,
    },
    {
      label: 'Workshop Code',
      value: `#SDB-${String(product.id).padStart(2, '0')}`,
    },
  ];

  const visibleSpecs = showMoreSpecs
    ? [...primarySpecs, ...extraSpecs]
    : primarySpecs;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16 }}
        onClick={() => {
          setZoomLevel(1);
          onClose();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl bg-[#222224] text-white rounded-[24px] sm:rounded-[28px] overflow-hidden border border-zinc-700/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col max-h-[94vh] my-auto ring-1 ring-white/10"
        >
          {/* Top Utility Bar (Black & White Theme) */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-[#18181A] border-b border-zinc-800 text-white shrink-0">
            <div className="flex items-center gap-2.5 text-xs font-bold tracking-wide">
              <span className="text-white font-extrabold">{settings.businessName || t('brandName')}</span>
              {currentIndex >= 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-300 font-mono tabular-nums text-[11px] border border-white/10">
                  #{String(currentIndex + 1).padStart(2, '0')} / #
                  {String(allProducts.length).padStart(2, '0')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom Toggle Button */}
              <button
                type="button"
                onClick={() =>
                  setZoomLevel((prev) =>
                    prev === 1 ? 1.75 : prev === 1.75 ? 2.5 : 1
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-mono font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700"
                title="Toggle Image Zoom"
              >
                {zoomLevel > 1 ? (
                  <ZoomOut className="w-3.5 h-3.5" />
                ) : (
                  <ZoomIn className="w-3.5 h-3.5" />
                )}
                <span>{zoomLevel}x</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setZoomLevel(1);
                  onClose();
                }}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-zinc-700"
                aria-label={t('close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Detail Content matching AISelect_20261107_152908_Chrome.jpg in Black & White */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-5 pb-6 space-y-5">
            {/* 1. Title, Price, Star Rating & Floating Call / WhatsApp Circles */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <h2 className="text-lg sm:text-2xl font-extrabold text-white leading-snug tracking-tight">
                  {product.name}
                </h2>
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums tracking-tight">
                  ₹ {product.price.toLocaleString('en-IN')}
                </div>
                {/* 5-Star Rating Row */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <div className="flex items-center text-white">
                    {[1, 2, 3, 4].map((n) => (
                      <Star
                        key={n}
                        className="w-4 h-4 fill-white text-white"
                      />
                    ))}
                    <Star className="w-4 h-4 fill-white/50 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-zinc-300 font-mono tabular-nums">
                    {rating}({count})
                  </span>
                </div>
              </div>

              {/* Top-Right Circular Call & WhatsApp Icons (High Contrast Black & White / Light Grey) */}
              <div className="flex items-center gap-2.5 shrink-0">
                <a
                  href={`tel:+${cleanPhone}`}
                  aria-label="Call Workshop"
                  className="w-11 h-11 rounded-full bg-white hover:bg-zinc-200 text-[#18181A] flex items-center justify-center shadow-lg transition-transform active:scale-95"
                >
                  <Phone className="w-5 h-5 fill-current" />
                </a>
                <a
                  href={buildDirectWhatsAppUrl('inquiry')}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp Inquiry"
                  className="w-11 h-11 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 flex items-center justify-center shadow-lg transition-transform active:scale-95"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* 2. Center Product Photograph Stage + Inset White Well + Carousel Navigation */}
            <div className="space-y-3">
              <div className="relative aspect-[4/3] w-full rounded-[20px] bg-[#EDEDED] overflow-hidden flex items-center justify-center shadow-inner border border-zinc-700/50">
                <div
                  onClick={() =>
                    setZoomLevel((prev) =>
                      prev === 1 ? 1.75 : prev === 1.75 ? 2.5 : 1
                    )
                  }
                  style={{ transform: `scale(${zoomLevel})` }}
                  className={`w-full h-full transition-transform duration-200 ease-out ${
                    zoomLevel > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'
                  }`}
                >
                  <ProductImage
                    src={product.imageUrl}
                    alt={product.name}
                    sizeLabel={product.size}
                    className="w-full h-full object-contain"
                  />
                </div>

                {allProducts.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrev}
                      aria-label="Previous product"
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#222224]/85 hover:bg-[#222224] text-white border border-zinc-600 shadow-md flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      aria-label="Next product"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#222224]/85 hover:bg-[#222224] text-white border border-zinc-600 shadow-md flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Watermark / Workshop Caption + Carousel Pagination Dots */}
              <div className="text-center space-y-2">
                <p className="text-xs sm:text-sm font-extrabold tracking-widest text-zinc-400 uppercase">
                  {settings.businessName || 'SONU DIESEL BHATTI'}
                </p>

                {/* Carousel Dots + Media Icon */}
                <div className="flex items-center justify-center gap-2">
                  {allProducts.map((item, idx) => {
                    const isActive = item.id === product.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setZoomLevel(1);
                          onSelectProduct(item);
                        }}
                        aria-label={`View product ${idx + 1}`}
                        className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                          isActive
                            ? 'bg-white scale-125'
                            : 'bg-zinc-700 hover:bg-zinc-500'
                        }`}
                      />
                    );
                  })}
                  <Video className="w-3.5 h-3.5 text-zinc-500 ml-1" />
                </div>
              </div>
            </div>

            {/* 3. Product Specifications Table (Black & White 2-Column Specs) */}
            <div className="pt-3 border-t border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Product Specifications
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMoreSpecs((prev) => !prev)}
                  className="text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white underline cursor-pointer"
                >
                  {showMoreSpecs ? 'View Less' : 'View More'}
                </button>
              </div>

              <div className="divide-y divide-zinc-800/80 text-xs sm:text-sm bg-zinc-900/60 rounded-xl p-3 border border-zinc-800">
                {visibleSpecs.map((spec) => (
                  <div
                    key={spec.label}
                    className="py-2.5 grid grid-cols-12 gap-3 items-center"
                  >
                    <span className="col-span-5 text-zinc-400 font-medium">
                      {spec.label}
                    </span>
                    <span
                      className={`col-span-7 font-bold ${
                        spec.label === 'Availability'
                          ? outOfStock
                            ? 'text-red-400'
                            : 'text-zinc-100'
                          : 'text-white'
                      }`}
                    >
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Cart Quantity Bar if item is in Order Request Cart */}
            {cartEntry && (
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateCartQty(product.id, cartEntry.quantity - 1)
                    }
                    className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white hover:bg-zinc-700 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-white px-1">
                    {cartEntry.quantity} in cart · ₹
                    {(cartEntry.quantity * product.price).toLocaleString(
                      'en-IN'
                    )}
                  </span>
                  <button
                    type="button"
                    disabled={cartEntry.quantity >= product.stockQuantity}
                    onClick={() =>
                      onUpdateCartQty(product.id, cartEntry.quantity + 1)
                    }
                    className="w-8 h-8 rounded-lg bg-white text-zinc-950 flex items-center justify-center hover:bg-zinc-200 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 font-bold" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCartReceipt();
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold cursor-pointer whitespace-nowrap shadow-sm"
                >
                  {t('navReceiptMaker')}
                </button>
              </div>
            )}
          </div>

          {/* 4. Sticky Bottom 3-Button Action Bar (High-Contrast Black & White Theme) */}
          <div className="p-3.5 bg-[#18181A] border-t border-zinc-800 grid grid-cols-3 gap-2.5 shrink-0">
            {/* Call Now */}
            <a
              href={`tel:+${cleanPhone}`}
              className="py-3 px-2 rounded-xl bg-white hover:bg-zinc-200 text-[#18181A] text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 whitespace-nowrap"
            >
              <Phone className="w-4 h-4 shrink-0 fill-current" />
              <span>Call Now</span>
            </a>

            {/* WhatsApp */}
            <a
              href={buildDirectWhatsAppUrl('inquiry')}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>WhatsApp</span>
            </a>

            {/* Best Price / Add to Order Request */}
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => {
                onAddToCart(product);
              }}
              className="py-3 px-2 rounded-xl bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-[#18181A] text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              {cartEntry ? (
                <>
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span>+1 ({cartEntry.quantity})</span>
                </>
              ) : (
                <>
                  <MessageSquareText className="w-4 h-4 shrink-0" />
                  <span>Best Price</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
