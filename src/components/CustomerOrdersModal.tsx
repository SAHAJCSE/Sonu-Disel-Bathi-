import React from 'react';
import {
  X,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  Download,
  MessageSquare,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  if (!isOpen) return null;

  const downloadOrderReceipt = (order: CustomerOrder) => {
    try {
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

      // Title & Header
      doc.setFillColor(24, 24, 26);
      doc.rect(0, 0, 210, 36, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('SONU DIESEL BHATTI', 14, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('High-Flame Commercial Bhatti Manufacturer & Fabrication Works', 14, 25);
      doc.text(`Official Order Receipt · ${order.orderNumber}`, 14, 30);

      // Customer Info Box
      doc.setTextColor(30, 30, 32);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Customer & Delivery Details', 14, 48);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Customer Name: ${order.customerName}`, 14, 56);
      doc.text(`Contact Phone: ${order.customerPhone}`, 14, 62);
      if (order.customerEmail) {
        doc.text(`Email: ${order.customerEmail}`, 14, 68);
      }
      if (order.shippingAddress) {
        doc.text(`Delivery Address: ${order.shippingAddress}`, 14, 74);
      }

      // Order Status Box
      doc.setFont('helvetica', 'bold');
      doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 130, 56);
      doc.text(`Current Status: ${order.status.toUpperCase()}`, 130, 62);

      // Table Header
      let y = 86;
      doc.setFillColor(235, 235, 238);
      doc.rect(14, y - 5, 182, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('MODEL / PRODUCT', 18, y);
      doc.text('SIZE', 95, y);
      doc.text('QTY', 125, y);
      doc.text('PRICE', 145, y);
      doc.text('TOTAL', 172, y);

      y += 8;
      doc.setFont('helvetica', 'normal');

      items.forEach((item, index) => {
        const itemTotal = item.price * (item.quantity || 1);
        doc.text(`${index + 1}. ${item.name}`, 18, y);
        doc.text(`${item.size}`, 95, y);
        doc.text(`${item.quantity || 1}`, 125, y);
        doc.text(`₹${item.price.toLocaleString('en-IN')}`, 145, y);
        doc.text(`₹${itemTotal.toLocaleString('en-IN')}`, 172, y);
        y += 7;
      });

      // Total Line
      y += 4;
      doc.setDrawColor(200, 200, 200);
      doc.line(14, y, 196, y);
      y += 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Grand Total:', 125, y);
      doc.text(`₹${order.totalAmount.toLocaleString('en-IN')}`, 172, y);

      // Footer
      y += 24;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('Thank you for choosing Sonu Diesel Bhatti. For questions, contact: +91 ' + whatsappNumber, 14, y);
      doc.text('Generated from Sonu Diesel Bhatti cloud database.', 14, y + 5);

      doc.save(`Receipt-${order.orderNumber}.pdf`);
    } catch (e) {
      console.error('Failed to generate PDF:', e);
    }
  };

  const getStatusBadge = (status: CustomerOrder['status']) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirmed</span>
          </span>
        );
      case 'dispatched':
        return (
          <span className="px-2.5 py-1 rounded-full bg-[#00C1FD]/10 text-[#00C1FD] border border-[#00C1FD]/20 text-xs font-bold inline-flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" />
            <span>Dispatched</span>
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Delivered</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold inline-flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-zinc-700/40 text-zinc-300 border border-zinc-600/30 text-xs font-bold inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#00C1FD]" />
            <span>Order Placed (Pending)</span>
          </span>
        );
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-3xl max-h-[90vh] bg-[#1c1c1e] text-white border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10 z-10"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 bg-[#232326] border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">
                  My Orders & Live Dispatches
                </h2>
                <p className="text-xs text-zinc-400">
                  Track your commercial diesel bhatti fabrications in real-time
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {orders.length === 0 ? (
              <div className="py-16 text-center text-zinc-400 space-y-3">
                <Package className="w-12 h-12 mx-auto text-zinc-600" />
                <h3 className="text-base font-bold text-zinc-200">
                  No orders placed yet
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Add diesel bhatti models to your cart and checkout or submit a quotation to track orders live here.
                </p>
              </div>
            ) : (
              orders.map((order) => {
                let items: CustomerOrderItem[] = [];
                try {
                  items = JSON.parse(order.itemsJson);
                } catch {
                  items = [];
                }

                return (
                  <div
                    key={order.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#232326] border border-zinc-800 hover:border-zinc-700 transition-colors space-y-3"
                  >
                    {/* Top Row: Order Number + Status + Date */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs sm:text-sm font-bold text-white">
                            #{order.orderNumber}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          {new Date(order.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-zinc-400 block">Total Amount</span>
                        <span className="text-base sm:text-xl font-extrabold font-mono tabular-nums text-white">
                          ₹{order.totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 divide-y divide-zinc-800/60 text-xs">
                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          className="py-1.5 flex items-center justify-between gap-2"
                        >
                          <div className="truncate">
                            <span className="font-semibold text-zinc-200">
                              {item.name}
                            </span>
                            <span className="text-zinc-500 ml-1.5">
                              ({item.size}) × {item.quantity || 1}
                            </span>
                          </div>
                          <span className="font-mono tabular-nums text-zinc-300 font-bold shrink-0">
                            ₹{((item.quantity || 1) * item.price).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Delivery & Notes if available */}
                    {order.shippingAddress && (
                      <p className="text-xs text-zinc-400 leading-snug">
                        <strong className="text-zinc-300">Deliver to:</strong>{' '}
                        {order.shippingAddress}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => downloadOrderReceipt(order)}
                          className="px-3 py-1.5 rounded-xl bg-[#EDEDED] hover:bg-white text-zinc-950 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Receipt (PDF)</span>
                        </button>
                      </div>

                      <a
                        href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                          `Hello Sonu Diesel Bhatti! I would like to check on my order #${order.orderNumber} for ₹${order.totalAmount.toLocaleString('en-IN')}.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat on WhatsApp</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
