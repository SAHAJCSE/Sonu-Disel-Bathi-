import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import {
  X,
  Plus,
  Minus,
  Trash2,
  FileText,
  Printer,
  Download,
  Send,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShoppingBag,
  Truck,
  Sparkles,
} from 'lucide-react';
import { BusinessSettings, CartItem, Product, UserProfile, CustomerOrder } from '../types.ts';
import { useTranslation } from '../i18n/LanguageContext.tsx';
import { ProductImage } from './ProductImage.tsx';

interface CartReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQty: (productId: number, newQty: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  settings: BusinessSettings;
  isOnline: boolean;
  onStockVerifiedUpdate: (latestProducts: Product[]) => void;
  currentUser?: UserProfile | null;
  onOrderPlaced?: (order: CustomerOrder) => void;
}

export const CartReceiptModal: React.FC<CartReceiptModalProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  settings,
  isOnline,
  onStockVerifiedUpdate,
  currentUser,
  onOrderPlaced,
}) => {
  const { t, translateSize } = useTranslation();
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptTimestamp, setReceiptTimestamp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [stockVerifiedMessage, setStockVerifiedMessage] = useState<
    string | null
  >(null);
  const [stockIssues, setStockIssues] = useState<
    Array<{
      productId: number;
      name: string;
      requested: number;
      available: number;
    }>
  >([]);

  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '');
  const [shippingAddress, setShippingAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<CustomerOrder | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.name && !customerName) setCustomerName(currentUser.name);
    if (currentUser?.phone && !customerPhone) setCustomerPhone(currentUser.phone);
  }, [currentUser]);

  useEffect(() => {
    if (isOpen && cart.length > 0) {
      const now = new Date();
      const datePart = `${now.getFullYear()}${String(
        now.getMonth() + 1
      ).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      setReceiptNumber(`SDB-${datePart}-${randomPart}`);
      setReceiptTimestamp(
        now.toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      );
      setPdfDownloaded(false);
      setSubmittedOrder(null);
      setSubmitError(null);
      verifyCartStock();
    }
  }, [isOpen]);

  const handlePlaceDatabaseOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      setSubmitError('Please enter your Name and Mobile Phone Number to place the order.');
      return;
    }
    setSubmitError(null);
    setIsSubmittingOrder(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: currentUser?.email,
          shippingAddress: shippingAddress.trim() || undefined,
          notes: customerNotes.trim() || undefined,
          items: cart.map((c) => ({
            id: c.product.id,
            name: c.product.name,
            size: c.product.size,
            price: c.product.price,
            quantity: c.quantity,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setSubmitError(data.error || 'Failed to submit order to database.');
      } else {
        setSubmittedOrder(data.order);
        if (onOrderPlaced) {
          onOrderPlaced(data.order);
        }
      }
    } catch {
      setSubmitError('Network error while placing order. Please check your connection.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const verifyCartStock = async () => {
    if (!isOnline || cart.length === 0) {
      setStockVerifiedMessage(null);
      setStockIssues([]);
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/public/verify-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((c) => ({
            productId: c.product.id,
            quantity: c.quantity,
          })),
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.latestProducts) {
          onStockVerifiedUpdate(data.latestProducts);
        }
        if (data.issues && data.issues.length > 0) {
          setStockIssues(data.issues);
          setStockVerifiedMessage(t('stockIssueWarning'));
          // Adjust quantities to available stock
          for (const issue of data.issues) {
            if (issue.available > 0) {
              onUpdateQty(issue.productId, issue.available);
            } else {
              onRemoveItem(issue.productId);
            }
          }
        } else {
          setStockIssues([]);
          setStockVerifiedMessage(t('stockVerifiedOk'));
        }
      }
    } catch {
      // Offline fallback uses cached quantities
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  const grandTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  /**
   * Generates and downloads a clean, printable A4 PDF Order Request Receipt using jsPDF
   */
  const handleDownloadPdf = () => {
    if (cart.length === 0 || isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 16;
      const contentWidth = pageWidth - margin * 2;

      const brandTitle = (
        settings.businessName || 'SONU DIESEL BHATTI'
      ).toUpperCase();
      const cleanPhone = (settings.whatsappNumber || '919876543210').replace(
        /[^0-9]/g,
        ''
      );
      const activeReceiptNo = receiptNumber || `SDB-${Date.now()}`;
      const activeDate =
        receiptTimestamp ||
        new Date().toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });

      // 1. Dark Studio Header Banner
      doc.setFillColor(24, 24, 27); // zinc-900
      doc.roundedRect(margin, 14, contentWidth, 30, 3, 3, 'F');

      // Amber Accent Stripe
      doc.setFillColor(217, 119, 6); // amber-600
      doc.rect(margin, 41.5, contentWidth, 2.5, 'F');

      // Brand Name & Subtitle
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(brandTitle, margin + 6, 25);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(212, 212, 216);
      doc.setFontSize(8.5);
      doc.text(
        'OFFICIAL ORDER REQUEST RECEIPT  |  COMMERCIAL & INDUSTRIAL DIESEL BHATTI',
        margin + 6,
        31.5
      );
      doc.text(`WhatsApp Order Desk: +${cleanPhone}`, margin + 6, 37);

      // Right-Aligned Receipt Metadata
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(251, 191, 36); // amber-400
      doc.setFontSize(9.5);
      doc.text(
        `Receipt No: ${activeReceiptNo}`,
        pageWidth - margin - 6,
        25,
        { align: 'right' }
      );

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(228, 228, 231);
      doc.setFontSize(8.5);
      doc.text(`Date: ${activeDate}`, pageWidth - margin - 6, 31.5, {
        align: 'right',
      });
      doc.text(
        'Status: Order Request (Pending Confirmation)',
        pageWidth - margin - 6,
        37,
        { align: 'right' }
      );

      // 2. Table Header
      let y = 52;
      doc.setFillColor(245, 245, 244); // stone-100
      doc.setDrawColor(212, 212, 216); // zinc-300
      doc.rect(margin, y, contentWidth, 9, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(63, 63, 70);

      const colSeq = margin + 4;
      const colName = margin + 15;
      const colSize = margin + 98;
      const colPrice = margin + 135;
      const colQty = margin + 152;
      const colSubtotal = pageWidth - margin - 4;

      doc.text('#', colSeq, y + 6);
      doc.text('PRODUCT MODEL', colName, y + 6);
      doc.text('SIZE', colSize, y + 6);
      doc.text('UNIT PRICE', colPrice, y + 6, { align: 'right' });
      doc.text('QTY', colQty, y + 6, { align: 'center' });
      doc.text('SUBTOTAL', colSubtotal, y + 6, { align: 'right' });

      y += 9;

      // 3. Itemized Product Rows
      cart.forEach(({ product, quantity }, idx) => {
        if (y > pageHeight - 55) {
          doc.addPage();
          y = 20;
        }

        const rowHeight = 10;
        if (idx % 2 === 1) {
          doc.setFillColor(250, 250, 249);
          doc.rect(margin, y, contentWidth, rowHeight, 'F');
        }

        doc.setDrawColor(228, 228, 231);
        doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

        const itemSubtotal = product.price * quantity;
        const seqLabel = String(idx + 1).padStart(2, '0');
        const safeName =
          product.name.length > 42
            ? `${product.name.slice(0, 40)}...`
            : product.name;

        doc.setFont('courier', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(113, 113, 122);
        doc.text(seqLabel, colSeq, y + 6.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(24, 24, 27);
        doc.text(safeName, colName, y + 6.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(82, 82, 91);
        doc.text(product.size, colSize, y + 6.5);

        doc.setFont('courier', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(39, 39, 42);
        doc.text(
          `Rs. ${product.price.toLocaleString('en-IN')}`,
          colPrice,
          y + 6.5,
          { align: 'right' }
        );

        doc.setFont('courier', 'bold');
        doc.text(String(quantity), colQty, y + 6.5, { align: 'center' });

        doc.setFont('courier', 'bold');
        doc.setTextColor(24, 24, 27);
        doc.text(
          `Rs. ${itemSubtotal.toLocaleString('en-IN')}`,
          colSubtotal,
          y + 6.5,
          { align: 'right' }
        );

        y += rowHeight;
      });

      // 4. Summary & Grand Total Section
      y += 6;
      if (y > pageHeight - 45) {
        doc.addPage();
        y = 20;
      }

      // Left summary stats
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(82, 82, 91);
      doc.text(
        `Total Models Selected: ${cart.length}   |   Total Units Requested: ${totalUnits}`,
        margin + 2,
        y + 7
      );

      // Right Grand Total Box
      const totalBoxWidth = 76;
      const totalBoxX = pageWidth - margin - totalBoxWidth;
      doc.setFillColor(24, 24, 27);
      doc.roundedRect(totalBoxX, y, totalBoxWidth, 12, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(212, 212, 216);
      doc.text('GRAND TOTAL:', totalBoxX + 4, y + 7.5);

      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(251, 191, 36); // amber-400
      doc.text(
        `Rs. ${grandTotal.toLocaleString('en-IN')}`,
        pageWidth - margin - 4,
        y + 7.5,
        { align: 'right' }
      );

      // 5. Disclaimer Box
      y += 18;
      doc.setFillColor(250, 250, 249);
      doc.setDrawColor(212, 212, 216);
      doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(63, 63, 70);
      doc.text('IMPORTANT ORDER REQUEST NOTICE:', margin + 4, y + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(113, 113, 122);
      doc.text(
        'This receipt is an official order request document, not proof of payment. Stock availability and final dispatch',
        margin + 4,
        y + 10
      );
      doc.text(
        'details are confirmed directly by a Sonu Diesel Bhatti administrator via WhatsApp.',
        margin + 4,
        y + 13.8
      );

      doc.save(`${activeReceiptNo}.pdf`);
      setPdfDownloaded(true);
      setTimeout(() => setPdfDownloaded(false), 3500);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const buildWhatsAppUrl = () => {
    const cleanPhone = (settings.whatsappNumber || '919876543210').replace(
      /[^0-9]/g,
      ''
    );
    const lines: string[] = [
      `*${settings.businessName || 'SONU DIESEL BHATTI'}*`,
      `Order Request Receipt: *${receiptNumber}*`,
      `Date: ${receiptTimestamp}`,
      `--------------------------------`,
      `*Product | Size | Price | Qty | Subtotal*`,
    ];

    for (const item of cart) {
      const sub = item.product.price * item.quantity;
      lines.push(
        `• ${item.product.name} | ${
          item.product.size
        } | ₹${item.product.price.toLocaleString('en-IN')} × ${
          item.quantity
        } = *₹${sub.toLocaleString('en-IN')}*`
      );
    }

    lines.push(`--------------------------------`);
    lines.push(
      `*Total Order Request Amount: ₹${grandTotal.toLocaleString('en-IN')}*`
    );
    lines.push(
      `\nPlease confirm current availability and dispatch details for this order request.`
    );

    const encoded = encodeURIComponent(lines.join('\n'));
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-xl bg-white border border-zinc-200 shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-900 text-white no-print">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {t('cartTitle')}
              </h2>
              <p className="text-xs text-zinc-400">{t('cartSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-6 h-6 text-zinc-500" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">
              {t('emptyCartTitle')}
            </h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-md mx-auto">
              {t('emptyCartDesc')}
            </p>
            <button
              onClick={onClose}
              className="mt-5 px-5 py-2.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              {t('navCatalogue')}
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
            {/* Stock Verification Banner */}
            {isVerifying && (
              <div className="px-4 py-2.5 rounded-lg bg-stone-100 border border-stone-200 text-xs text-zinc-700">
                {t('verifyingStock')}
              </div>
            )}
            {!isVerifying && stockVerifiedMessage && (
              <div
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-medium no-print ${
                  stockIssues.length > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                {stockIssues.length > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>{stockVerifiedMessage}</span>
              </div>
            )}

            {/* Printable Receipt Document Box */}
            <div className="border border-zinc-200 rounded-xl p-5 sm:p-6 bg-stone-50/60">
              {/* Receipt Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
                    <Flame className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold tracking-tight text-zinc-900">
                      {settings.businessName || t('brandName')}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {t('receiptModalTitle')}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right text-xs text-zinc-600 font-mono tabular-nums space-y-0.5">
                  <div>
                    <span className="text-zinc-400">{t('receiptNo')}: </span>
                    <span className="font-bold text-zinc-900">
                      {receiptNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400">{t('receiptDate')}: </span>
                    <span>{receiptTimestamp}</span>
                  </div>
                </div>
              </div>

              {/* Receipt Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-[11px] font-semibold text-zinc-500">
                      <th className="py-2.5 pr-3">{t('productCol')}</th>
                      <th className="py-2.5 px-3">{t('sizeCol')}</th>
                      <th className="py-2.5 px-3 text-right">
                        {t('priceCol')}
                      </th>
                      <th className="py-2.5 px-3 text-center">{t('qtyCol')}</th>
                      <th className="py-2.5 pl-3 text-right">
                        {t('subtotalCol')}
                      </th>
                      <th className="py-2.5 pl-2 text-right no-print"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/70 text-sm">
                    {cart.map(({ product, quantity }) => {
                      const itemSubtotal = product.price * quantity;
                      return (
                        <tr key={product.id} className="group">
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-lg overflow-hidden border border-zinc-200 shrink-0 bg-white">
                                <ProductImage
                                  src={product.imageUrl}
                                  alt={product.name}
                                  sizeLabel={product.size}
                                />
                              </div>
                              <span className="font-semibold text-zinc-900 text-xs sm:text-sm">
                                {product.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-xs text-zinc-600 whitespace-nowrap">
                            {translateSize(product.size)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-xs sm:text-sm text-zinc-700 whitespace-nowrap">
                            ₹{product.price.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() =>
                                  onUpdateQty(product.id, quantity - 1)
                                }
                                className="w-7 h-7 rounded-md border border-zinc-300 bg-white flex items-center justify-center text-zinc-700 hover:bg-zinc-100 no-print cursor-pointer"
                                title="Decrease quantity"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center font-mono tabular-nums font-bold text-zinc-900 text-xs sm:text-sm">
                                {quantity}
                              </span>
                              <button
                                onClick={() =>
                                  onUpdateQty(
                                    product.id,
                                    Math.min(
                                      product.stockQuantity,
                                      quantity + 1
                                    )
                                  )
                                }
                                disabled={quantity >= product.stockQuantity}
                                className="w-7 h-7 rounded-md border border-zinc-300 bg-white flex items-center justify-center text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 no-print cursor-pointer"
                                title="Increase quantity"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 pl-3 text-right font-mono tabular-nums font-bold text-zinc-900 text-xs sm:text-sm whitespace-nowrap">
                            ₹{itemSubtotal.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 pl-2 text-right no-print">
                            <button
                              onClick={() => onRemoveItem(product.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                              title={t('removeItem')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Grand Total Footer */}
              <div className="mt-4 pt-4 border-t border-zinc-300 flex items-center justify-between">
                <span className="text-sm font-bold text-zinc-700">
                  {t('grandTotal')}
                </span>
                <span className="text-xl font-extrabold font-mono tabular-nums text-zinc-900">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Important Disclaimer */}
              <p className="mt-4 pt-3 border-t border-zinc-200/80 text-[11px] text-zinc-500 leading-relaxed">
                {t('receiptDisclaimer')}
              </p>
            </div>

            {submittedOrder ? (
              <div className="p-4 sm:p-6 rounded-2xl bg-[#1c1c1e] text-white border border-zinc-800 space-y-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">
                      Order Placed & Stored in Database!
                    </h4>
                    <p className="text-xs text-zinc-400 font-mono">
                      Order ID:{' '}
                      <strong className="text-emerald-400">
                        #{submittedOrder.orderNumber}
                      </strong>{' '}
                      · Live notification sent to workshop
                    </p>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  Your order for{' '}
                  <strong className="text-white font-mono">
                    ₹{submittedOrder.totalAmount.toLocaleString('en-IN')}
                  </strong>{' '}
                  has been persisted into PostgreSQL. You can track its live fabrication status under{' '}
                  <strong>My Orders</strong> anytime.
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="px-4 py-2.5 rounded-xl bg-[#EDEDED] hover:bg-white text-zinc-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-zinc-900" />
                    <span>Download Official PDF Receipt</span>
                  </button>

                  <a
                    href={buildWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send to WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      onClearCart();
                      onClose();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer transition-colors"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Customer Contact & Delivery Form */}
                <div className="bg-stone-50 border border-zinc-200 rounded-xl p-3.5 sm:p-4 space-y-3 no-print">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-zinc-700" />
                      <span>Customer Contact & Delivery Information</span>
                    </h4>
                    {currentUser && (
                      <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {currentUser.role === 'admin' ? '👑 Admin' : '👤 Customer'} ({currentUser.name.split(' ')[0]})
                      </span>
                    )}
                  </div>

                  {submitError && (
                    <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Gurpreet Singh / Sonu"
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs bg-white text-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                        Mobile Phone / WhatsApp <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs bg-white text-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none font-mono font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                      Delivery City / Workshop Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="e.g. Shop #12, Industrial Area, Ludhiana, Punjab"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs bg-white text-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Download Receipt PDF Button (jsPDF) */}
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={isGeneratingPdf}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                    >
                      {pdfDownloaded ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>{t('receiptDownloadedMsg')}</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-amber-400" />
                          <span>{t('downloadReceiptBtn')}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-white text-xs font-semibold text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Printer className="w-4 h-4 text-zinc-600" />
                      <span>{t('printReceipt')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={onClearCart}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('clearCart')}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Place Official Order directly into Database */}
                    <button
                      type="button"
                      disabled={isSubmittingOrder || cart.length === 0}
                      onClick={handlePlaceDatabaseOrder}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap border border-zinc-700"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>
                        {isSubmittingOrder
                          ? 'Saving to Database...'
                          : 'Place Order in Database'}
                      </span>
                    </button>

                    <a
                      href={buildWhatsAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => verifyCartStock()}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-colors whitespace-nowrap"
                    >
                      <Send className="w-4 h-4" />
                      <span>{t('sendToWhatsApp')}</span>
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

