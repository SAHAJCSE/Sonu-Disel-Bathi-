import React, { useState, useEffect } from 'react';
import { Flame, Image as ImageIcon } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';

// In-memory cache of resolved /api/images/:id -> data URL for cross-environment rendering (e.g. Vercel static deploy)
const resolvedImageCache = new Map<string, string>();

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
  const [retryCount, setRetryCount] = useState(0);
  const [firestoreChecked, setFirestoreChecked] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(() => {
    if (!src) return null;
    return resolvedImageCache.get(src) || src;
  });

  useEffect(() => {
    const nextSrc = src ? resolvedImageCache.get(src) || src : null;
    setCurrentSrc(nextSrc);
    setError(false);
    setLoaded(false);
    setRetryCount(0);
    setFirestoreChecked(false);
  }, [src]);

  const tryResolveFromFirestore = async (originalSrc: string): Promise<boolean> => {
    const match = originalSrc.match(/^\/api\/images\/([^/?#]+)/);
    if (!match) return false;
    const imageId = match[1];

    const cached = resolvedImageCache.get(originalSrc);
    if (cached) {
      setCurrentSrc(cached);
      setLoaded(false);
      setError(false);
      return true;
    }

    try {
      const snap = await getDoc(doc(db, 'images', imageId));
      if (snap.exists()) {
        const data = snap.data();
        if (data?.dataBase64) {
          const mime = data.mimeType || 'image/webp';
          const dataUrl = data.dataBase64.startsWith('data:')
            ? data.dataBase64
            : `data:${mime};base64,${data.dataBase64}`;
          resolvedImageCache.set(originalSrc, dataUrl);
          setCurrentSrc(dataUrl);
          setLoaded(false);
          setError(false);
          return true;
        }
      }
    } catch (err) {
      console.warn(`Firestore image lookup failed for images/${imageId}:`, err);
    }
    return false;
  };

  // If src is temporarily missing or undefined, render a refined loading skeleton
  if (!currentSrc) {
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

  // If the image fails to load after retry & Firestore lookup, render a clean minimal fallback
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

  const handleImageError = async () => {
    // Never append ?retry= query params to data: URLs (it breaks base64 decoding)
    if (currentSrc.startsWith('data:')) {
      setError(true);
      return;
    }

    // For /api/images/:id paths (which do not exist on static hosts like Vercel), resolve directly from Firestore
    if (src && src.startsWith('/api/images/') && !firestoreChecked) {
      setFirestoreChecked(true);
      const resolved = await tryResolveFromFirestore(src);
      if (resolved) return;
    }

    if (retryCount < 2) {
      setRetryCount((prev) => prev + 1);
      const cleanBase = currentSrc.split('?')[0];
      const separator = cleanBase.includes('?') ? '&' : '?';
      setCurrentSrc(`${cleanBase}${separator}retry=${Date.now()}`);
    } else {
      setError(true);
    }
  };

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
        src={currentSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          void handleImageError();
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
