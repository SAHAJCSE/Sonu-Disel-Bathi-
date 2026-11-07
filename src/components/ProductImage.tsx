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

export const ProductImage: React.FC<ProductImageProps> = React.memo(({
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
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-200 p-4 text-center ${className}`}
      >
        <div className="w-12 h-12 rounded-xl bg-[#00C1FD]/15 border border-[#00C1FD]/30 flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-105 shadow-sm">
          <Flame className="w-6 h-6 text-[#00C1FD]" />
        </div>
        <span className="text-xs font-semibold tracking-tight text-white line-clamp-1">
          {alt}
        </span>
        {sizeLabel && (
          <span className="text-[11px] text-zinc-400 mt-0.5">{sizeLabel}</span>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-zinc-900">
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 animate-pulse" />
      )}
      <img
        src={resolvedSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
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
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  );
});
