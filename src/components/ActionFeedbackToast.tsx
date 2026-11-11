import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Heart, Trash2, CheckCircle2 } from 'lucide-react';

export interface ActionToastData {
  id: string;
  title: string;
  message?: string;
  type?:
    | 'cart_add'
    | 'cart_update'
    | 'cart_remove'
    | 'favorite_add'
    | 'favorite_remove'
    | 'order_placed'
    | 'stock_change'
    | 'product_delete'
    | 'general';
}

interface ActionFeedbackToastProps {
  toast: ActionToastData | null;
  onDismiss: () => void;
}

export const ActionFeedbackToast: React.FC<ActionFeedbackToastProps> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 2200);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const renderIcon = () => {
    switch (toast.type) {
      case 'cart_add':
      case 'cart_update':
        return <ShoppingBag className="w-4 h-4 text-white dark:text-zinc-950 shrink-0" />;
      case 'favorite_add':
        return <Heart className="w-4 h-4 fill-white text-white dark:fill-zinc-950 dark:text-zinc-950 shrink-0" />;
      case 'cart_remove':
      case 'product_delete':
      case 'favorite_remove':
        return <Trash2 className="w-4 h-4 text-zinc-400 shrink-0" />;
      case 'order_placed':
      default:
        return <CheckCircle2 className="w-4 h-4 text-white dark:text-zinc-950 shrink-0" />;
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none flex flex-col items-center no-print px-4 w-full max-w-sm">
      <motion.div
        key={toast.id}
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.96, transition: { duration: 0.15 } }}
        onClick={onDismiss}
        className="pointer-events-auto cursor-pointer flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-black text-white dark:bg-white dark:text-black border border-zinc-700/80 dark:border-zinc-300 shadow-xl backdrop-blur-md transition-all active:scale-95"
      >
        <div className="w-6 h-6 rounded-full bg-zinc-800 dark:bg-zinc-200 flex items-center justify-center shrink-0">
          {renderIcon()}
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-bold tracking-tight whitespace-nowrap">
            {toast.title}
          </span>
          {toast.message && (
            <span className="text-[11px] text-zinc-300 dark:text-zinc-600 truncate max-w-[170px] font-medium border-l border-zinc-700 dark:border-zinc-300 pl-1.5">
              {toast.message}
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
};

