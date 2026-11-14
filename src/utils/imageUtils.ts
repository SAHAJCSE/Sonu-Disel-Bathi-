export async function compressImageFile(
  file: File,
  maxWidth = 960,
  quality = 0.82
): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            dataUrl: String(event.target?.result || ''),
            mimeType: file.type || 'image/jpeg',
          });
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({
          dataUrl: compressedDataUrl,
          mimeType: 'image/jpeg',
        });
      };
      img.onerror = () => reject(new Error('Failed to decode image file'));
      img.src = String(event.target?.result || '');
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export async function compressDataUrl(
  dataUrl: string,
  maxWidth = 800,
  maxLength = 220_000
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }
  if (dataUrl.length <= maxLength) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const tryEncode = (targetWidth: number, quality: number): string => {
        const canvas = document.createElement('canvas');
        let width = img.width || targetWidth;
        let height = img.height || targetWidth;

        if (width > targetWidth) {
          height = Math.round((height * targetWidth) / width);
          width = targetWidth;
        }

        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return dataUrl;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Prefer WebP (smaller payloads), fallback to JPEG if unsupported
        let encoded = canvas.toDataURL('image/webp', quality);
        if (!encoded.startsWith('data:image/webp')) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          encoded = canvas.toDataURL('image/jpeg', quality);
        }
        return encoded;
      };

      const attempts: Array<[number, number]> = [
        [maxWidth, 0.82],
        [maxWidth, 0.68],
        [Math.min(maxWidth, 640), 0.6],
        [Math.min(maxWidth, 512), 0.5],
      ];

      let best = dataUrl;
      for (const [w, q] of attempts) {
        const candidate = tryEncode(w, q);
        if (candidate.length < best.length) {
          best = candidate;
        }
        if (candidate.length <= maxLength) {
          resolve(candidate);
          return;
        }
      }
      resolve(best);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
