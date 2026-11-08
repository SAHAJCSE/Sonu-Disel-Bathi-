import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import {
  AdminProfile,
  BusinessSettings,
  OfflineAction,
  Product,
  StockMovement,
} from '../types.ts';
import { ProductImage } from './ProductImage.tsx';
import { audioFeedback } from '../utils/audioFeedback.ts';
import { ImageCropperModal } from './ImageCropperModal.tsx';

interface AdminDashboardViewProps {
  currentAdmin: AdminProfile;
  admins: AdminProfile[];
  products: Product[];
  movements: StockMovement[];
  settings: BusinessSettings;
  authToken: string;
  isOnline: boolean;
  offlineQueue: OfflineAction[];
  isSyncing: boolean;
  activeTab: 'inventory' | 'history' | 'settings';
  onTabChange: (tab: 'inventory' | 'history' | 'settings') => void;
  onSyncNow: () => void;
  onLogout: () => void;
  onCreateProduct: (data: {
    name: string;
    size: string;
    imageUrl: string;
    price: number;
    stockQuantity: number;
    note?: string;
  }) => Promise<void>;
  onUpdateProduct: (
    productId: number,
    data: {
      name?: string;
      size?: string;
      imageUrl?: string;
      price?: number;
      stockQuantity?: number;
      stockNote?: string;
      isActive?: boolean;
    }
  ) => Promise<void>;
  onAdjustStock: (
    productId: number,
    actionType: 'ADD' | 'REMOVE' | 'ADJUST',
    amount: number,
    note?: string
  ) => Promise<void>;
  onDeleteProduct: (productId: number) => Promise<void>;
  onDeleteAll: () => Promise<void>;
  onUpdateSettings: (data: Partial<BusinessSettings>) => Promise<void>;
  onUpdateAdminProfile: (
    adminId: number,
    email: string,
    name: string,
    newPassword?: string
  ) => Promise<void>;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentAdmin,
  products,
  movements,
  settings,
  isOnline,
  offlineQueue,
  isSyncing,
  onSyncNow,
  onLogout,
  onCreateProduct,
  onUpdateProduct,
  onAdjustStock,
  onDeleteProduct,
  onDeleteAll,
  onUpdateSettings,
  activeTab,
  onTabChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Stock Adjust Modal State
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);
  const [stockAmount, setStockAmount] = useState<string>('0');
  const [stockNote, setStockNote] = useState<string>('');

  // Create / Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Business Settings Form State
  const [businessNameInput, setBusinessNameInput] = useState(settings.businessName || 'SONU DIESEL BHATTI');
  const [whatsappInput, setWhatsappInput] = useState(settings.whatsappNumber || '918708381844');
  const [thresholdInput, setThresholdInput] = useState(String(settings.lowStockThreshold || 10));

  const showTempMessage = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  /**
   * Export Current Inventory List as a Formatted Monochrome A4 PDF
   */
  const handleExportInventoryPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    const nowStr = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const brandTitle = (settings.businessName || 'SONU DIESEL BHATTI').toUpperCase();

    const drawHeader = (pageNum: number) => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(margin, 10, contentWidth, 277);

      doc.setFillColor(0, 0, 0);
      doc.rect(margin, 10, contentWidth, 16, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`${brandTitle} — CURRENT INVENTORY LIST`, margin + 4, 17);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Generated: ${nowStr}  |  Page ${pageNum}`, pageWidth - margin - 4, 17, {
        align: 'right',
      });
      doc.text(`WhatsApp / Contact: +${settings.whatsappNumber || '918708381844'}`, margin + 4, 23);

      doc.setTextColor(0, 0, 0);
    };

    let pageNum = 1;
    drawHeader(pageNum);

    const totalSKUs = products.length;
    const totalUnits = products.reduce((sum, p) => sum + (p.stockQuantity || 0), 0);
    const totalValue = products.reduce((sum, p) => sum + p.price * (p.stockQuantity || 0), 0);
    const outOfStockCount = products.filter((p) => p.stockQuantity <= 0).length;

    let y = 32;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(
      `Total Models: ${totalSKUs}    |    Total Units: ${totalUnits}    |    Out of Stock: ${outOfStockCount}    |    Total Valuation: Rs. ${totalValue.toLocaleString('en-IN')}`,
      margin + 4,
      y
    );

    y += 4;
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);

    const drawTableHeader = (topY: number) => {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin + 0.3, topY, contentWidth - 0.6, 8, 'F');
      doc.setLineWidth(0.3);
      doc.line(margin, topY + 8, pageWidth - margin, topY + 8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('S.N.', margin + 3, topY + 5.3);
      doc.text('CODE', margin + 14, topY + 5.3);
      doc.text('PRODUCT / MODEL NAME', margin + 32, topY + 5.3);
      doc.text('SIZE', margin + 104, topY + 5.3);
      doc.text('PRICE (Rs.)', margin + 136, topY + 5.3, { align: 'right' });
      doc.text('STOCK', margin + 156, topY + 5.3, { align: 'right' });
      doc.text('VALUE (Rs.)', margin + 183, topY + 5.3, { align: 'right' });
      return topY + 8;
    };

    y = drawTableHeader(y);

    products.forEach((product, idx) => {
      if (y + 8 > 276) {
        doc.addPage();
        pageNum += 1;
        drawHeader(pageNum);
        y = drawTableHeader(28);
      }

      const qty = product.stockQuantity || 0;
      const lineVal = product.price * qty;
      const cleanName = product.name.length > 36 ? `${product.name.slice(0, 34)}..` : product.name;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(String(idx + 1).padStart(2, '0'), margin + 3, y + 5.2);
      doc.text(`#SDB-${String(product.id).padStart(2, '0')}`, margin + 14, y + 5.2);

      doc.setFont('helvetica', 'bold');
      doc.text(cleanName, margin + 32, y + 5.2);

      doc.setFont('helvetica', 'normal');
      doc.text(product.size, margin + 104, y + 5.2);
      doc.text(product.price.toLocaleString('en-IN'), margin + 136, y + 5.2, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.text(qty <= 0 ? '0 (OUT)' : String(qty), margin + 156, y + 5.2, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.text(lineVal.toLocaleString('en-IN'), margin + 183, y + 5.2, { align: 'right' });

      y += 7.5;
      doc.setDrawColor(215, 215, 215);
      doc.setLineWidth(0.15);
      doc.line(margin, y, pageWidth - margin, y);
      doc.setDrawColor(0, 0, 0);
    });

    doc.save(`Sonu-Diesel-Bhatti-Inventory-${new Date().toISOString().slice(0, 10)}.pdf`);
    audioFeedback.play('click');
    showTempMessage(`Exported ${products.length} products to Inventory PDF.`);
  };

  /**
   * Export Stock Movement History as a Formatted Monochrome A4 PDF
   */
  const handleExportMovementsPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    const nowStr = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const brandTitle = (settings.businessName || 'SONU DIESEL BHATTI').toUpperCase();

    const drawHeader = (pageNum: number) => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(margin, 10, contentWidth, 277);

      doc.setFillColor(0, 0, 0);
      doc.rect(margin, 10, contentWidth, 16, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`${brandTitle} — STOCK MOVEMENT HISTORY`, margin + 4, 17);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Generated: ${nowStr}  |  Page ${pageNum}`, pageWidth - margin - 4, 17, {
        align: 'right',
      });
      doc.text(`Total Recorded Movements: ${movements.length} entries`, margin + 4, 23);

      doc.setTextColor(0, 0, 0);
    };

    let pageNum = 1;
    drawHeader(pageNum);

    const drawTableHeader = (topY: number) => {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin + 0.3, topY, contentWidth - 0.6, 8, 'F');
      doc.setLineWidth(0.3);
      doc.line(margin, topY + 8, pageWidth - margin, topY + 8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('DATE & TIME', margin + 3, topY + 5.3);
      doc.text('PRODUCT & SIZE', margin + 38, topY + 5.3);
      doc.text('ACTION', margin + 98, topY + 5.3);
      doc.text('PREV', margin + 122, topY + 5.3, { align: 'right' });
      doc.text('DELTA', margin + 137, topY + 5.3, { align: 'right' });
      doc.text('NEW', margin + 150, topY + 5.3, { align: 'right' });
      doc.text('NOTE', margin + 154, topY + 5.3);
      return topY + 8;
    };

    let y = drawTableHeader(28);

    if (movements.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('No stock movement history recorded yet.', margin + 6, y + 10);
    } else {
      movements.forEach((m) => {
        if (y + 8 > 276) {
          doc.addPage();
          pageNum += 1;
          drawHeader(pageNum);
          y = drawTableHeader(28);
        }

        const dateStr = new Date(m.createdAt).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });

        const prodLabel = `${m.productName} (${m.productSize})`;
        const cleanProd = prodLabel.length > 31 ? `${prodLabel.slice(0, 29)}..` : prodLabel;
        const delta = m.newQuantity - m.previousQuantity;
        const deltaStr = delta > 0 ? `+${delta}` : String(delta);
        const rawNote = m.note || '-';
        const cleanNote = rawNote.length > 18 ? `${rawNote.slice(0, 16)}..` : rawNote;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(dateStr, margin + 3, y + 5.2);

        doc.setFont('helvetica', 'bold');
        doc.text(cleanProd, margin + 38, y + 5.2);

        doc.setFont('helvetica', 'normal');
        doc.text(String(m.actionType || 'UPDATE').toUpperCase(), margin + 98, y + 5.2);
        doc.text(String(m.previousQuantity), margin + 122, y + 5.2, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.text(deltaStr, margin + 137, y + 5.2, { align: 'right' });
        doc.text(String(m.newQuantity), margin + 150, y + 5.2, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.text(cleanNote, margin + 154, y + 5.2);

        y += 7.5;
        doc.setDrawColor(215, 215, 215);
        doc.setLineWidth(0.15);
        doc.line(margin, y, pageWidth - margin, y);
        doc.setDrawColor(0, 0, 0);
      });
    }

    doc.save(`Sonu-Diesel-Bhatti-Stock-History-${new Date().toISOString().slice(0, 10)}.pdf`);
    audioFeedback.play('click');
    showTempMessage(`Exported ${movements.length} movements to Stock History PDF.`);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setCroppingImage(event.target.result);
      }
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleSaveProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const cleanName = (editingProduct.name || '').trim() || 'Diesel Bhatti';
    const cleanSize = editingProduct.size || 'Medium';
    const cleanImage =
      editingProduct.imageUrl || '/images/bhatti_medium_model_1794033586446.jpg';
    const cleanPrice = Number(editingProduct.price) || 2500;
    const cleanStock = Number(editingProduct.stockQuantity) || 0;
    const cleanActive = editingProduct.isActive ?? true;
    const targetId = editingProduct.id;
    const creatingMode = isCreating;

    // Close modal & show confirmation immediately so user gets instant feedback and cannot double-submit
    setEditingProduct(null);
    setIsCreating(false);
    audioFeedback.play('stock_update');

    if (creatingMode) {
      showTempMessage(`Added "${cleanName}" to live catalogue.`);
      await onCreateProduct({
        name: cleanName,
        size: cleanSize,
        imageUrl: cleanImage,
        price: cleanPrice,
        stockQuantity: cleanStock,
        note: 'Created via Admin Portal',
      });
    } else if (targetId !== undefined) {
      showTempMessage(`Updated "${cleanName}".`);
      await onUpdateProduct(targetId, {
        name: cleanName,
        size: cleanSize,
        imageUrl: cleanImage,
        price: cleanPrice,
        stockQuantity: cleanStock,
        isActive: cleanActive,
      });
    }
  };

  const handleSetStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalProduct) return;
    const target = parseInt(stockAmount, 10);
    if (isNaN(target) || target < 0) return;

    await onAdjustStock(
      stockModalProduct.id,
      'ADJUST',
      target,
      stockNote || 'Admin manual stock set'
    );
    setStockModalProduct(null);
    setStockNote('');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings({
      businessName: businessNameInput.trim() || 'SONU DIESEL BHATTI',
      whatsappNumber: whatsappInput.trim() || '918708381844',
      lowStockThreshold: Math.max(1, parseInt(thresholdInput, 10) || 10),
    });
    showTempMessage('Settings saved.');
  };

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.size.toLowerCase().includes(q) ||
      String(p.id).includes(q)
    );
  });

  const totalUnits = products.reduce((sum, p) => sum + (p.stockQuantity || 0), 0);
  const lowStockCount = products.filter(
    (p) => p.stockQuantity > 0 && p.stockQuantity <= (settings.lowStockThreshold || 10)
  ).length;
  const outOfStockCount = products.filter((p) => p.stockQuantity <= 0).length;
  const totalValue = products.reduce((sum, p) => sum + p.price * (p.stockQuantity || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans text-zinc-950 dark:text-zinc-50 transition-colors">
      {/* Top Header & PDF Export Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Admin Dashboard
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
              {currentAdmin.name}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Inventory, pricing, and stock movement records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportInventoryPdf}
            className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-950 dark:text-zinc-50 text-xs font-medium transition-colors cursor-pointer"
          >
            Export Inventory PDF
          </button>
          <button
            type="button"
            onClick={handleExportMovementsPdf}
            className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-950 dark:text-zinc-50 text-xs font-medium transition-colors cursor-pointer"
          >
            Export History PDF
          </button>
          {offlineQueue.length > 0 && isOnline && (
            <button
              type="button"
              onClick={onSyncNow}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-md border border-zinc-950 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 text-xs font-medium cursor-pointer"
            >
              {isSyncing ? 'Syncing...' : `Sync (${offlineQueue.length})`}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsCreating(true);
              setEditingProduct({
                name: '',
                size: 'Medium',
                price: 2500,
                stockQuantity: 20,
                imageUrl: '/images/bhatti_medium_model_1794033586446.jpg',
                isActive: true,
              });
            }}
            className="px-3.5 py-1.5 rounded-md bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            + Add Product
          </button>
          <button
            type="button"
            onClick={async () => {
              if (window.confirm('WARNING: This will permanently delete ALL products and stock history from the catalogue. Are you absolutely sure?')) {
                audioFeedback.play('delete');
                showTempMessage('Clearing entire catalogue...');
                await onDeleteAll();
              }
            }}
            className="px-3 py-1.5 rounded-md border border-red-300 dark:border-red-900 bg-white dark:bg-zinc-950 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-medium transition-colors cursor-pointer"
          >
            Delete All
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 text-xs font-medium transition-colors cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-md bg-zinc-950 text-white text-xs font-medium flex items-center justify-between">
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="font-mono underline text-zinc-300 hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-4 transition-colors">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
            Total Units
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-950 dark:text-zinc-50 mt-1">
            {totalUnits}
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{products.length} Models</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-4 transition-colors">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
            Inventory Value
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-950 dark:text-zinc-50 mt-1">
            ₹{totalValue.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Total stock worth</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-4 transition-colors">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
            Low Stock
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-950 dark:text-zinc-50 mt-1">
            {lowStockCount}
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Threshold ≤ {settings.lowStockThreshold || 10}
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-4 transition-colors">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
            Out of Stock
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-950 dark:text-zinc-50 mt-1">
            {outOfStockCount}
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Zero quantity</span>
        </div>
      </div>

      {/* Navigation Tabs & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-md border border-zinc-200 dark:border-zinc-800 w-fit transition-colors">
          <button
            type="button"
            onClick={() => onTabChange('inventory')}
            className={`px-3.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'
            }`}
          >
            Inventory ({products.length})
          </button>
          <button
            type="button"
            onClick={() => onTabChange('history')}
            className={`px-3.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'
            }`}
          >
            Stock History ({movements.length})
          </button>
          <button
            type="button"
            onClick={() => onTabChange('settings')}
            className={`px-3.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'
            }`}
          >
            Settings
          </button>
        </div>

        {activeTab === 'inventory' && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter models..."
              className="w-full sm:w-64 px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-950 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-50 transition-colors"
            />
            <button
              type="button"
              onClick={handleExportInventoryPdf}
              className="px-3 py-1.5 rounded-md bg-zinc-950 text-white text-xs font-medium hover:bg-zinc-800 cursor-pointer whitespace-nowrap"
            >
              Download PDF
            </button>
          </div>
        )}

        {activeTab === 'history' && (
          <button
            type="button"
            onClick={handleExportMovementsPdf}
            className="px-3.5 py-1.5 rounded-md bg-zinc-950 text-white text-xs font-medium hover:bg-zinc-800 cursor-pointer w-fit"
          >
            Download Stock History PDF
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'inventory' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-mono uppercase text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/50">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Quick Adjust</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs sm:text-sm">
                {filteredProducts.map((product) => {
                  const out = product.stockQuantity <= 0;
                  return (
                    <tr key={product.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden shrink-0">
                            <ProductImage
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-950 dark:text-zinc-50 text-xs sm:text-sm">
                              {product.name}
                            </div>
                            <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                              #SDB-{String(product.id).padStart(2, '0')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                        {product.size}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-bold text-zinc-950 dark:text-zinc-50">
                        ₹{product.price.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-mono text-xs font-medium border ${
                            out
                              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border-zinc-300 dark:border-zinc-700 line-through'
                              : 'bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 border-zinc-950 dark:border-zinc-100'
                          }`}
                        >
                          {product.stockQuantity} units
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={product.stockQuantity <= 0}
                            onClick={() =>
                              onAdjustStock(product.id, 'REMOVE', 1, 'Quick -1')
                            }
                            className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-mono text-xs text-zinc-950 dark:text-zinc-50 disabled:opacity-40 cursor-pointer transition-colors"
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onAdjustStock(product.id, 'ADD', 1, 'Quick +1')
                            }
                            className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-mono text-xs text-zinc-950 dark:text-zinc-50 cursor-pointer transition-colors"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onAdjustStock(product.id, 'ADD', 5, 'Quick +5')
                            }
                            className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-mono text-xs text-zinc-950 dark:text-zinc-50 cursor-pointer transition-colors"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStockModalProduct(product);
                              setStockAmount(String(product.stockQuantity));
                              setStockNote('');
                            }}
                            className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-mono text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer transition-colors"
                          >
                            Set
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreating(false);
                              setEditingProduct({ ...product });
                            }}
                            className="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-950 dark:text-zinc-50 cursor-pointer transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteProduct(product.id)}
                            className="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-950 dark:hover:bg-zinc-50 hover:text-white dark:hover:text-zinc-950 text-xs font-medium transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden transition-colors">
          {movements.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-zinc-500 dark:text-zinc-400">
              No stock movements recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-mono uppercase text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/50">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Stock Change</th>
                    <th className="py-3 px-4">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                  {movements.map((m) => {
                    const delta = m.newQuantity - m.previousQuantity;
                    return (
                      <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-zinc-500 dark:text-zinc-400">
                          {new Date(m.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-950 dark:text-zinc-50">
                          {m.productName}{' '}
                          <span className="font-mono font-normal text-zinc-500 dark:text-zinc-400">
                            ({m.productSize})
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono uppercase text-zinc-700 dark:text-zinc-300">
                          {m.actionType}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="text-zinc-500 dark:text-zinc-400">{m.previousQuantity} → </span>
                          <strong className="text-zinc-950 dark:text-zinc-50">{m.newQuantity}</strong>{' '}
                          <span className="text-zinc-600 dark:text-zinc-300">
                            ({delta > 0 ? `+${delta}` : delta})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{m.note || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-6 max-w-lg space-y-4 transition-colors"
        >
          <h2 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">Workshop Settings</h2>

          <div>
            <label className="block text-xs font-mono uppercase text-zinc-600 mb-1">
              Business Name
            </label>
            <input
              type="text"
              required
              value={businessNameInput}
              onChange={(e) => setBusinessNameInput(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-950 dark:text-zinc-50 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-zinc-600 mb-1">
              Admin WhatsApp Number (with country code)
            </label>
            <input
              type="text"
              required
              value={whatsappInput}
              onChange={(e) => setWhatsappInput(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 text-xs font-mono bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-zinc-600 mb-1">
              Low Stock Alert Threshold
            </label>
            <input
              type="number"
              min="1"
              required
              value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 text-xs font-mono bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 transition-colors"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-medium cursor-pointer"
          >
            Save Settings
          </button>
        </form>
      )}

      {/* Set Exact Stock Modal */}
      {stockModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-colors">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md max-w-md w-full p-6 shadow-xl transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">Set Stock Count</h3>
              <button
                type="button"
                onClick={() => setStockModalProduct(null)}
                className="text-xs font-mono text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4">
              {stockModalProduct.name} ({stockModalProduct.size})
            </p>
            <form onSubmit={handleSetStockSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-500 mb-1">
                  Exact Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stockAmount}
                  onChange={(e) => setStockAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 font-mono text-sm text-zinc-950 dark:text-zinc-50 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-500 mb-1">
                  Note
                </label>
                <input
                  type="text"
                  value={stockNote}
                  onChange={(e) => setStockNote(e.target.value)}
                  placeholder="Optional stock audit note"
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-950 dark:text-zinc-50 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 transition-colors"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStockModalProduct(null)}
                  className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-950 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-zinc-950 text-white text-xs font-medium cursor-pointer"
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto transition-colors">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md max-w-lg w-full p-6 shadow-xl my-8 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
                {isCreating ? 'Add Product' : `Edit ${editingProduct.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-xs font-mono text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveProductForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-500 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, name: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-950 dark:text-zinc-50 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-500 mb-1">
                    Size
                  </label>
                  <select
                    value={editingProduct.size || 'Medium'}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, size: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 text-xs bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 transition-colors"
                  >
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                    <option value="Extra Large">Extra Large</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-500 mb-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduct.price ?? 0}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        price: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs font-mono text-zinc-950 dark:text-zinc-50 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-500 mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduct.stockQuantity ?? 0}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        stockQuantity: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs font-mono text-zinc-950 dark:text-zinc-50 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-500 dark:text-zinc-400 mb-1">
                  Product Image
                </label>
                <div className="flex items-center gap-3 p-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50">
                  <div className="w-14 h-14 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden shrink-0">
                    <ProductImage
                      src={
                        editingProduct.imageUrl ||
                        '/images/bhatti_medium_model_1794033586446.jpg'
                      }
                      alt={editingProduct.name || 'Preview'}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1 rounded bg-zinc-950 text-white text-xs font-medium cursor-pointer"
                      >
                        Upload File
                      </button>
                    </div>
                    <input
                      type="text"
                      value={
                        editingProduct.imageUrl?.startsWith('data:')
                          ? ''
                          : editingProduct.imageUrl || ''
                      }
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          imageUrl: e.target.value,
                        })
                      }
                      placeholder="Or paste image URL..."
                      className="w-full px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs font-mono text-zinc-950 dark:text-zinc-50 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-3.5 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-950 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-zinc-950 text-white text-xs font-medium cursor-pointer"
                >
                  {isCreating ? 'Create' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {croppingImage && (
        <ImageCropperModal
          image={croppingImage}
          onCropComplete={(croppedUrl) => {
            setEditingProduct((prev) => (prev ? { ...prev, imageUrl: croppedUrl } : prev));
            setCroppingImage(null);
          }}
          onCancel={() => setCroppingImage(null)}
          aspectRatio={4 / 3}
        />
      )}
    </div>
  );
};
