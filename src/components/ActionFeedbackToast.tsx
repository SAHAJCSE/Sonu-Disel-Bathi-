import React, { useEffect } from 'react';
import {
  ShoppingBag,
  Heart,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Boxes,
  Package,
  X,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';

export interface ActionToastData {
  id: string;
  title: string;
  message?: string;
  type:
    | 'cart_add'
    | 'cart_update'
    | 'cart_remove'
    | 'order_placed'
    | 'favorite_add'
    | 'favorite_remove'
    | 'stock_change'
    | 'product_edit'
    | 'product_delete'
    | 'general';
}

interface ActionFeedbackToastProps {
  toast: ActionToastData | null;
  onDismiss: () => void;
}

export const ActionFeedbackToast: React.FC<ActionFeedbackToastProps> = React.memo(({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 2800);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const getToastIcon = () => {
    switch (toast.type) {
      case 'cart_add':
      case 'cart_update':
        return <ShoppingBag className="w-4 h-4 text-emerald-400" />;
      case 'cart_remove':
      case 'product_delete':
        return <Trash2 className="w-4 h-4 text-rose-400" />;
      case 'favorite_add':
        return <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />;
      case 'favorite_remove':
        return <Heart className="w-4 h-4 text-zinc-400" />;
      case 'order_placed':
        return <Package className="w-4 h-4 text-[#00C1FD]" />;
      case 'stock_change':
        return <Boxes className="w-4 h-4 text-[#00C1FD]" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#00C1FD]" />;
    }
  };

  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-50 pointer-events-none">
      <motion.div
        layout
        initial={{ opacity: 0, y: 24, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.95 }}
        transition={{
          type: 'spring',
          damping: 24,
          stiffness: 350,
        }}
        onClick={onDismiss}
        className="pointer-events-auto min-w-[280px] max-w-sm rounded-2xl bg-[#1c1c1e] text-white p-3.5 shadow-2xl border border-zinc-700/80 ring-1 ring-white/10 flex items-start gap-3 cursor-pointer overflow-hidden relative"
      >
        {/* Left Icon well */}
        <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center shrink-0 mt-0.5">
          {getToastIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <h4 className="text-xs font-bold text-white tracking-tight leading-snug">
            {toast.title}
          </h4>
          {toast.message && (
            <p className="text-[11px] text-zinc-400 mt-0.5 leading-tight line-clamp-2">
              {toast.message}
            </p>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Animated 2.8s timer bar in Electric Blue #00C1FD */}
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: 2.8, ease: 'linear' }}
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#00C1FD] via-emerald-400 to-[#00C1FD]"
        />
      </motion.div>
    </div>
  );
});
