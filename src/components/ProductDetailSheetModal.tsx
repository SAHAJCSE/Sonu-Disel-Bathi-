import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

export const ProductDetailSheetModal: React.FC<
  ProductDetailSheetModalProps
> = React.memo(({
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

  if (!product) return null;

  const currentIndex = allProducts.findIndex((p) => p.id === product.id);
  const cartEntry = cart.find((c) => c.product.id === product.id);
  const outOfStock = product.stockQuantity <= 0;
  const cleanPhone = (settings.whatsappNumber || '918708381844').replace(
    /[^0-9]/g,
    ''
  );

  const buildDirectWhatsAppUrl = () => {
    const qty = cartEntry ? cartEntry.quantity : 1;
    const lines = [
      `Hello *${settings.businessName || 'SONU DIESEL BHATTI'}*, I want to order:`,
      `• Product: ${product.name}`,
      `• Size: ${product.size} (${getDimensionsBySize(product.size)})`,
      `• Price: ₹${product.price.toLocaleString('en-IN')}`,
      `• Quantity: ${qty} unit(s)`,
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

  const specs = [
    {
      label: 'Code',
      value: `#SDB-${String(product.id).padStart(2, '0')}`,
    },
    {
      label: 'Size & Dimensions',
      value: `${translateSize(product.size)} — ${getDimensionsBySize(product.size)}`,
    },
    {
      label: 'Burner Type',
      value: getBurnerConfig(product.name, product.size),
    },
    {
      label: 'Material',
      value: 'Heavy-Gauge Commercial Steel',
    },
    {
      label: 'Fuel',
      value: 'Pressurized Diesel / Kerosene',
    },
    {
      label: 'Availability',
      value: outOfStock
        ? t('outOfStock')
        : `${product.stockQuantity} Units Ready`,
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex flex-col bg-white text-zinc-950 overflow-hidden font-sans"
      >
        {/* Minimal Vercel-Style Top Bar */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-zinc-200 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setZoomLevel(1);
                onClose();
              }}
              className="px-3 py-1.5 rounded-md border border-zinc-300 hover:bg-zinc-100 text-xs font-medium text-zinc-950 transition-colors cursor-pointer"
            >
              ← Back
            </button>
            <span className="text-xs font-mono text-zinc-500">
              {currentIndex >= 0
                ? `${String(currentIndex + 1).padStart(2, '0')} / ${String(
                    allProducts.length
                  ).padStart(2, '0')}`
                : `#SDB-${String(product.id).padStart(2, '0')}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {allProducts.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-2.5 py-1.5 rounded-md border border-zinc-300 hover:bg-zinc-100 text-xs font-mono text-zinc-900 cursor-pointer"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-2.5 py-1.5 rounded-md border border-zinc-300 hover:bg-zinc-100 text-xs font-mono text-zinc-900 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                setZoomLevel((prev) =>
                  prev === 1 ? 1.75 : prev === 1.75 ? 2.5 : 1
                )
              }
              className="px-3 py-1.5 rounded-md border border-zinc-300 hover:bg-zinc-100 text-xs font-mono text-zinc-900 cursor-pointer"
            >
              Zoom {zoomLevel}x
            </button>
          </div>
        </header>

        {/* Full-Screen Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200 min-h-full">
            {/* Left Column: Clean Image Stage */}
            <div className="lg:col-span-7 p-4 sm:p-8 flex flex-col justify-center bg-zinc-50">
              <div className="relative aspect-[4/3] w-full rounded-lg bg-white border border-zinc-200 overflow-hidden flex items-center justify-center">
                <div
                  onClick={() =>
                    setZoomLevel((prev) =>
                      prev === 1 ? 1.75 : prev === 1.75 ? 2.5 : 1
                    )
                  }
                  style={{ transform: `scale(${zoomLevel})` }}
                  className={`w-full h-full transition-transform duration-200 ease-out flex items-center justify-center p-6 ${
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
              </div>
            </div>

            {/* Right Column: Clean Specifications & Actions */}
            <div className="lg:col-span-5 p-5 sm:p-8 flex flex-col justify-between space-y-6 bg-white">
              <div className="space-y-6">
                <div className="space-y-2 pb-5 border-b border-zinc-200">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
                    <span>#SDB-{String(product.id).padStart(2, '0')}</span>
                    <span>{outOfStock ? 'Out of Stock' : 'In Stock'}</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
                    {product.name}
                  </h1>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-zinc-950 pt-1">
                    ₹{product.price.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Specifications Table */}
                <div className="space-y-2.5">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Specifications
                  </h2>
                  <div className="divide-y divide-zinc-200 border-t border-b border-zinc-200 text-xs sm:text-sm">
                    {specs.map((spec) => (
                      <div
                        key={spec.label}
                        className="py-2.5 flex items-center justify-between gap-4"
                      >
                        <span className="text-zinc-500">{spec.label}</span>
                        <span className="font-medium text-zinc-950 text-right">
                          {spec.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cart Quantity Stepper if already in cart */}
                {cartEntry && (
                  <div className="p-3.5 rounded-md bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateCartQty(product.id, cartEntry.quantity - 1)
                        }
                        className="w-8 h-8 rounded border border-zinc-300 bg-white text-zinc-950 font-mono text-sm hover:bg-zinc-100 cursor-pointer"
                      >
                        −
                      </button>
                      <span className="text-xs font-mono font-bold text-zinc-950 px-2">
                        {cartEntry.quantity} × ₹{product.price.toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        disabled={cartEntry.quantity >= product.stockQuantity}
                        onClick={() =>
                          onUpdateCartQty(product.id, cartEntry.quantity + 1)
                        }
                        className="w-8 h-8 rounded border border-zinc-950 bg-zinc-950 text-white font-mono text-sm hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCartReceipt();
                      }}
                      className="px-3 py-1.5 rounded bg-zinc-950 text-white text-xs font-medium hover:bg-zinc-800 cursor-pointer"
                    >
                      Open Receipt
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-zinc-200">
                <a
                  href={`tel:+${cleanPhone}`}
                  className="py-3 px-3 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-950 text-xs font-medium text-center transition-colors"
                >
                  Call
                </a>

                <a
                  href={buildDirectWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-3 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-950 text-xs font-medium text-center transition-colors"
                >
                  WhatsApp
                </a>

                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={() => onAddToCart(product)}
                  className="py-3 px-3 rounded-md bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  {cartEntry ? `In Cart (${cartEntry.quantity})` : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

ProductDetailSheetModal.displayName = 'ProductDetailSheetModal';
