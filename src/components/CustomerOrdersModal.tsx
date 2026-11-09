import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Package, Download, MessageCircle, FileText, Calendar, User } from 'lucide-react';
import { CustomerOrder, CustomerOrderItem } from '../types.ts';
import jsPDF from 'jspdf';

interface CustomerOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: CustomerOrder[];
  whatsappNumber: string;
}

export const CustomerOrdersModal: React.FC<CustomerOrdersModalProps> = ({
  isOpen,
  onClose,
  orders,
  whatsappNumber,
}) => {
  const downloadOrderReceipt = (order: CustomerOrder) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    let items: CustomerOrderItem[] = [];
    try {
      items = JSON.parse(order.itemsJson);
    } catch {
      items = [];
    }

    doc.setFillColor(15, 15, 18);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('SONU DIESEL BHATTI', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text(`Official Order Request Summary | #${order.orderNumber}`, 14, 25);

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Customer Name: ${order.customerName}`, 14, 48);
    doc.text(`Phone Number: ${order.customerPhone}`, 14, 53);
    doc.text(`Date Recorded: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 14, 58);

    doc.setDrawColor(230, 230, 230);
    doc.line(14, 65, 196, 65);

    let y = 75;
    doc.setFontSize(10);
    doc.text('ITEMIZED LIST:', 14, y - 4);
    
    items.forEach((item, index) => {
      const itemTotal = item.price * (item.quantity || 1);
      doc.setFont('helvetica', 'normal');
      doc.text(`${index + 1}. ${item.name}`, 14, y);
      doc.text(`${item.size}`, 120, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`x${item.quantity || 1}`, 150, y);
      doc.text(`Rs. ${itemTotal.toLocaleString('en-IN')}`, 196, y, { align: 'right' });
      y += 8;
    });

    doc.setDrawColor(230, 230, 230);
    doc.line(14, y + 2, 196, y + 2);

    y += 12;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('GRAND TOTAL:', 14, y);
    doc.text(`Rs. ${order.totalAmount.toLocaleString('en-IN')}`, 196, y, { align: 'right' });

    doc.save(`SDB-Order-${order.orderNumber}.pdf`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-colors"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                  <Package className="w-5 h-5 text-zinc-950 dark:text-zinc-50" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight">Your Order History</h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Catalogue Requests</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {orders.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">No orders found</h3>
                    <p className="text-sm text-zinc-500">Your order request history will appear here.</p>
                  </div>
                </div>
              ) : (
                orders.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 text-[10px] font-mono font-black uppercase">
                            #{order.orderNumber}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                            order.status === 'completed' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800'
                              : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm font-bold">
                            <User className="w-3.5 h-3.5 text-zinc-400" />
                            {order.customerName}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                            {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>

                        <div className="text-lg font-mono font-black text-zinc-950 dark:text-zinc-50">
                          ₹{order.totalAmount.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-4 sm:pt-0 border-t sm:border-t-0 border-zinc-50 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => downloadOrderReceipt(order)}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-950 dark:text-zinc-50 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                        >
                          <Download className="w-4 h-4" />
                          <span>PDF Receipt</span>
                        </button>
                        <a
                          href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Hello, I have an inquiry about my order #${order.orderNumber}.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-bold transition-all active:scale-95 shadow-lg group-hover:shadow-zinc-950/20"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>WhatsApp Inquiry</span>
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-center">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Sonu Diesel Bhatti Official System
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

