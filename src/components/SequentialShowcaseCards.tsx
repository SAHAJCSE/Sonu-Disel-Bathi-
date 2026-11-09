import React from 'react';
import { motion } from 'motion/react';
import { CartItem, Product } from '../types.ts';
import { ProductImage } from './ProductImage.tsx';

interface SequentialShowcaseCardsProps {
  products: Product[];
  cart: CartItem[];
  gridCols?: 'auto' | 1 | 2 | 3 | 4;
  lowStockThreshold?: number;
  onAddToCart: (product: Product) => void;
  onUpdateCartQty: (productId: number, newQty: number) => void;
  hasActiveExternalFilters?: boolean;
  onClearAllFilters?: () => void;
  clearSignal?: number;
  onInspectProduct?: (product: Product) => void;
  onActionNotification?: (title: string, message?: string, type?: string) => void;
}

export const SequentialShowcaseCards: React.FC<SequentialShowcaseCardsProps> = ({
  products,
  cart,
  gridCols = 'auto',
  onAddToCart,
  onUpdateCartQty,
  onInspectProduct,
}) => {
  if (products.length === 0) return null;

  const gridClass =
    gridCols === 1
      ? 'grid-cols-1 max-w-xl mx-auto w-full gap-4'
      : gridCols === 2
      ? 'grid-cols-1 sm:grid-cols-2 gap-4'
      : gridCols === 3
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';

  return (
    <div className={`grid ${gridClass}`}>
      {products.map((product, index) => {
        const cartEntry = cart.find((c) => c.product.id === product.id);
        const outOfStock = product.stockQuantity <= 0;

        return (
          <motion.article
            key={product.id}
            onClick={() => onInspectProduct?.(product)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ 
              scale: 1.015,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            }}
            transition={{ duration: 0.2 }}
            className="group bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-xl overflow-hidden flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-sm"
          >
            <div>
              {/* Top Minimal Index & Size Bar */}
              <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400 transition-colors">
                <span className="font-bold">#{String(index + 1).padStart(2, '0')}</span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-colors">{product.size}</span>
              </div>

              {/* Clean Product Image */}
              <div className="relative aspect-[4/3] bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-100 dark:border-zinc-800 overflow-hidden transition-colors">
                <ProductImage
                  src={product.imageUrl}
                  alt={product.name}
                  sizeLabel={product.size}
                  className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                  enableHoverEffect={true}
                />
              </div>

              {/* Concise Title & Stock */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400">SDB-{String(product.id).padStart(2, '0')}</span>
                  <span className={outOfStock ? 'line-through text-red-500/50' : 'text-zinc-600 dark:text-zinc-400'}>
                    {outOfStock ? 'Out of stock' : `${product.stockQuantity} ready`}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 line-clamp-1 transition-colors">
                  {product.name}
                </h3>

                <div className="pt-1 flex items-baseline justify-between">
                  <span className="text-base font-bold font-mono text-zinc-950 dark:text-zinc-50 transition-colors">
                    ₹{product.price.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Area */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="px-4 pb-4 pt-1"
            >
              {cartEntry ? (
                <div className="flex items-center justify-between border border-zinc-950 dark:border-zinc-100 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 transition-colors shadow-sm">
                  <button
                    type="button"
                    onClick={() => onUpdateCartQty(product.id, cartEntry.quantity - 1)}
                    className="px-3.5 py-2 text-xs font-mono font-black text-zinc-950 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                  >
                    −
                  </button>
                  <span className="text-xs font-mono font-black text-zinc-950 dark:text-zinc-50">
                    {cartEntry.quantity}
                  </span>
                  <button
                    type="button"
                    disabled={cartEntry.quantity >= product.stockQuantity}
                    onClick={() => onUpdateCartQty(product.id, cartEntry.quantity + 1)}
                    className="px-3.5 py-2 text-xs font-mono font-black text-zinc-950 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={() => onAddToCart(product)}
                  className="w-full py-2.5 px-4 rounded-lg bg-zinc-950 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:bg-zinc-100 dark:disabled:bg-zinc-900 disabled:text-zinc-400 dark:disabled:text-zinc-600 text-white dark:text-zinc-950 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md"
                >
                  {outOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>
              )}
            </div>
          </motion.article>
        );
      })}
    </div>
  );
};
