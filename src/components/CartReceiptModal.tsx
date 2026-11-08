import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Minus,
  Trash2,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  ArrowLeft,
  MessageCircle,
  Share2,
} from 'lucide-react';
import { BusinessSettings, CartItem, Product, UserProfile } from '../types.ts';
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
}

export const CartReceiptModal: React.FC<CartReceiptModalProps> = React.memo(({
  isOpen,
  onClose,
  cart,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  settings,
  isOnline,
  onStockVerifiedUpdate,
}) => {
  const { t, translateSize } = useTranslation();
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptDateTime, setReceiptDateTime] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [stockVerifiedMessage, setStockVerifiedMessage] = useState<string | null>(null);
  const [stockIssues, setStockIssues] = useState<
    Array<{
      productId: number;
      name: string;
      requested: number;
      available: number;
    }>
  >([]);

  const adminPhone = (settings.whatsappNumber || '918708381844').replace(/[^0-9]/g, '');

  useEffect(() => {
    if (isOpen && cart.length > 0) {
      const now = new Date();
      const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
        now.getDate()
      ).padStart(2, '0')}`;
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      setReceiptNumber(`SDB-${datePart}-${randomPart}`);

      const formattedDate = now.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const formattedTime = now
        .toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        .toLowerCase();
      setReceiptDateTime(`${formattedDate}, ${formattedTime}`);
      setPdfDownloaded(false);
      verifyCartStock();
    }
  }, [isOpen]);

  const verifyCartStock = async () => {
    if (!isOnline || cart.length === 0) return;
    setIsVerifying(true);
    setStockIssues([]);
    try {
      const res = await fetch('/api/public/catalogue');
      if (res.ok) {
        const data = await res.json();
        const latestProducts: Product[] = data.products || [];
        onStockVerifiedUpdate(latestProducts);

        const issues: Array<{
          productId: number;
          name: string;
          requested: number;
          available: number;
        }> = [];

        cart.forEach((item) => {
          const matched = latestProducts.find((p) => p.id === item.product.id);
          if (!matched || matched.stockQuantity < item.quantity) {
            issues.push({
              productId: item.product.id,
              name: item.product.name,
              requested: item.quantity,
              available: matched ? matched.stockQuantity : 0,
            });
          }
        });

        if (issues.length > 0) {
          setStockIssues(issues);
          setStockVerifiedMessage(
            `Note: ${issues.length} item(s) in your cart exceed available workshop stock.`
          );
        } else {
          setStockVerifiedMessage(null);
        }
      }
    } catch {
      // Offline fallback
    } finally {
      setIsVerifying(false);
    }
  };

  const grandTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  );

  const totalUnits = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

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
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;

      const brandTitle = (settings.businessName || 'SONU DIESEL BHATTI').toUpperCase();
      const cleanPhone = adminPhone || '918708381844';
      const activeReceiptNo = receiptNumber || `SDB-${Date.now()}`;
      const activeDateTime =
        receiptDateTime ||
        `${new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}, ${new Date()
          .toLocaleTimeString('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
          .toLowerCase()}`;

      // Pure white page background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Top Dark Rounded Header Card
      const headerY = 14;
      const headerH = 27;
      doc.setFillColor(15, 15, 18);
      doc.roundedRect(margin, headerY, contentWidth, headerH, 2.5, 2.5, 'F');

      // Cyan Accent Bar at bottom of Header Card
      doc.setFillColor(0, 193, 253);
      doc.rect(margin, headerY + headerH - 2.2, contentWidth, 2.2, 'F');

      // Header Left Column
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14.5);
      doc.setTextColor(255, 255, 255);
      doc.text(brandTitle, margin + 6, headerY + 8.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(200, 205, 212);
      doc.text(
        'OFFICIAL ORDER REQUEST RECEIPT  |  COMMERCIAL & INDUSTRIAL DIESEL BHATTI',
        margin + 6,
        headerY + 15
      );

      doc.setFontSize(8.2);
      doc.setTextColor(215, 220, 228);
      doc.text(`WhatsApp Order Desk: +${cleanPhone}`, margin + 6, headerY + 21);

      // Header Right Column
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 193, 253);
      doc.text(`Receipt No: ${activeReceiptNo}`, pageWidth - margin - 6, headerY + 8.5, {
        align: 'right',
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(215, 220, 228);
      doc.text(`Date: ${activeDateTime}`, pageWidth - margin - 6, headerY + 15, {
        align: 'right',
      });
      doc.text(
        'Status: Order Request (Pending Confirmation)',
        pageWidth - margin - 6,
        headerY + 21,
        { align: 'right' }
      );

      // Items Table Header
      let currentY = headerY + headerH + 9;
      const colX = {
        num: margin + 4,
        model: margin + 17,
        size: margin + 106,
        unitPrice: margin + 146,
        qty: margin + 162,
        subtotal: pageWidth - margin - 4,
      };

      doc.setFillColor(244, 244, 246);
      doc.rect(margin, currentY, contentWidth, 8.5, 'F');
      doc.setDrawColor(212, 212, 218);
      doc.setLineWidth(0.25);
      doc.line(margin, currentY, margin + contentWidth, currentY);
      doc.line(margin, currentY + 8.5, margin + contentWidth, currentY + 8.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(40, 40, 45);
      doc.text('#', colX.num, currentY + 5.6);
      doc.text('PRODUCT MODEL', colX.model, currentY + 5.6);
      doc.text('SIZE', colX.size, currentY + 5.6);
      doc.text('UNIT PRICE', colX.unitPrice, currentY + 5.6, { align: 'right' });
      doc.text('QTY', colX.qty, currentY + 5.6, { align: 'right' });
      doc.text('SUBTOTAL', colX.subtotal, currentY + 5.6, { align: 'right' });

      currentY += 8.5;

      // Table Rows
      cart.forEach(({ product, quantity }, idx) => {
        const subtotal = product.price * quantity;
        const rowH = 9.5;

        doc.setFont('courier', 'normal');
        doc.setFontSize(8.8);
        doc.setTextColor(45, 45, 50);
        doc.text(String(idx + 1).padStart(2, '0'), colX.num, currentY + 6.2);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.8);
        doc.setTextColor(15, 15, 18);
        const modelText =
          product.name.length > 44 ? `${product.name.slice(0, 42)}...` : product.name;
        doc.text(modelText, colX.model, currentY + 6.2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(65, 65, 72);
        doc.text(product.size, colX.size, currentY + 6.2);

        doc.setFont('courier', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 35);
        doc.text(`Rs. ${product.price.toLocaleString('en-IN')}`, colX.unitPrice, currentY + 6.2, {
          align: 'right',
        });

        doc.setFont('courier', 'bold');
        doc.setTextColor(15, 15, 18);
        doc.text(String(quantity), colX.qty, currentY + 6.2, { align: 'right' });

        doc.text(`Rs. ${subtotal.toLocaleString('en-IN')}`, colX.subtotal, currentY + 6.2, {
          align: 'right',
        });

        doc.setDrawColor(228, 228, 234);
        doc.setLineWidth(0.2);
        doc.line(margin, currentY + rowH, margin + contentWidth, currentY + rowH);

        currentY += rowH;
      });

      // Summary & Grand Total Row
      currentY += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(65, 65, 72);
      doc.text(
        `Total Models Selected: ${cart.length}   |   Total Units Requested: ${totalUnits}`,
        margin + 2,
        currentY + 6.5
      );

      const totalBoxW = 78;
      const totalBoxH = 11.5;
      const totalBoxX = pageWidth - margin - totalBoxW;
      doc.setFillColor(15, 15, 18);
      doc.roundedRect(totalBoxX, currentY, totalBoxW, totalBoxH, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(255, 255, 255);
      doc.text('GRAND TOTAL:', totalBoxX + 5, currentY + 7.3);

      doc.setFont('courier', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(0, 193, 253);
      doc.text(
        `Rs. ${grandTotal.toLocaleString('en-IN')}`,
        pageWidth - margin - 5,
        currentY + 7.3,
        { align: 'right' }
      );

      // Important Order Request Notice Box
      currentY += totalBoxH + 8;
      const noticeH = 17;
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(224, 224, 230);
      doc.setLineWidth(0.25);
      doc.roundedRect(margin, currentY, contentWidth, noticeH, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 35);
      doc.text('IMPORTANT ORDER REQUEST NOTICE:', margin + 4.5, currentY + 5.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(95, 95, 105);
      doc.text(
        'This receipt is an official order request document, not proof of payment. Stock availability and final dispatch',
        margin + 4.5,
        currentY + 10.6
      );
      doc.text(
        'details are confirmed directly by a Sonu Diesel Bhatti administrator via WhatsApp.',
        margin + 4.5,
        currentY + 14.4
      );

      doc.save(`${activeReceiptNo}.pdf`);
      setPdfDownloaded(true);
      setTimeout(() => setPdfDownloaded(false), 3500);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const buildReceiptText = () => {
    const cleanPhone = adminPhone || '918708381844';
    const lines: string[] = [
      `*SONU DIESEL BHATTI*`,
      `OFFICIAL ORDER REQUEST RECEIPT`,
      `Receipt No: ${receiptNumber}`,
      `Date: ${receiptDateTime}`,
      `WhatsApp Order Desk: +${cleanPhone}`,
      `----------------------------------------`,
    ];

    cart.forEach(({ product, quantity }, idx) => {
      const sub = product.price * quantity;
      lines.push(
        `${String(idx + 1).padStart(2, '0')}. *${product.name}* (${product.size})`,
        `   Rs. ${product.price.toLocaleString('en-IN')} x ${quantity} = *Rs. ${sub.toLocaleString('en-IN')}*`
      );
    });

    lines.push(
      `----------------------------------------`,
      `Total Models Selected: ${cart.length} | Total Units Requested: ${totalUnits}`,
      `*GRAND TOTAL: Rs. ${grandTotal.toLocaleString('en-IN')}*`,
      `----------------------------------------`,
      `Please confirm stock availability and dispatch details.`
    );

    return lines.join('\n');
  };

  const handleDirectWhatsAppToAdmin = () => {
    const cleanPhone = adminPhone || '918708381844';
    const text = buildReceiptText();
    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 flex flex-col bg-white text-black no-print overflow-hidden font-sans"
        >
          {/* Top Navigation Bar (White Background, Black Text) */}
          <header className="flex items-center justify-between gap-3 px-4 sm:px-8 py-3.5 bg-white border-b border-zinc-200 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white text-black hover:bg-zinc-100 border border-zinc-300 transition-colors cursor-pointer shrink-0"
                title="Back to Catalogue"
              >
                <ArrowLeft className="w-4 h-4 text-black" />
              </button>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-black truncate flex items-center gap-2">
                  <span>{t('cartTitle')}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-black border border-zinc-300 font-mono text-xs font-bold">
                    {cart.length} {cart.length === 1 ? 'Item' : 'Items'} ({totalUnits} Qty)
                  </span>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={onClearCart}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-black hover:bg-zinc-100 border border-zinc-300 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-black" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-black hover:bg-zinc-800 text-white font-extrabold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </header>

          {/* Main Scrollable Content (Pure White Major Background, Black Text) */}
          <div className="flex-1 overflow-y-auto bg-white">
            {cart.length === 0 ? (
              <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-white text-black">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-300 flex items-center justify-center mb-4">
                  <ShoppingBag className="w-8 h-8 text-black" />
                </div>
                <h3 className="text-xl font-extrabold text-black">{t('emptyCartTitle')}</h3>
                <p className="text-sm text-zinc-600 mt-1 max-w-md">{t('emptyCartDesc')}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 px-6 py-3 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-extrabold transition-all cursor-pointer"
                >
                  Browse Catalogue
                </button>
              </div>
            ) : (
              <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-8 pb-28">
                {isVerifying && (
                  <div className="p-3 rounded-xl bg-zinc-50 text-xs text-black border border-zinc-200 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-black animate-ping" />
                    <span>Verifying workshop stock...</span>
                  </div>
                )}

                {!isVerifying && stockVerifiedMessage && stockIssues.length > 0 && (
                  <div className="p-3 rounded-xl text-xs font-semibold border border-zinc-300 bg-zinc-50 text-black flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-black shrink-0" />
                    <span>{stockVerifiedMessage}</span>
                  </div>
                )}

                {/* SECTION 1: Properly Sized Items List (Name, Size, Price × Quantity) */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                    <h3 className="text-base sm:text-lg font-extrabold text-black tracking-tight">
                      Selected Items ({cart.length})
                    </h3>
                    <span className="font-mono text-base sm:text-lg font-extrabold text-black">
                      Total: Rs. {grandTotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {cart.map(({ product, quantity }, idx) => {
                      const subtotal = product.price * quantity;
                      return (
                        <div
                          key={product.id}
                          className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
                        >
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <span className="font-mono text-xs font-bold text-zinc-500 w-6 shrink-0">
                              {String(idx + 1).padStart(2, '0')}
                            </span>

                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-zinc-50 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center p-1.5">
                              <ProductImage
                                src={product.imageUrl}
                                alt={product.name}
                                sizeLabel={product.size}
                                className="w-full h-full object-contain"
                              />
                            </div>

                            <div className="min-w-0 flex-1 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-md bg-zinc-100 border border-zinc-300 text-xs font-bold text-black">
                                  Size: {translateSize(product.size)}
                                </span>
                              </div>

                              <h4 className="text-base sm:text-lg font-extrabold text-black leading-snug break-words">
                                {product.name}
                              </h4>

                              <div className="text-sm sm:text-base font-mono font-bold text-black">
                                Rs. {product.price.toLocaleString('en-IN')} × {quantity}{' '}
                                <span className="font-extrabold">
                                  = Rs. {subtotal.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quantity Stepper & Remove */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 shrink-0">
                            <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-zinc-100 border border-zinc-300">
                              <button
                                type="button"
                                onClick={() => onUpdateQty(product.id, quantity - 1)}
                                aria-label="Decrease quantity"
                                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white hover:bg-zinc-200 text-black border border-zinc-300 flex items-center justify-center cursor-pointer font-bold active:scale-95"
                              >
                                <Minus className="w-4 h-4 text-black" />
                              </button>
                              <span className="w-8 text-center font-mono font-extrabold text-sm sm:text-base text-black">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateQty(product.id, quantity + 1)}
                                disabled={quantity >= product.stockQuantity}
                                aria-label="Increase quantity"
                                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-black hover:bg-zinc-800 text-white flex items-center justify-center cursor-pointer font-bold disabled:opacity-40 active:scale-95"
                              >
                                <Plus className="w-4 h-4 text-white" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => onRemoveItem(product.id)}
                              aria-label="Remove item"
                              className="p-2 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-black cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 text-black" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* SECTION 2: Modern Action Bar (Share to WhatsApp & Download Receipt PDF) */}
                <section className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-black flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                      Ready to Order / Download
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-black font-mono">
                      Grand Total: Rs. {grandTotal.toLocaleString('en-IN')} ({totalUnits} Units)
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={isGeneratingPdf}
                      className="px-5 py-3 rounded-xl bg-white hover:bg-zinc-100 text-black border-2 border-black font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
                    >
                      {pdfDownloaded ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-black" />
                          <span>Receipt PDF Downloaded</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-black" />
                          <span>Download Receipt PDF</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDirectWhatsAppToAdmin}
                      className="px-6 py-3 rounded-xl bg-black hover:bg-zinc-800 text-white font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 text-white" />
                      <span>Share to WhatsApp</span>
                      <Share2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </section>

                {/* SECTION 3: Exact Live Preview of the Attached Official Order Request Receipt PDF */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-600">
                    <FileText className="w-4 h-4 text-black" />
                    <span>Official Order Request Receipt Preview</span>
                  </div>

                  <div className="bg-white border border-zinc-300 rounded-2xl p-4 sm:p-8 shadow-xs space-y-6">
                    {/* Receipt Top Dark Banner with Cyan Accent Strip (Matching Attached PDF) */}
                    <div className="rounded-xl overflow-hidden bg-[#0F0F12] text-white">
                      <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h1 className="text-lg sm:text-xl font-extrabold tracking-wide text-white uppercase">
                            {settings.businessName || 'SONU DIESEL BHATTI'}
                          </h1>
                          <p className="text-[11px] sm:text-xs text-zinc-300 tracking-wide uppercase">
                            OFFICIAL ORDER REQUEST RECEIPT &nbsp;|&nbsp; COMMERCIAL &amp; INDUSTRIAL DIESEL BHATTI
                          </p>
                          <p className="text-xs text-zinc-200">
                            WhatsApp Order Desk: +{adminPhone}
                          </p>
                        </div>

                        <div className="sm:text-right space-y-1">
                          <div className="text-xs sm:text-sm font-extrabold text-[#00C1FD]">
                            Receipt No: {receiptNumber}
                          </div>
                          <div className="text-xs text-zinc-200">
                            Date: {receiptDateTime}
                          </div>
                          <div className="text-xs text-zinc-300">
                            Status: Order Request (Pending Confirmation)
                          </div>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-[#00C1FD]" />
                    </div>

                    {/* Receipt Items Table (Matching Attached PDF) */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                          <tr className="bg-zinc-100 border-y border-zinc-300 text-[11px] sm:text-xs font-bold text-black uppercase">
                            <th className="py-2.5 px-3 w-12">#</th>
                            <th className="py-2.5 px-3">PRODUCT MODEL</th>
                            <th className="py-2.5 px-3">SIZE</th>
                            <th className="py-2.5 px-3 text-right">UNIT PRICE</th>
                            <th className="py-2.5 px-3 text-right">QTY</th>
                            <th className="py-2.5 px-3 text-right">SUBTOTAL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 text-black">
                          {cart.map(({ product, quantity }, idx) => {
                            const sub = product.price * quantity;
                            return (
                              <tr key={product.id}>
                                <td className="py-3 px-3 font-mono text-zinc-700">
                                  {String(idx + 1).padStart(2, '0')}
                                </td>
                                <td className="py-3 px-3 font-extrabold text-black">
                                  {product.name}
                                </td>
                                <td className="py-3 px-3 text-zinc-700">
                                  {product.size}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-black">
                                  Rs. {product.price.toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-extrabold text-black">
                                  {quantity}
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-extrabold text-black">
                                  Rs. {sub.toLocaleString('en-IN')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals Summary & Dark Grand Total Pill (Matching Attached PDF) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                      <div className="text-xs sm:text-sm text-zinc-700 font-medium">
                        Total Models Selected: {cart.length} &nbsp;|&nbsp; Total Units Requested: {totalUnits}
                      </div>

                      <div className="px-5 py-3 rounded-lg bg-[#0F0F12] text-white flex items-center justify-between gap-8 min-w-[260px]">
                        <span className="text-xs sm:text-sm font-extrabold tracking-wide uppercase">
                          GRAND TOTAL:
                        </span>
                        <span className="font-mono text-sm sm:text-base font-extrabold text-[#00C1FD]">
                          Rs. {grandTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Important Order Request Notice Box (Matching Attached PDF) */}
                    <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                      <div className="text-xs font-extrabold text-black uppercase">
                        IMPORTANT ORDER REQUEST NOTICE:
                      </div>
                      <p className="text-xs text-zinc-600 leading-relaxed">
                        This receipt is an official order request document, not proof of payment. Stock availability and final dispatch details are confirmed directly by a Sonu Diesel Bhatti administrator via WhatsApp.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

CartReceiptModal.displayName = 'CartReceiptModal';
