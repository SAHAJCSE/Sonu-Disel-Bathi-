import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropperModalProps {
  image: string;
  onCropComplete: (croppedImageUrl: string) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  image,
  onCropComplete,
  onCancel,
  aspectRatio = 4 / 3,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteInternal = useCallback(
    (_croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any
  ): Promise<string | null> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx || !pixelCrop) return null;

    const maxWidth = 960;
    const scale = pixelCrop.width > maxWidth ? maxWidth / pixelCrop.width : 1;
    canvas.width = Math.max(1, Math.round(pixelCrop.width * scale));
    canvas.height = Math.max(1, Math.round(pixelCrop.height * scale));

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const webp = canvas.toDataURL('image/webp', 0.84);
    if (webp.startsWith('data:image/webp')) {
      return webp;
    }
    return canvas.toDataURL('image/jpeg', 0.84);
  };

  const handleDone = async () => {
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      if (croppedImage) {
        onCropComplete(croppedImage);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-2xl bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[80vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Crop Product Photo
          </h3>
          <button
            onClick={onCancel}
            className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative flex-1 bg-black">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteInternal}
            onZoomChange={onZoomChange}
          />
        </div>

        {/* Controls */}
        <div className="px-6 py-5 bg-zinc-900 border-t border-zinc-800 space-y-6">
          <div className="flex items-center gap-4">
            <ZoomOut className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => onZoomChange(Number(e.target.value))}
              className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <ZoomIn className="w-4 h-4 text-zinc-500 shrink-0" />
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] text-zinc-500 font-medium italic">
              * Align the product within the frame for a consistent catalogue look.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => onCropComplete(image)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-700 transition-all cursor-pointer shadow-sm"
              >
                Skip &amp; Use Original
              </button>
              <button
                onClick={onCancel}
                className="px-3 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDone}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Apply Crop</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
