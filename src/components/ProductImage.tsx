import React, { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';
import { resolveProductImageUrl } from '../assets/bhattiImages.ts';

interface ProductImageProps {
  src: string;
  alt: string;
  sizeLabel?: string;
  className?: string;
  enableHoverEffect?: boolean;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  sizeLabel,
  className = 'w-full h-full object-cover',
  enableHoverEffect = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const resolvedSrc = resolveProductImageUrl(src, sizeLabel);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [src, sizeLabel]);

  if (!resolvedSrc || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-stone-900 text-stone-200 p-4 text-center ${className}`}
      >
        <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-105">
          <Flame className="w-6 h-6 text-amber-500" />
        </div>
        <span className="text-xs font-semibold tracking-tight text-stone-100 line-clamp-1">
          {alt}
        </span>
        {sizeLabel && (
          <span className="text-[11px] text-stone-400 mt-0.5">{sizeLabel}</span>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-stone-200/70">
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 animate-pulse" />
      )}
      <img
        src={resolvedSrc}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`${className} transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
        } ${
          enableHoverEffect
            ? 'group-hover:scale-[1.04] group-hover:brightness-[1.03]'
            : ''
        }`}
      />
      {/* Subtle studio inner border & bottom scrim for depth */}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/8" />
    </div>
  );
};
