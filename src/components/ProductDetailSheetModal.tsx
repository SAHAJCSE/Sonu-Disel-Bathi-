import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BusinessSettings, CartItem, Product } from '../types.ts';
import { useTranslation } from '../i18n/LanguageContext.tsx';
import { ProductImage } from './ProductImage.tsx';
import { Share2 } from 'lucide-react';

interface ProductDetailSheetModalProps {
  product: Product | null;
  allProducts: Product[];
  cart: CartItem[];
  settings: BusinessSettings;
  currentUser: any;
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
  currentUser,
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
    const now = new Date();
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('en-IN');
    const customerName = currentUser?.name || 'Customer';
    const stockMsg = product.stockQuantity <= 0 ? 'Please request an order (Out of Stock)' : 'Do you have this in stock?';
    const text = `Product: ${product.name}\nCustomer: ${customerName}\nQty: ${qty}\nTime: ${time}\nDate: ${date}\n\n${stockMsg}`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
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
      value: product.burnerType || getBurnerConfig(product.name, product.size),
    },
    {
      label: 'Material',
      value: product.material || 'Heavy-Gauge Commercial Steel',
    },
    {
      label: 'Fuel',
      value: product.fuelType || 'Pressurized Diesel / Kerosene',
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
        className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 overflow-hidden font-sans transition-colors"
      >
        {/* Minimal Vercel-Style Top Bar */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shrink-0 transition-colors">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setZoomLevel(1);
                onClose();
              }}
              className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-950 dark:text-zinc-50 transition-colors cursor-pointer"
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
                  className="px-2.5 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-mono text-zinc-900 dark:text-zinc-200 transition-colors cursor-pointer"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-2.5 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-mono text-zinc-900 dark:text-zinc-200 transition-colors cursor-pointer"
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
              className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-mono text-zinc-900 dark:text-zinc-200 transition-colors cursor-pointer"
            >
              Zoom {zoomLevel}x
            </button>
          </div>
        </header>

        {/* Full-Screen Body */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950 transition-colors">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200 dark:divide-zinc-800 min-h-full">
            {/* Left Column: Clean Image Stage */}
            <div className="lg:col-span-7 p-4 sm:p-8 flex flex-col justify-center bg-zinc-50 dark:bg-zinc-950/50 transition-colors">
              <div className="relative aspect-[4/3] w-full rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center transition-colors">
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
            <div className="lg:col-span-5 p-5 sm:p-8 flex flex-col justify-between space-y-6 bg-white dark:bg-zinc-950 transition-colors">
              <div className="space-y-6">
                <div className="space-y-2 pb-5 border-b border-zinc-200 dark:border-zinc-800 transition-colors">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
                    <span>#SDB-{String(product.id).padStart(2, '0')}</span>
                    <span>{outOfStock ? 'Out of Stock' : 'In Stock'}</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight transition-colors">
                    {product.name}
                  </h1>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-zinc-950 dark:text-zinc-50 pt-1 transition-colors">
                    ₹{product.price.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Specifications Table */}
                <div className="space-y-2.5">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Specifications
                  </h2>
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border-t border-b border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm transition-colors">
                    {specs.map((spec) => (
                      <div
                        key={spec.label}
                        className="py-2.5 flex items-center justify-between gap-4"
                      >
                        <span className="text-zinc-500 dark:text-zinc-400">{spec.label}</span>
                        <span className="font-medium text-zinc-950 dark:text-zinc-100 text-right">
                          {spec.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cart Quantity Stepper if already in cart */}
                {cartEntry && (
                  <div className="p-3.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 transition-colors">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateCartQty(product.id, cartEntry.quantity - 1)
                        }
                        className="w-8 h-8 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 font-mono text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                      >
                        −
                      </button>
                      <span className="text-xs font-mono font-bold text-zinc-950 dark:text-zinc-50 px-2 transition-colors">
                        {cartEntry.quantity} × ₹{product.price.toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        disabled={cartEntry.quantity >= product.stockQuantity}
                        onClick={() =>
                          onUpdateCartQty(product.id, cartEntry.quantity + 1)
                        }
                        className="w-8 h-8 rounded border border-zinc-950 dark:border-zinc-50 bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 font-mono text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-40 cursor-pointer transition-colors"
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
                      className="px-3 py-1.5 rounded bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer transition-colors"
                    >
                      Open Receipt
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-4 gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800 transition-colors">
                <a
                  href={`tel:+${cleanPhone}`}
                  className="py-3 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-950 dark:text-zinc-50 text-xs font-medium text-center transition-colors"
                >
                  Call
                </a>

                <a
                  href={buildDirectWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-950 dark:text-zinc-50 text-xs font-medium text-center transition-colors"
                >
                  WhatsApp
                </a>

                <button
                  type="button"
                  onClick={() => {
                    const shareData = {
                      title: product.name,
                      text: `Check out ${product.name} at Sonu Diesel Bhatti!`,
                      url: window.location.href,
                    };
                    if (navigator.share) {
                      navigator.share(shareData).catch(() => {});
                    } else if (navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href);
                    }
                  }}
                  className="py-3 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-950 dark:text-zinc-50 text-xs font-medium text-center transition-colors flex items-center justify-center cursor-pointer"
                  title="Share product"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={() => onAddToCart(product)}
                  className="py-3 px-3 rounded-md bg-zinc-950 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-400 text-white dark:text-zinc-900 text-xs font-black uppercase tracking-tighter transition-colors cursor-pointer"
                >
                  {cartEntry ? `In Cart (${cartEntry.quantity})` : 'Add'}
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
