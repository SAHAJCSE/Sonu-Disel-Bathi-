import React, { useState } from 'react';
import { Flame, Image as ImageIcon } from 'lucide-react';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  sizeLabel?: string;
  className?: string;
  enableHoverEffect?: boolean;
  priority?: boolean;
  fitMode?: 'cover' | 'contain';
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  sizeLabel,
  className = '',
  enableHoverEffect = false,
  priority = false,
  fitMode = 'contain',
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // If src is temporarily missing or undefined, render a refined loading skeleton
  if (!src) {
    return (
      <div
        className={`relative overflow-hidden bg-zinc-900/60 flex flex-col items-center justify-center p-4 text-center select-none ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
        <div className="w-10 h-10 rounded-full bg-zinc-800/80 border border-white/10 flex items-center justify-center mb-1.5 shadow-inner">
          <Flame className="w-5 h-5 text-amber-500/80 animate-pulse" />
        </div>
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 line-clamp-1 max-w-[85%]">
          {alt || 'Commercial Bhatti'}
        </span>
        {sizeLabel && (
          <span className="text-[10px] font-mono text-zinc-500 mt-0.5">{sizeLabel}</span>
        )}
      </div>
    );
  }

  // If the image fails to load, render a clean minimal fallback with burner icon
  if (error) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center bg-zinc-900/80 text-zinc-400 p-4 text-center border border-zinc-800 select-none ${className}`}
      >
        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700/60 flex items-center justify-center mb-2">
          <ImageIcon className="w-5 h-5 text-zinc-400" />
        </div>
        <span className="text-[11px] font-bold text-zinc-300 line-clamp-2 leading-tight">
          {alt}
        </span>
        {sizeLabel && (
          <span className="text-[10px] font-mono text-zinc-400 mt-1">{sizeLabel}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-zinc-900/40 ${className}`}>
      {/* Loading Skeleton underneath until image is fully rendered */}
      {!loaded && (
        <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
          <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center animate-pulse">
            <Flame className="w-4 h-4 text-zinc-500" />
          </div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          console.warn(`ProductImage load failed for ${src}`);
          setError(true);
        }}
        className={`w-full h-full ${
          fitMode === 'cover' ? 'object-cover' : 'object-contain'
        } transition-all duration-300 ${
          loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        } ${enableHoverEffect ? 'group-hover:scale-105' : ''}`}
      />
    </div>
  );
};

