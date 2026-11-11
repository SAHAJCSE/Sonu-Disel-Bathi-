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
    }, 3200);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const getStyle = () => {
    switch (toast?.type) {
      case 'cart_add':
      case 'order_placed':
        return {
          bg: 'bg-green-50',
          border: 'border-green-100',
          title: 'Doing Great!',
          iconBg: 'bg-green-500',
          iconColor: 'text-green-500',
          msgColor: 'text-green-700',
          accent: 'text-green-600',
          Icon: () => (
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center shrink-0">
               <div className="grid grid-cols-3 grid-rows-3 gap-0.5 w-4 h-4">
                  <div className="bg-black col-start-1 row-start-1" />
                  <div className="bg-black col-start-3 row-start-1" />
                  <div className="bg-black col-start-1 row-start-3" />
                  <div className="bg-black col-start-2 row-start-3" />
                  <div className="bg-black col-start-3 row-start-3" />
               </div>
            </div>
          )
        };
      case 'product_delete':
      case 'favorite_remove':
        return {
          bg: 'bg-red-50',
          border: 'border-red-100',
          title: 'Pay Attention!',
          iconBg: 'bg-red-500',
          iconColor: 'text-red-500',
          msgColor: 'text-red-700',
          accent: 'text-red-600',
          Icon: () => (
            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center shrink-0">
               <div className="grid grid-cols-3 grid-rows-3 gap-0.5 w-4 h-4">
                  <div className="bg-black col-start-1 row-start-1" />
                  <div className="bg-black col-start-3 row-start-1" />
                  <div className="bg-black col-start-1 row-start-2" />
                  <div className="bg-black col-start-2 row-start-2" />
                  <div className="bg-black col-start-3 row-start-2" />
               </div>
            </div>
          )
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-100',
          title: 'Doing OK',
          iconBg: 'bg-blue-500',
          iconColor: 'text-blue-500',
          msgColor: 'text-blue-700',
          accent: 'text-blue-600',
          Icon: () => (
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
               <div className="grid grid-cols-3 grid-rows-3 gap-0.5 w-4 h-4">
                  <div className="bg-black col-start-1 row-start-1" />
                  <div className="bg-black col-start-3 row-start-1" />
                  <div className="bg-black col-start-1 row-start-2" />
                  <div className="bg-black col-start-2 row-start-2" />
                  <div className="bg-black col-start-3 row-start-2" />
               </div>
            </div>
          )
        };
    }
  };

  const style = getStyle();

  return (
    <div className="fixed bottom-6 right-6 z-[100] pointer-events-none flex flex-col items-end no-print">
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            onClick={onDismiss}
            className={`pointer-events-auto cursor-pointer flex items-center gap-4 px-5 py-4 rounded-[2rem] ${style.bg} border-2 ${style.border} shadow-xl min-w-[280px] max-w-sm transition-colors`}
          >
            <style.Icon />
            <div className="min-w-0 flex-1">
              <p className="text-base font-black text-zinc-900 leading-tight">{style.title}</p>
              {toast.message && (
                <div className="flex items-center gap-1.5 mt-0.5">
                   <div className={`w-3.5 h-3.5 rounded-full ${style.iconBg} flex items-center justify-center`}>
                      <div className="w-1.5 h-1.5 bg-white rounded-full shadow-inner" />
                   </div>
                   <p className={`text-[13px] font-bold ${style.msgColor} truncate`}>{toast.message}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
