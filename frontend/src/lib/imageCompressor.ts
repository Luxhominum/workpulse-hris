/**
 * Adaptive quality detection for weak field network conditions (Arah A: The Invisible Guardian)
 */
function getAdaptiveQuality(defaultMaxWidth = 640, defaultQuality = 0.75): { maxWidth: number; quality: number } {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const conn = (navigator as any).connection;
    if (conn && (conn.saveData || conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g')) {
      return { maxWidth: 480, quality: 0.65 };
    }
  }
  return { maxWidth: defaultMaxWidth, quality: defaultQuality };
}

/**
 * Captures and compresses a video frame from an HTML5 video stream into an optimized Blob/File.
 * Target: Max width 640px (or 480px on 2G), payload ~35-50KB for rapid field uploads.
 */
export async function captureAndCompressFrame(
  videoElement: HTMLVideoElement,
  customMaxWidth?: number,
  customQuality?: number
): Promise<{ blob: Blob; dataUrl: string; sizeKb: number }> {
  const adaptive = getAdaptiveQuality(customMaxWidth || 640, customQuality || 0.75);
  const maxWidth = adaptive.maxWidth;
  const quality = adaptive.quality;

  const canvas = document.createElement('canvas');
  let width = videoElement.videoWidth || 640;
  let height = videoElement.videoHeight || 480;

  // Scale down if greater than maxWidth
  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D canvas context for frame capture');
  }

  // Draw current video frame onto canvas
  ctx.drawImage(videoElement, 0, 0, width, height);

  // Determine support for image/webp, fallback to image/jpeg
  const format = 'image/webp';
  const dataUrl = canvas.toDataURL(format, quality);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas toBlob failed'));
      },
      format,
      quality
    );
  });

  const sizeKb = Math.round((blob.size / 1024) * 10) / 10;

  return {
    blob,
    dataUrl,
    sizeKb,
  };
}

/**
 * Compresses an image file (e.g. from native phone camera shutter) to optimized WebP ~40KB
 */
export async function compressImageFile(
  file: File,
  customMaxWidth?: number,
  customQuality?: number
): Promise<{ blob: Blob; dataUrl: string; sizeKb: number }> {
  const adaptive = getAdaptiveQuality(customMaxWidth || 640, customQuality || 0.75);
  const maxWidth = adaptive.maxWidth;
  const quality = adaptive.quality;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      let width = img.width || 640;
      let height = img.height || 480;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Failed to get 2D canvas context'));
      }

      ctx.drawImage(img, 0, 0, width, height);

      const format = 'image/webp';
      const dataUrl = canvas.toDataURL(format, quality);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({
              blob,
              dataUrl,
              sizeKb: Math.round((blob.size / 1024) * 10) / 10,
            });
          } else {
            reject(new Error('Canvas toBlob conversion failed'));
          }
        },
        format,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image file for compression'));
    };

    img.src = objectUrl;
  });
}
