import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Camera,
  Image as ImageIcon,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  PlusCircle,
  Sparkles,
  Check,
} from 'lucide-react';
import { Product } from '../types.ts';
import { useTranslation } from '../i18n/LanguageContext.tsx';
import { LANGUAGE_META, LanguageCode } from '../i18n/translations.ts';
import { compressImageFile } from '../utils/imageUtils.ts';
import { ImageUploaderField } from './ImageUploaderField.tsx';

export const DEFAULT_BHATTI_PHOTOS: Record<string, string> = {
  Small: '/images/bhatti_small_model_1794033585976.jpg',
  Medium: '/images/bhatti_medium_model_1794033586446.jpg',
  Large: '/images/bhatti_large_model_1794033589239.jpg',
  'Extra Large': '/images/bhatti_jumbo_double_1794033588535.jpg',
};

interface AdminSmartEntryProps {
  products: Product[];
  authToken: string;
  isOnline: boolean;
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
    data: { name?: string; size?: string; imageUrl?: string; price?: number }
  ) => Promise<void>;
  onAdjustStock: (
    productId: number,
    actionType: 'ADD' | 'REMOVE' | 'ADJUST',
    amount: number,
    note?: string
  ) => Promise<void>;
}

interface ParsedVoicePreview {
  intent: 'CREATE_PRODUCT' | 'UPDATE_STOCK' | 'UPDATE_PRICE' | 'UPDATE_BOTH';
  matchedProductId: number;
  isAmbiguous: boolean;
  ambiguousProductIds: number[];
  name: string;
  size: string;
  price: number;
  stockActionType: 'ADD' | 'REMOVE' | 'ADJUST';
  stockAmount: number;
  summaryText: string;
  imageUrl?: string;
}

interface OcrExtractedItem {
  matchedProductId: number;
  name: string;
  size: string;
  price: number;
  stockQuantity: number;
  uncertainFields: string[];
  saved?: boolean;
}

export const AdminSmartEntry: React.FC<AdminSmartEntryProps> = ({
  products,
  authToken,
  isOnline,
  onCreateProduct,
  onUpdateProduct,
  onAdjustStock,
}) => {
  const { t, lang } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<'manual' | 'voice' | 'ocr'>(
    'manual'
  );

  // ==========================================================================
  // C. MANUAL FORM STATE
  // ==========================================================================
  const [manualName, setManualName] = useState('');
  const [manualSize, setManualSize] = useState('Medium');
  const [manualPrice, setManualPrice] = useState('');
  const [manualStock, setManualStock] = useState('');
  const [manualImage, setManualImage] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    setManualSuccess(null);

    const priceNum = Number(manualPrice);
    const stockNum = Number(manualStock);
    if (
      !manualName.trim() ||
      !manualSize.trim() ||
      !manualImage.trim() ||
      isNaN(priceNum) ||
      priceNum <= 0 ||
      isNaN(stockNum) ||
      stockNum < 0
    ) {
      setManualError(t('validationAllFieldsReq'));
      return;
    }

    await onCreateProduct({
      name: manualName.trim(),
      size: manualSize,
      imageUrl: manualImage,
      price: Math.round(priceNum),
      stockQuantity: Math.round(stockNum),
      note: 'Added via Manual Form',
    });

    setManualName('');
    setManualPrice('');
    setManualStock('');
    setManualSuccess(`${manualName.trim()} saved to inventory.`);
  };

  // ==========================================================================
  // A. VOICE INPUT STATE (English, Hindi, Punjabi)
  // ==========================================================================
  const [voiceLang, setVoiceLang] = useState<LanguageCode>(lang);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isParsingVoice, setIsParsingVoice] = useState(false);
  const [voicePreview, setVoicePreview] = useState<ParsedVoicePreview | null>(
    null
  );
  const [isEditingVoicePreview, setIsEditingVoicePreview] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [voiceStep, setVoiceStep] = useState<'idle' | 'image' | 'confirm'>('idle');
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const toggleMicrophone = () => {
    setVoiceFeedback(null);
    setVoiceStep('idle');

    if (isListening) {
      isListeningRef.current = false;
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (transcript.trim()) {
        parseVoiceCommand(transcript);
      }
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceFeedback(
        'Browser speech recognition is unavailable in this browser window. You can click an example command below or type your command.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = LANGUAGE_META[voiceLang].speechLang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let currentSpokenText = '';

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
      };

      recognition.onresult = (event: any) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0]?.transcript || '';
        }
        currentSpokenText = text.trim();
        if (currentSpokenText) {
          setTranscript(currentSpokenText);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          isListeningRef.current = false;
          setIsListening(false);
          setVoiceFeedback('Microphone permission blocked. Please allow microphone access in your browser bar.');
        } else if (event.error === 'no-speech') {
          setVoiceFeedback('Listening... Please speak your command clearly into your microphone.');
        } else if (event.error !== 'aborted') {
          setVoiceFeedback(`Voice notice (${event.error}). You can also type or click an example command.`);
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch (err) {
            console.warn('Speech recognition restart notice:', err);
            isListeningRef.current = false;
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      isListeningRef.current = true;
      setIsListening(true);
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      isListeningRef.current = false;
      setIsListening(false);
      setVoiceFeedback('Could not access microphone. Please check browser permissions.');
    }
  };

  const parseVoiceCommand = async (commandText: string) => {
    const clean = commandText.trim();
    if (!clean) return;
    setIsParsingVoice(true);
    setVoiceFeedback(null);
    setIsEditingVoicePreview(false);

    try {
      if (isOnline) {
        const res = await fetch('/api/admin/ai/parse-voice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            transcript: clean,
            language: LANGUAGE_META[voiceLang].label,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.parsed) {
            const p = data.parsed as ParsedVoicePreview;
            p.imageUrl =
              DEFAULT_BHATTI_PHOTOS[p.size] || DEFAULT_BHATTI_PHOTOS.Medium;
            setVoicePreview(p);
            if (p.intent === 'CREATE_PRODUCT') {
              setVoiceStep('image');
            } else {
              setVoiceStep('confirm');
            }
            setIsParsingVoice(false);
            return;
          }
        }
      }

      // Offline deterministic voice parser
      const lower = clean.toLowerCase();
      let size = 'Medium';
      
      const sizeMatches = lower.match(/(\d+)\s*[xX\s]\s*(\d+)/);
      if (sizeMatches) {
        size = `${sizeMatches[1]}x${sizeMatches[2]}`;
      } else if (lower.includes('small') || lower.includes('chota')) {
        size = 'Small';
      } else if (lower.includes('extra large') || lower.includes('jumbo')) {
        size = 'Extra Large';
      } else if (lower.includes('large') || lower.includes('bada')) {
        size = 'Large';
      }

      const nums = clean.match(/\d+/g)?.map(Number) || [];
      const matches = products.filter(
        (prod) => prod.size.toLowerCase() === size.toLowerCase()
      );
      
      const isCreate =
        (lower.includes('add') || lower.includes('bathi') || lower.includes('bhatti') || lower.includes('nayi') || lower.includes('new')) &&
        (lower.includes('price') || lower.includes('ki') || lower.includes('₹') || nums.length >= 2);
      const isPrice = !isCreate && (lower.includes('price') || lower.includes('rate'));

      let price = 2500;
      let stock = 10;
      if (nums.length >= 2) {
        let remainingNums = [...nums];
        if (sizeMatches) {
          const s1 = Number(sizeMatches[1]);
          const s2 = Number(sizeMatches[2]);
          remainingNums = nums.filter(n => n !== s1 && n !== s2);
        }
        if (remainingNums.length >= 2) {
          price = Math.max(...remainingNums);
          stock = Math.min(...remainingNums);
        } else if (remainingNums.length === 1) {
          price = remainingNums[0] > 100 ? remainingNums[0] : 2500;
          stock = remainingNums[0] <= 100 ? remainingNums[0] : 10;
        }
      }

      setVoicePreview({
        intent: isCreate
          ? 'CREATE_PRODUCT'
          : isPrice
          ? 'UPDATE_PRICE'
          : 'UPDATE_STOCK',
        matchedProductId: matches.length === 1 ? matches[0].id : 0,
        isAmbiguous: !isCreate && matches.length > 1,
        ambiguousProductIds: matches.map((m) => m.id),
        name: isCreate
          ? `${size} Diesel Bhatti`
          : matches[0]?.name || `${size} Diesel Bhatti`,
        size,
        price: isCreate ? price : isPrice ? nums[0] || 2500 : matches[0]?.price || 2500,
        stockActionType:
          lower.includes('badha') || lower.includes('add')
            ? 'ADD'
            : lower.includes('ghata') || lower.includes('remove')
            ? 'REMOVE'
            : 'ADJUST',
        stockAmount: isCreate ? stock : nums[0] || 10,
        summaryText: `Detected: ${size} Bhatti, Stock: ${stock}, Price: ₹${price}`,
        imageUrl: DEFAULT_BHATTI_PHOTOS[size] || DEFAULT_BHATTI_PHOTOS.Medium,
      });
      if (isCreate) {
        setVoiceStep('image');
      } else {
        setVoiceStep('confirm');
      }
    } catch {
      setVoiceFeedback('Could not parse voice command.');
    } finally {
      setIsParsingVoice(false);
    }
  };

  const confirmAndSaveVoicePreview = async () => {
    if (!voicePreview) return;

    if (
      voicePreview.intent !== 'CREATE_PRODUCT' &&
      !voicePreview.matchedProductId
    ) {
      setVoiceFeedback(t('ambiguousProductPrompt'));
      return;
    }

    if (voicePreview.intent === 'CREATE_PRODUCT') {
      await onCreateProduct({
        name: voicePreview.name,
        size: voicePreview.size,
        imageUrl:
          voicePreview.imageUrl ||
          DEFAULT_BHATTI_PHOTOS[voicePreview.size] ||
          DEFAULT_BHATTI_PHOTOS.Medium,
        price: Number(voicePreview.price) || 2500,
        stockQuantity: Number(voicePreview.stockAmount) || 0,
        note: `Voice command: "${transcript}"`,
      });
    } else if (voicePreview.intent === 'UPDATE_PRICE') {
      await onUpdateProduct(voicePreview.matchedProductId, {
        price: Number(voicePreview.price),
      });
    } else if (voicePreview.intent === 'UPDATE_STOCK') {
      await onAdjustStock(
        voicePreview.matchedProductId,
        voicePreview.stockActionType || 'ADJUST',
        Number(voicePreview.stockAmount),
        `Voice command: "${transcript}"`
      );
    } else if (voicePreview.intent === 'UPDATE_BOTH') {
      await onUpdateProduct(voicePreview.matchedProductId, {
        price: Number(voicePreview.price),
      });
      await onAdjustStock(
        voicePreview.matchedProductId,
        voicePreview.stockActionType || 'ADJUST',
        Number(voicePreview.stockAmount),
        `Voice command: "${transcript}"`
      );
    }

    setVoiceFeedback('Confirmed and saved to inventory!');
    setVoicePreview(null);
    setTranscript('');
  };

  // ==========================================================================
  // B. OCR / IMAGE INPUT STATE
  // ==========================================================================
  const [ocrImagePreview, setOcrImagePreview] = useState<string | null>(null);
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [ocrSummary, setOcrSummary] = useState<string | null>(null);
  const [isProductPhotoDetected, setIsProductPhotoDetected] = useState(false);
  const [useUploadedAsProductPhoto, setUseUploadedAsProductPhoto] =
    useState(true);
  const [ocrItems, setOcrItems] = useState<OcrExtractedItem[]>([]);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  const handleOcrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrError(null);
    setIsScanningOcr(true);
    setOcrItems([]);

    try {
      const { dataUrl, mimeType } = await compressImageFile(file, 1024, 0.85);
      setOcrImagePreview(dataUrl);

      if (!isOnline) {
        // Offline fallback allows using the photo directly with editable fields
        setIsProductPhotoDetected(true);
        setOcrSummary(
          'Offline Mode: Image compressed. Review and edit the fields below before confirming.'
        );
        setOcrItems([
          {
            matchedProductId: 0,
            name: 'Diesel Bhatti — Workshop Unit',
            size: 'Medium',
            price: 2500,
            stockQuantity: 20,
            uncertainFields: ['price', 'stockQuantity'],
          },
        ]);
        setIsScanningOcr(false);
        return;
      }

      const res = await fetch('/api/admin/ai/parse-ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOcrError(data.error || 'OCR scan failed');
      } else if (data.ocrResult) {
        setIsProductPhotoDetected(Boolean(data.ocrResult.isProductPhotograph));
        setOcrSummary(data.ocrResult.documentSummary || null);
        setOcrItems(data.ocrResult.items || []);
      }
    } catch {
      setOcrError('Failed to scan image.');
    } finally {
      setIsScanningOcr(false);
    }
  };

  const handleConfirmOcrItem = async (idx: number) => {
    const item = ocrItems[idx];
    if (!item) return;

    const chosenPhoto =
      useUploadedAsProductPhoto && ocrImagePreview
        ? ocrImagePreview
        : DEFAULT_BHATTI_PHOTOS[item.size] || DEFAULT_BHATTI_PHOTOS.Medium;

    if (item.matchedProductId && item.matchedProductId > 0) {
      await onUpdateProduct(item.matchedProductId, {
        name: item.name,
        size: item.size,
        price: Number(item.price),
        ...(useUploadedAsProductPhoto && isProductPhotoDetected && ocrImagePreview
          ? { imageUrl: ocrImagePreview }
          : {}),
      });
      await onAdjustStock(
        item.matchedProductId,
        'ADJUST',
        Number(item.stockQuantity),
        'Updated via OCR Sheet Scan'
      );
    } else {
      await onCreateProduct({
        name: item.name,
        size: item.size || 'Medium',
        imageUrl: chosenPhoto,
        price: Number(item.price) || 2500,
        stockQuantity: Number(item.stockQuantity) || 1,
        note: 'Added via OCR Image Input',
      });
    }

    setOcrItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, saved: true } : it))
    );
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-6">
      {/* Segmented Control for the 3 Entry Methods */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-100 rounded-lg border border-stone-200 w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab('manual')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'manual'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>{t('entryMethodManual')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('voice')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'voice'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>{t('entryMethodVoice')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('ocr')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'ocr'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>{t('entryMethodOcr')}</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* METHOD C: MANUAL PRODUCT FORM                                       */}
      {/* =================================================================== */}
      {activeSubTab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-5 max-w-2xl">
          {manualError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{manualError}</span>
            </div>
          )}
          {manualSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{manualSuccess}</span>
            </div>
          )}

          {/* 1. Mandatory Product Image Upload */}
          <ImageUploaderField
            label={`1. ${t('productImageLabel')} *`}
            imageUrl={manualImage}
            sizeLabel={manualSize}
            onChange={(newUrl) => {
              setManualImage(newUrl);
              setManualError(null);
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 2. Product Name */}
            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                2. {t('productNameLabel')} *
              </label>
              <input
                type="text"
                required
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="e.g. Diesel Bhatti — Heavy Duty Commercial"
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
              />
            </div>

            {/* 3. Product Size */}
            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                3. {t('productSizeLabel')} *
              </label>
              <select
                value={manualSize}
                onChange={(e) => {
                  const newSz = e.target.value;
                  setManualSize(newSz);
                  if (
                    Object.values(DEFAULT_BHATTI_PHOTOS).includes(manualImage) &&
                    DEFAULT_BHATTI_PHOTOS[newSz]
                  ) {
                    setManualImage(DEFAULT_BHATTI_PHOTOS[newSz]);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm text-zinc-900 bg-white focus:outline-none focus:border-zinc-900"
              >
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
                <option value="Extra Large">Extra Large</option>
              </select>
            </div>

            {/* 4. Price */}
            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                4. {t('productPriceLabel')} *
              </label>
              <input
                type="number"
                required
                min={1}
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                placeholder="2500"
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm font-mono tabular-nums text-zinc-900 focus:outline-none focus:border-zinc-900"
              />
            </div>

            {/* 5. Available Quantity */}
            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                5. {t('productStockLabel')} *
              </label>
              <input
                type="number"
                required
                min={0}
                value={manualStock}
                onChange={(e) => setManualStock(e.target.value)}
                placeholder="50"
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm font-mono tabular-nums text-zinc-900 focus:outline-none focus:border-zinc-900"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold tracking-wide transition-colors cursor-pointer"
          >
            {t('saveProductBtn')}
          </button>
        </form>
      )}

      {/* =================================================================== */}
      {/* METHOD A: VOICE INPUT (English, Hindi, Punjabi)                     */}
      {/* =================================================================== */}
      {activeSubTab === 'voice' && (
        <div className="space-y-6 max-w-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                {t('voicePromptTitle')}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">{t('voicePromptDesc')}</p>
            </div>
            {voicePreview && (
              <button
                type="button"
                onClick={() => {
                  setVoicePreview(null);
                  setVoiceStep('idle');
                  setTranscript('');
                }}
                className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
              >
                Reset Flow
              </button>
            )}
          </div>

          {/* STEP 1: VOICE INPUT */}
          {voiceStep === 'idle' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200">
                  {(['en', 'hi', 'pa'] as LanguageCode[]).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setVoiceLang(code)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        voiceLang === code
                          ? 'bg-white text-zinc-900 shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {LANGUAGE_META[code].nativeLabel}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={toggleMicrophone}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    isListening
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span>{t('stopListeningBtn')}</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>{t('startListeningBtn')}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200 space-y-2">
                <span className="text-[11px] font-semibold text-zinc-500 block uppercase tracking-wider">
                  Try saying something like:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    '10 bathi 16 36 2500₹ ki hai',
                    '10 bhatti 16 36 size price 2500',
                    'Nayi Medium bhatti add karo, rate 2800 aur stock 15',
                    'Large bhatti ka stock 20 badha do',
                    'Small bhatti price 2200 kar do',
                  ].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => {
                        setTranscript(sample);
                        parseVoiceCommand(sample);
                      }}
                      className="text-left text-[11px] px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 transition-all cursor-pointer shadow-2xs"
                    >
                      "{sample}"
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={t('voiceEx1')}
                  className="flex-1 px-3.5 py-3 rounded-lg border border-zinc-300 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
                />
                <button
                  type="button"
                  disabled={isParsingVoice || !transcript.trim()}
                  onClick={() => parseVoiceCommand(transcript)}
                  className="inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 disabled:opacity-50 cursor-pointer shadow-sm active:scale-95 transition-all min-w-[130px]"
                >
                  {isParsingVoice ? (
                    <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>{isParsingVoice ? 'Analyzing...' : 'Parse Voice'}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: IMAGE UPLOAD (For New Products) */}
          {voiceStep === 'image' && voicePreview && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" />
                  New Product Detected
                </h4>
                <p className="text-xs mt-1 opacity-90">
                  We parsed: <strong>{voicePreview.name}</strong> at <strong>₹{voicePreview.price}</strong> with <strong>{voicePreview.stockAmount}</strong> units.
                  Please upload a photo to continue.
                </p>
              </div>

              <div className="p-1 border-2 border-dashed border-zinc-300 rounded-2xl bg-stone-50">
                <ImageUploaderField
                  label="Upload Product Photograph"
                  imageUrl={voicePreview.imageUrl || ''}
                  sizeLabel={voicePreview.size}
                  onChange={(newUrl) => {
                    setVoicePreview({ ...voicePreview, imageUrl: newUrl });
                    setVoiceStep('confirm');
                  }}
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setVoiceStep('idle')}
                  className="text-xs font-bold text-zinc-500 hover:text-zinc-900 cursor-pointer"
                >
                  ← Change Spoken Details
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceStep('confirm')}
                  className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 cursor-pointer shadow-sm"
                >
                  Skip for Now →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: FINAL CONFIRMATION CARD */}
          {voiceStep === 'confirm' && voicePreview && (
            <div className="space-y-5 animate-in zoom-in-95 fade-in duration-300">
              <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-widest pb-1 border-b border-zinc-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Final Review
              </div>

              <div className="relative group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  {/* Visual Preview */}
                  <div className="aspect-square bg-stone-100 border-r border-zinc-100 overflow-hidden relative">
                    <img
                      src={voicePreview.imageUrl || DEFAULT_BHATTI_PHOTOS[voicePreview.size] || DEFAULT_BHATTI_PHOTOS.Medium}
                      alt="Product Preview"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>

                  {/* Detail Grid */}
                  <div className="p-6 space-y-6">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Model Name</span>
                      <h4 className="text-lg font-extrabold text-zinc-900 leading-tight">
                        {voicePreview.name}
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Size</span>
                        <p className="text-sm font-bold text-zinc-800">{voicePreview.size}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Stock Action</span>
                        <p className="text-sm font-bold text-emerald-700">{voicePreview.stockActionType} {voicePreview.stockAmount}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">Rate (INR)</span>
                        <span className="text-xl font-mono font-black text-zinc-900">
                          ₹{Number(voicePreview.price || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {isEditingVoicePreview && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm p-6 overflow-y-auto animate-in fade-in duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-bold text-sm">Quick Edit</h5>
                      <button onClick={() => setIsEditingVoicePreview(false)} className="text-xs font-bold text-red-600 underline">Close</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Name</label>
                        <input type="text" value={voicePreview.name} onChange={(e) => setVoicePreview({...voicePreview, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Size</label>
                        <input
                          type="text"
                          list="voice-size-options"
                          value={voicePreview.size}
                          onChange={(e) => setVoicePreview({...voicePreview, size: e.target.value})}
                          placeholder="e.g. 16x36, Medium"
                          className="w-full px-3 py-2 border rounded-lg text-xs"
                        />
                        <datalist id="voice-size-options">
                          <option value="Small" />
                          <option value="Medium" />
                          <option value="Large" />
                          <option value="Extra Large" />
                          <option value="16x36" />
                          <option value="18x40" />
                          <option value="12x24" />
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Price</label>
                        <input type="number" value={voicePreview.price} onChange={(e) => setVoicePreview({...voicePreview, price: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Stock</label>
                        <input type="number" value={voicePreview.stockAmount} onChange={(e) => setVoicePreview({...voicePreview, stockAmount: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg text-xs" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={confirmAndSaveVoicePreview}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-bold shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Save to Inventory</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingVoicePreview(!isEditingVoicePreview)}
                  className="px-5 py-3.5 rounded-xl border border-zinc-300 bg-zinc-100 text-zinc-900 font-black uppercase tracking-tighter text-xs hover:bg-zinc-200 cursor-pointer transition-all shadow-sm"
                >
                  Edit Details
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceStep('image')}
                  className="px-5 py-3.5 rounded-xl border border-zinc-300 bg-zinc-100 text-zinc-900 font-black uppercase tracking-tighter text-xs hover:bg-zinc-200 cursor-pointer transition-all shadow-sm"
                >
                  Change Photo
                </button>
              </div>
            </div>
          )}

          {voiceFeedback && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-3 animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              {voiceFeedback}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* METHOD B: OCR / IMAGE INPUT                                         */}
      {/* =================================================================== */}
      {activeSubTab === 'ocr' && (
        <div className="space-y-5 max-w-3xl">
          <div>
            <h3 className="text-base font-bold text-zinc-900">
              {t('ocrPromptTitle')}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">{t('ocrPromptDesc')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={ocrInputRef}
              type="file"
              accept="image/*"
              onChange={handleOcrFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => ocrInputRef.current?.click()}
              disabled={isScanningOcr}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer"
            >
              <Camera className="w-4 h-4 text-amber-400" />
              <span>
                {isScanningOcr ? t('scanningOcr') : t('uploadOcrImageBtn')}
              </span>
            </button>
          </div>

          {ocrError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {ocrError}
            </div>
          )}

          {ocrImagePreview && (
            <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200">
              <img
                src={ocrImagePreview}
                alt="Uploaded OCR source"
                className="w-36 h-28 object-cover rounded-lg border border-zinc-300 shrink-0"
              />
              <div className="space-y-2">
                {ocrSummary && (
                  <p className="text-xs font-medium text-zinc-800">
                    {ocrSummary}
                  </p>
                )}
                <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useUploadedAsProductPhoto}
                    onChange={(e) =>
                      setUseUploadedAsProductPhoto(e.target.checked)
                    }
                    className="rounded border-zinc-300 text-zinc-900"
                  />
                  <span className="font-semibold">
                    {t('useAsProductPhotoLabel')}
                  </span>
                </label>
              </div>
            </div>
          )}

          {ocrItems.length > 0 && (
            <div className="space-y-4">
              {ocrItems.map((item, idx) => {
                const isPriceUncertain =
                  item.uncertainFields?.includes('price');
                const isStockUncertain =
                  item.uncertainFields?.includes('stockQuantity');
                const isNameUncertain = item.uncertainFields?.includes('name');

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-zinc-200 bg-white space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                          {t('productNameLabel')}
                        </label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOcrItems((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, name: val } : it
                              )
                            );
                          }}
                          className={`w-full px-3 py-2 rounded-lg border text-xs ${
                            isNameUncertain
                              ? 'border-amber-500 bg-amber-50/50'
                              : 'border-zinc-300'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                          {t('productSizeLabel')}
                        </label>
                        <select
                          value={item.size}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOcrItems((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, size: val } : it
                              )
                            );
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs bg-white"
                        >
                          <option value="Small">Small</option>
                          <option value="Medium">Medium</option>
                          <option value="Large">Large</option>
                          <option value="Extra Large">Extra Large</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                          {t('productPriceLabel')}
                        </label>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setOcrItems((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, price: val } : it
                              )
                            );
                          }}
                          className={`w-full px-3 py-2 rounded-lg border text-xs font-mono ${
                            isPriceUncertain
                              ? 'border-amber-500 bg-amber-50/60'
                              : 'border-zinc-300'
                          }`}
                        />
                        {isPriceUncertain && (
                          <span className="text-[10px] text-amber-700 font-medium block mt-0.5">
                            {t('uncertainFieldBadge')}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                          {t('productStockLabel')}
                        </label>
                        <input
                          type="number"
                          value={item.stockQuantity}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setOcrItems((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, stockQuantity: val } : it
                              )
                            );
                          }}
                          className={`w-full px-3 py-2 rounded-lg border text-xs font-mono ${
                            isStockUncertain
                              ? 'border-amber-500 bg-amber-50/60'
                              : 'border-zinc-300'
                          }`}
                        />
                        {isStockUncertain && (
                          <span className="text-[10px] text-amber-700 font-medium block mt-0.5">
                            {t('uncertainFieldBadge')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      {item.saved ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Saved</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConfirmOcrItem(idx)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{t('confirmOcrItemBtn')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
