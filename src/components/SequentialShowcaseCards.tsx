import React from 'react';
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
          <article
            key={product.id}
            onClick={() => onInspectProduct?.(product)}
            className="group bg-white border border-zinc-200 hover:border-zinc-950 rounded-lg overflow-hidden flex flex-col justify-between transition-colors cursor-pointer"
          >
            <div>
              {/* Top Minimal Index & Size Bar */}
              <div className="px-3.5 py-2 border-b border-zinc-100 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span>#{String(index + 1).padStart(2, '0')}</span>
                <span>{product.size}</span>
              </div>

              {/* Clean Product Image */}
              <div className="relative aspect-[4/3] bg-zinc-50 border-b border-zinc-100 overflow-hidden">
                <ProductImage
                  src={product.imageUrl}
                  alt={product.name}
                  sizeLabel={product.size}
                  className="w-full h-full object-contain p-3"
                  enableHoverEffect={true}
                />
              </div>

              {/* Concise Title & Stock */}
              <div className="p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <span>SDB-{String(product.id).padStart(2, '0')}</span>
                  <span className={outOfStock ? 'line-through text-zinc-400' : 'text-zinc-700'}>
                    {outOfStock ? 'Out of stock' : `${product.stockQuantity} in stock`}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-zinc-950 line-clamp-1">
                  {product.name}
                </h3>

                <div className="pt-1 flex items-baseline justify-between">
                  <span className="text-base font-bold font-mono text-zinc-950">
                    ₹{product.price.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Area */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="px-3.5 pb-3.5 pt-1"
            >
              {cartEntry ? (
                <div className="flex items-center justify-between border border-zinc-950 rounded-md overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => onUpdateCartQty(product.id, cartEntry.quantity - 1)}
                    className="px-3 py-1.5 text-xs font-mono font-bold text-zinc-950 hover:bg-zinc-100 cursor-pointer"
                  >
                    −
                  </button>
                  <span className="text-xs font-mono font-bold text-zinc-950">
                    {cartEntry.quantity} in cart
                  </span>
                  <button
                    type="button"
                    disabled={cartEntry.quantity >= product.stockQuantity}
                    onClick={() => onUpdateCartQty(product.id, cartEntry.quantity + 1)}
                    className="px-3 py-1.5 text-xs font-mono font-bold text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={() => onAddToCart(product)}
                  className="w-full py-2 px-3 rounded-md bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  {outOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
};
