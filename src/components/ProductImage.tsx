import React, { useState } from 'react';

interface ProductImageProps {
  src: string;
  alt: string;
  sizeLabel?: string;
  className?: string;
  enableHoverEffect?: boolean;
  priority?: boolean;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  sizeLabel,
  className = '',
  enableHoverEffect = false,
  priority = false,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-zinc-100 text-zinc-500 p-4 text-center ${className}`}
      >
        <span className="text-[11px] font-mono uppercase tracking-wider line-clamp-2">
          {alt}
        </span>
        {sizeLabel && (
          <span className="text-[10px] font-mono text-zinc-400 mt-1">{sizeLabel}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && <div className="absolute inset-0 bg-zinc-100 animate-pulse" />}
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          console.error(`ProductImage failed to load: ${src}`);
          setError(true);
        }}
        className={`w-full h-full object-contain transition-all duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${enableHoverEffect ? 'group-hover:scale-103' : ''}`}
      />
    </div>
  );
};
