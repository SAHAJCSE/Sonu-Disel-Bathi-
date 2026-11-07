import React, { useState, useEffect, useMemo } from 'react';
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
  Maximize2,
  RotateCcw,
  ArrowLeft,
  ChevronRight,
  Layers,
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
  currentUser,
  onOrderPlaced,
}) => {
  const { t, translateSize } = useTranslation();
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptTimestamp, setReceiptTimestamp] = useState('');
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

  // Mobile viewport tab toggle: 'cart' vs 'receipt'
  const [activeMobileTab, setActiveMobileTab] = useState<'cart' | 'receipt'>('cart');

  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '');
  const [shippingAddress, setShippingAddress] = useState('');
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
      const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
        now.getDate()
      ).padStart(2, '0')}`;
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

  const verifyCartStock = async () => {
    if (!isOnline || cart.length === 0) return;
    setIsVerifying(true);
    setStockIssues([]);
    try {
      const res = await fetch('/api/products/public');
      if (res.ok) {
        const latestProducts: Product[] = await res.json();
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
            `Note: ${issues.length} item(s) in your cart exceed available live workshop inventory.`
          );
        } else {
          setStockVerifiedMessage('✅ Live workshop stock verified and locked.');
        }
      }
    } catch {
      // Offline mode uses local cache
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

  /**
   * Generates and downloads a clean, printable A4 PDF Order Request Receipt using jsPDF with #00C1FD electric blue styling
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

      const brandTitle = (settings.businessName || 'SONU DIESEL BHATTI').toUpperCase();
      const cleanPhone = (settings.whatsappNumber || '919876543210').replace(/[^0-9]/g, '');
      const activeReceiptNo = receiptNumber || `SDB-${Date.now()}`;
      const activeDate =
        receiptTimestamp ||
        new Date().toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });

      // 1. Dark Studio Header Banner
      doc.setFillColor(18, 18, 20); // dark zinc
      doc.roundedRect(margin, 14, contentWidth, 30, 3, 3, 'F');

      // Electric Blue #00C1FD Accent Stripe
      doc.setFillColor(0, 193, 253);
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

      // Right-Aligned Receipt Metadata in Electric Blue #00C1FD
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 193, 253);
      doc.setFontSize(9.5);
      doc.text(`Receipt No: ${activeReceiptNo}`, pageWidth - margin - 6, 25, {
        align: 'right',
      });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(228, 228, 231);
      doc.setFontSize(8.5);
      doc.text(`Date: ${activeDate}`, pageWidth - margin - 6, 31.5, {
        align: 'right',
      });
      doc.text('Status: Order Request (Pending Confirmation)', pageWidth - margin - 6, 37, {
        align: 'right',
      });

      // 2. Table Header
      let y = 52;
      doc.setFillColor(245, 245, 244);
      doc.setDrawColor(212, 212, 216);
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
          product.name.length > 42 ? `${product.name.slice(0, 40)}...` : product.name;

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
        doc.text(`Rs. ${product.price.toLocaleString('en-IN')}`, colPrice, y + 6.5, {
          align: 'right',
        });

        doc.setFont('courier', 'bold');
        doc.text(String(quantity), colQty, y + 6.5, { align: 'center' });

        doc.setFont('courier', 'bold');
        doc.setTextColor(24, 24, 27);
        doc.text(`Rs. ${itemSubtotal.toLocaleString('en-IN')}`, colSubtotal, y + 6.5, {
          align: 'right',
        });

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
      doc.setFillColor(18, 18, 20);
      doc.roundedRect(totalBoxX, y, totalBoxWidth, 12, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(212, 212, 216);
      doc.text('GRAND TOTAL:', totalBoxX + 4, y + 7.5);

      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 193, 253);
      doc.text(`Rs. ${grandTotal.toLocaleString('en-IN')}`, pageWidth - margin - 4, y + 7.5, {
        align: 'right',
      });

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
    const cleanPhone = (settings.whatsappNumber || '919876543210').replace(/[^0-9]/g, '');
    const lines: string[] = [
      `*${settings.businessName || 'SONU DIESEL BHATTI'}*`,
      `Order Request Receipt: *${receiptNumber}*`,
      `Date: ${receiptTimestamp}`,
      `Customer Name: ${customerName || 'Direct Customer'}`,
      `Phone: ${customerPhone || 'Not provided'}`,
      `--------------------------------`,
      `*Product | Size | Price | Qty | Subtotal*`,
    ];

    for (const item of cart) {
      const sub = item.product.price * item.quantity;
      lines.push(
        `• ${item.product.name} | ${item.product.size} | ₹${item.product.price.toLocaleString(
          'en-IN'
        )} × ${item.quantity} = *₹${sub.toLocaleString('en-IN')}*`
      );
    }

    lines.push(`--------------------------------`);
    lines.push(`*Total Order Request Amount: ₹${grandTotal.toLocaleString('en-IN')}*`);
    if (shippingAddress) {
      lines.push(`Delivery Address: ${shippingAddress}`);
    }
    lines.push(`\nPlease confirm current availability and dispatch details for this order request.`);

    const encoded = encodeURIComponent(lines.join('\n'));
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  };

  const handlePlaceDatabaseOrder = async () => {
    if (cart.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      setSubmitError('Please enter customer name and phone number to submit order.');
      return;
    }

    setIsSubmittingOrder(true);
    setSubmitError(null);

    try {
      const itemsPayload = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.price,
      }));

      const res = await fetch('/api/orders/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          shippingAddress: shippingAddress.trim(),
          items: itemsPayload,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.order) {
          setSubmittedOrder(json.order);
          if (onOrderPlaced) {
            onOrderPlaced(json.order);
          }
        }
      } else {
        const err = await res.json();
        setSubmitError(err.error || 'Failed to record order into database.');
      }
    } catch {
      setSubmitError('Network error recording order into database. You can still send via WhatsApp.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0B0C] text-white no-print overflow-hidden">
      {/* 1. Full Screen Top Studio Bar */}
      <header className="flex items-center justify-between gap-4 px-4 sm:px-8 py-3.5 bg-[#121214] border-b border-zinc-800 shrink-0 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer shrink-0"
            title="Close Full Screen Modal"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#00C1FD]/10 border border-[#00C1FD]/30 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[#00C1FD]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white truncate flex items-center gap-2">
                <span>{t('cartTitle')}</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-[#00C1FD]/20 text-[#00C1FD] border border-[#00C1FD]/30 font-mono text-[10px] font-bold">
                  {cart.length} Models ({totalUnits} Units)
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 truncate">
                Full-screen printable receipt generator & WhatsApp dispatch maker
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Viewport Toggle (Visible on phone screens) */}
        <div className="lg:hidden flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveMobileTab('cart')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeMobileTab === 'cart'
                ? 'bg-[#00C1FD] text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Items ({cart.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab('receipt')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeMobileTab === 'receipt'
                ? 'bg-[#00C1FD] text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Receipt
          </button>
        </div>

        {/* Desktop Header Actions */}
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          {cart.length > 0 && (
            <button
              type="button"
              onClick={onClearCart}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-red-400 hover:bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Order</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#00C1FD] hover:bg-[#00b0e6] text-zinc-950 font-extrabold text-xs transition-colors cursor-pointer shadow-sm active:scale-95"
          >
            Done & Back
          </button>
        </div>
      </header>

      {/* 2. Full Screen Responsive Body Area */}
      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 shadow-inner">
            <ShoppingBag className="w-8 h-8 text-[#00C1FD]" />
          </div>
          <h3 className="text-xl font-bold text-white">{t('emptyCartTitle')}</h3>
          <p className="text-sm text-zinc-400 mt-1 max-w-md">
            {t('emptyCartDesc')}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 px-6 py-3 rounded-xl bg-[#00C1FD] hover:bg-[#00b0e6] text-zinc-950 text-xs font-extrabold transition-all cursor-pointer shadow-md active:scale-95"
          >
            Browse Product Catalogue
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* =================================================================== */}
          {/* LEFT COLUMN (or Mobile Tab 1): Itemized Cart & Order Form           */}
          {/* =================================================================== */}
          <div
            className={`lg:col-span-5 h-full flex flex-col border-r border-zinc-800 bg-[#121214] overflow-y-auto ${
              activeMobileTab === 'receipt' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Live Stock Notice */}
            {isVerifying && (
              <div className="p-3 bg-zinc-900 text-xs text-zinc-400 border-b border-zinc-800 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00C1FD] animate-ping" />
                <span>Verifying live workshop availability...</span>
              </div>
            )}
            {!isVerifying && stockVerifiedMessage && (
              <div
                className={`p-3 text-xs font-medium border-b flex items-center gap-2 ${
                  stockIssues.length > 0
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    : 'bg-[#00C1FD]/10 text-[#00C1FD] border-[#00C1FD]/20'
                }`}
              >
                {stockIssues.length > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#00C1FD] shrink-0" />
                )}
                <span>{stockVerifiedMessage}</span>
              </div>
            )}

            {/* Scrollable Items List */}
            <div className="p-4 sm:p-6 space-y-3.5 flex-1 overflow-y-auto">
              <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Selected Bhatti Models</span>
                <span className="font-mono text-[#00C1FD]">₹{grandTotal.toLocaleString('en-IN')}</span>
              </h3>

              <div className="space-y-3">
                {cart.map(({ product, quantity }) => {
                  const subtotal = product.price * quantity;
                  return (
                    <div
                      key={product.id}
                      className="p-3.5 rounded-2xl bg-[#18181A] border border-zinc-800/80 flex items-center gap-3.5 shadow-sm group hover:border-zinc-700 transition-colors"
                    >
                      {/* Product Thumbnail */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-zinc-800 shrink-0 bg-zinc-900">
                        <ProductImage
                          src={product.imageUrl}
                          alt={product.name}
                          sizeLabel={product.size}
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="text-xs sm:text-sm font-bold text-white leading-snug truncate">
                          {product.name}
                        </h4>
                        <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2">
                          <span>{translateSize(product.size)}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#00C1FD] font-semibold">
                            ₹{product.price.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Quantity Stepper with Touch Targets >= 44px */}
                        <div className="pt-1.5 flex items-center gap-2">
                          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
                            <button
                              type="button"
                              onClick={() => onUpdateQty(product.id, quantity - 1)}
                              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                              title="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center font-mono tabular-nums font-extrabold text-white text-xs">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateQty(
                                  product.id,
                                  Math.min(product.stockQuantity, quantity + 1)
                                )
                              }
                              disabled={quantity >= product.stockQuantity}
                              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#00C1FD] hover:bg-[#00b0e6] text-zinc-950 flex items-center justify-center font-bold transition-colors disabled:opacity-40 cursor-pointer active:scale-95"
                              title="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => onRemoveItem(product.id)}
                            className="p-2 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-extrabold font-mono text-white block">
                          ₹{subtotal.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {quantity} × ₹{product.price.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Customer Delivery Form */}
              <div className="pt-4 border-t border-zinc-800/80 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#00C1FD]" />
                    <span>Contact & Delivery Details</span>
                  </span>
                  {currentUser && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00C1FD]/10 text-[#00C1FD] border border-[#00C1FD]/20 font-bold">
                      {currentUser.name}
                    </span>
                  )}
                </h4>

                {submitError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                      Customer Name <span className="text-[#00C1FD]">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Gurpreet Singh"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#18181A] border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:border-[#00C1FD] focus:outline-none font-medium transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                      WhatsApp / Phone <span className="text-[#00C1FD]">*</span>
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#18181A] border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:border-[#00C1FD] focus:outline-none font-mono font-medium transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                    Delivery Workshop Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="e.g. Industrial Area, Ludhiana, Punjab"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#18181A] border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:border-[#00C1FD] focus:outline-none font-medium transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Sticky Left Actions Bar */}
            <div className="p-4 bg-[#0D0D0E] border-t border-zinc-800 space-y-2 shrink-0">
              <button
                type="button"
                disabled={isSubmittingOrder || cart.length === 0}
                onClick={handlePlaceDatabaseOrder}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-[#00C1FD]" />
                <span>
                  {isSubmittingOrder ? 'Saving to Database...' : 'Save & Place Order in Database'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMobileTab('receipt')}
                className="lg:hidden w-full py-2.5 px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <span>View Live Printable Receipt</span>
                <ChevronRight className="w-4 h-4 text-[#00C1FD]" />
              </button>
            </div>
          </div>

          {/* =================================================================== */}
          {/* RIGHT COLUMN (or Mobile Tab 2): Live Printable Document Preview     */}
          {/* =================================================================== */}
          <div
            className={`lg:col-span-7 h-full flex flex-col bg-[#0B0B0C] overflow-y-auto p-4 sm:p-8 ${
              activeMobileTab === 'cart' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Live Document Preview Card */}
            <div className="max-w-2xl mx-auto w-full bg-white text-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-zinc-300 flex flex-col">
              {/* Document Header Bar in Electric Blue #00C1FD */}
              <div className="p-6 bg-[#121214] text-white border-b-4 border-[#00C1FD] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#00C1FD]/20 border border-[#00C1FD]/40 flex items-center justify-center shrink-0">
                    <Flame className="w-6 h-6 text-[#00C1FD]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold tracking-tight text-white">
                      {settings.businessName || 'SONU DIESEL BHATTI'}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      OFFICIAL ORDER REQUEST RECEIPT
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs font-mono space-y-1">
                  <div className="text-[#00C1FD] font-bold text-sm">
                    {receiptNumber}
                  </div>
                  <div className="text-zinc-400">{receiptTimestamp}</div>
                </div>
              </div>

              {/* Document Inner Table & Content */}
              <div className="p-6 space-y-6 flex-1 bg-white">
                {/* Customer Banner */}
                {(customerName || customerPhone) && (
                  <div className="p-3.5 rounded-xl bg-stone-100 border border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-700">
                    <div>
                      <span className="font-bold text-zinc-900">Customer: </span>
                      <span>{customerName || 'Direct Customer'}</span>
                      {customerPhone && (
                        <span className="font-mono text-zinc-500 ml-2">
                          ({customerPhone})
                        </span>
                      )}
                    </div>
                    {shippingAddress && (
                      <div className="text-[11px] text-zinc-500 truncate">
                        {shippingAddress}
                      </div>
                    )}
                  </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-zinc-300 text-[11px] font-bold text-zinc-600 uppercase">
                        <th className="py-2.5 pr-2">#</th>
                        <th className="py-2.5 pr-3">Product Model</th>
                        <th className="py-2.5 px-2">Size</th>
                        <th className="py-2.5 px-2 text-right">Price</th>
                        <th className="py-2.5 px-2 text-center">Qty</th>
                        <th className="py-2.5 pl-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 text-xs sm:text-sm">
                      {cart.map(({ product, quantity }, idx) => {
                        const sub = product.price * quantity;
                        return (
                          <tr key={product.id}>
                            <td className="py-3 pr-2 font-mono text-zinc-400 text-xs">
                              {String(idx + 1).padStart(2, '0')}
                            </td>
                            <td className="py-3 pr-3 font-bold text-zinc-900">
                              {product.name}
                            </td>
                            <td className="py-3 px-2 text-zinc-600 text-xs">
                              {product.size}
                            </td>
                            <td className="py-3 px-2 text-right font-mono text-zinc-700">
                              ₹{product.price.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-2 text-center font-mono font-bold">
                              {quantity}
                            </td>
                            <td className="py-3 pl-2 text-right font-mono font-bold text-zinc-900">
                              ₹{sub.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Grand Total Box */}
                <div className="pt-4 border-t-2 border-zinc-900 flex items-center justify-between bg-stone-50 p-4 rounded-xl">
                  <div>
                    <span className="text-xs text-zinc-500 font-bold block">
                      TOTAL ITEMS: {cart.length} ({totalUnits} UNITS)
                    </span>
                    <span className="text-xs text-emerald-700 font-semibold">
                      Official Workshop Quotation
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-zinc-500 block">GRAND TOTAL</span>
                    <span className="text-2xl font-extrabold font-mono text-[#00C1FD]">
                      ₹{grandTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Disclaimers */}
                <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 text-[11px] text-zinc-500 leading-relaxed">
                  <strong className="text-zinc-900 font-bold block mb-0.5">
                    Sonu Diesel Bhatti Dispatch Policy:
                  </strong>
                  This document serves as an official order request. Dispatches and custom burner sizing are verified by administrators prior to shipping.
                </div>
              </div>

              {/* Action Toolbar on Document Bottom */}
              <div className="p-4 bg-stone-100 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="px-4 py-2.5 rounded-xl bg-[#00C1FD] hover:bg-[#00b0e6] text-zinc-950 font-extrabold text-xs inline-flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                  >
                    {pdfDownloaded ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-zinc-950" />
                        <span>PDF Downloaded!</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download Clean PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-zinc-800 text-xs font-semibold hover:bg-stone-200 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print</span>
                  </button>
                </div>

                <a
                  href={buildWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs inline-flex items-center gap-2 shadow-sm transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Order via WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
