import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Upload,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  CheckCircle2,
  X,
  Video,
  ZoomIn,
  Sparkles,
} from 'lucide-react';
import { compressImageFile } from '../utils/imageUtils.ts';
import { ProductImage } from './ProductImage.tsx';
import { useTranslation } from '../i18n/LanguageContext.tsx';

export const STUDIO_PRESET_PHOTOS: Record<string, string> = {
  Small: '/src/assets/images/bhatti_small_model_1794033585976.jpg',
  Medium: '/src/assets/images/bhatti_medium_model_1794033586446.jpg',
  Large: '/src/assets/images/bhatti_large_model_1794033589239.jpg',
  'Extra Large': '/src/assets/images/bhatti_jumbo_double_1794033588535.jpg',
};

interface ImageUploaderFieldProps {
  imageUrl: string;
  onChange: (newDataUrl: string) => void;
  sizeLabel?: string;
  label?: string;
}

export const ImageUploaderField: React.FC<ImageUploaderFieldProps> = ({
  imageUrl,
  onChange,
  sizeLabel = 'Medium',
  label,
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Live Camera Viewfinder State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const processSelectedFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    setErrorMsg(null);
    setIsCompressing(true);
    try {
      const originalKb = Math.max(1, Math.round(file.size / 1024));
      const { dataUrl } = await compressImageFile(file, 960, 0.84);
      const compressedKb = Math.max(
        1,
        Math.round((dataUrl.length * 3) / 4 / 1024)
      );
      setCompressionStats(
        `Optimized HD (${originalKb} KB → ${compressedKb} KB)`
      );
      onChange(dataUrl);
    } catch {
      setErrorMsg('Failed to process and compress image.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processSelectedFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processSelectedFile(file);
    }
  };

  const openLiveCamera = async () => {
    setErrorMsg(null);
    if (
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      mobileCameraInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      mobileCameraInputRef.current?.click();
    }
  };

  const captureFrameFromVideo = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const maxW = 960;
    let w = video.videoWidth || 640;
    let h = video.videoHeight || 480;
    if (w > maxW) {
      h = Math.round((h * maxW) / w);
      w = maxW;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const kb = Math.max(1, Math.round((dataUrl.length * 3) / 4 / 1024));
      setCompressionStats(`Camera Snapshot (${kb} KB)`);
      onChange(dataUrl);
    }
    stopCameraStream();
  };

  return (
    <div className="space-y-2.5">
      {label && (
        <label className="block text-xs font-bold text-zinc-800">{label}</label>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={mobileCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Interactive Drag & Drop + AnimatedAttached Image Showcase */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 transition-all duration-200 ${
          isDragging
            ? 'border-amber-600 bg-amber-50/60 scale-[1.01]'
            : imageUrl
            ? 'border-zinc-200 bg-gradient-to-br from-stone-50 via-white to-stone-100/80 p-4 shadow-xs'
            : 'border-dashed border-zinc-300 bg-white hover:border-zinc-400 p-5'
        }`}
      >
        <AnimatePresence mode="wait">
          {imageUrl ? (
            <motion.div
              key="attached-preview"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-5"
            >
              {/* Redesigned Studio Framed Image Preview with Zoom Overlay */}
              <div
                onClick={() => setIsZoomOpen(true)}
                className="group relative w-full sm:w-48 aspect-[4/3] rounded-xl overflow-hidden border border-zinc-200 bg-zinc-900 shadow-md shrink-0 cursor-pointer"
              >
                <ProductImage
                  src={imageUrl}
                  alt="Attached Product Photograph"
                  sizeLabel={sizeLabel}
                  enableHoverEffect={true}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-between p-2.5">
                  <span className="text-[11px] font-semibold text-white flex items-center gap-1">
                    <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('zoomPhotoBtn')}</span>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-200">
                    4:3
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-3 w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {compressionStats || 'Attached Photograph Ready'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(true)}
                    className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-transform active:scale-95 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('replaceImageBtn')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={openLiveCamera}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-300 bg-white hover:bg-stone-100 text-zinc-800 text-xs font-semibold transition-transform active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-600" />
                    <span>{t('uploadCameraBtn')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onChange('');
                      setCompressionStats(null);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>

                {/* Quick Workshop Presets */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/80">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Studio Presets:</span>
                  {(['Small', 'Medium', 'Large', 'Extra Large'] as const).map(
                    (sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          onChange(STUDIO_PRESET_PHOTOS[sz]);
                          setCompressionStats(`Studio Preset (${sz} Bhatti)`);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          imageUrl === STUDIO_PRESET_PHOTOS[sz]
                            ? 'bg-zinc-900 text-white'
                            : 'bg-stone-200/70 hover:bg-stone-300 text-zinc-800'
                        }`}
                      >
                        {sz}
                      </button>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty-dropzone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="py-4 text-center space-y-3"
            >
              <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center mx-auto shadow-2xs">
                <ImageIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900">
                  Attach Diesel Bhatti Photograph (Mandatory)
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Drag and drop a product photo here, snap a live camera picture, or upload from gallery.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-transform active:scale-95 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('uploadGalleryBtn')}</span>
                </button>
                <button
                  type="button"
                  onClick={openLiveCamera}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-300 bg-white hover:bg-stone-100 text-zinc-800 text-xs font-bold transition-transform active:scale-95 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-600" />
                  <span>{t('uploadCameraBtn')}</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-zinc-500 pt-1">
                <span>Or attach studio preset:</span>
                {(['Small', 'Medium', 'Large', 'Extra Large'] as const).map(
                  (sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => {
                        onChange(STUDIO_PRESET_PHOTOS[sz]);
                        setCompressionStats(`Studio Preset (${sz} Bhatti)`);
                      }}
                      className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-zinc-800 font-medium cursor-pointer"
                    >
                      {sz}
                    </button>
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isCompressing && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>{t('compressingImage')}</span>
          </div>
        )}

        {errorMsg && (
          <p className="mt-2 text-xs text-red-600 font-medium">{errorMsg}</p>
        )}
      </div>

      {/* Full-Screen Attached Image Zoom Modal */}
      <AnimatePresence>
        {isZoomOpen && imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setIsZoomOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-2xl w-full rounded-xl bg-zinc-900 border border-zinc-700 overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 text-white">
                <span className="text-xs font-bold">
                  Attached Product Photograph Preview ({sizeLabel})
                </span>
                <button
                  type="button"
                  onClick={() => setIsZoomOpen(false)}
                  className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="aspect-[4/3] bg-black">
                <ProductImage
                  src={imageUrl}
                  alt="Zoomed Product Preview"
                  sizeLabel={sizeLabel}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Camera Viewfinder Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-xl bg-zinc-900 text-white border border-zinc-700 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Video className="w-4 h-4 text-amber-400" />
                <span>Capture Product Photograph</span>
              </div>
              <button
                type="button"
                onClick={stopCameraStream}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-[4/3] bg-black relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={stopCameraStream}
                className="px-4 py-2 rounded-lg border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
              >
                {t('cancelBtn')}
              </button>
              <button
                type="button"
                onClick={captureFrameFromVideo}
                className="flex-1 py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
