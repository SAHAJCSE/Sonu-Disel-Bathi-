import React from 'react';
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

    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, 210, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('SONU DIESEL BHATTI', 14, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Order Receipt #${order.orderNumber}`, 14, 22);

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Customer: ${order.customerName} (${order.customerPhone})`, 14, 42);

    let y = 55;
    doc.setFontSize(9);
    items.forEach((item, index) => {
      const itemTotal = item.price * (item.quantity || 1);
      doc.text(
        `${index + 1}. ${item.name} (${item.size}) x ${item.quantity || 1} — Rs. ${itemTotal.toLocaleString('en-IN')}`,
        14,
        y
      );
      y += 7;
    });

    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text(`Grand Total: Rs. ${order.totalAmount.toLocaleString('en-IN')}`, 14, y);

    doc.save(`Receipt-${order.orderNumber}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-2xl max-h-[85vh] bg-white text-zinc-950 border border-zinc-300 rounded-lg shadow-xl flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-950">Orders</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-mono text-zinc-500 hover:text-zinc-950 cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {orders.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              No orders recorded yet.
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-md border border-zinc-200 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-xs font-mono font-bold text-zinc-950">
                    #{order.orderNumber} · {order.status.toUpperCase()}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    ₹{order.totalAmount.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadOrderReceipt(order)}
                    className="px-3 py-1.5 rounded border border-zinc-300 text-xs font-medium hover:bg-zinc-100 cursor-pointer"
                  >
                    PDF
                  </button>
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                      `Order #${order.orderNumber} inquiry`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded bg-zinc-950 text-white text-xs font-medium"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
