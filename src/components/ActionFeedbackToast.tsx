import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

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
    }, 2400);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div className="fixed bottom-4 right-4 z-[80] pointer-events-none flex flex-col items-end no-print">
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={onDismiss}
            className="pointer-events-auto cursor-pointer flex items-center justify-between gap-4 px-3.5 py-2.5 rounded-md bg-zinc-950 text-white border border-zinc-800 shadow-lg max-w-xs sm:max-w-sm"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{toast.title}</p>
              {toast.message && (
                <p className="text-[11px] text-zinc-400 truncate">{toast.message}</p>
              )}
            </div>
            <span className="text-[10px] font-mono uppercase text-zinc-400 shrink-0">
              OK
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
