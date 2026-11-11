import React from 'react';

export const ProductSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm animate-pulse">
      <div className="aspect-square bg-zinc-200 dark:bg-zinc-800 rounded-xl mb-4"></div>
      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2"></div>
    </div>
  );
};
