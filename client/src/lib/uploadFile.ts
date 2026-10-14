import api from '@/lib/api';

// Target budget is 950 KB so that multipart headers stay comfortably under the 1 MB Nginx limit.
const TARGET_MAX_BYTES = 950 * 1024;
const ALLOWED = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'svg', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv'];
const RESIZABLE = ['jpeg', 'jpg', 'png', 'webp', 'gif'];

const extOf = (name: string) => (name.split('.').pop() || '').toLowerCase();
const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** Helper to load an image using createImageBitmap or HTMLImageElement fallback */
async function loadImage(file: File): Promise<{
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  cleanup: () => void;
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fall through to Image element
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
        cleanup: () => URL.revokeObjectURL(url),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };
    img.src = url;
  });
}

/**
 * Adaptively shrinks and compresses any image in the browser so it fits under the target size (<= 950 KB).
 * Uses progressive multi-pass degradation (adjusting resolution and JPEG quality) while maintaining visual clarity.
 */
export async function shrinkImage(file: File, maxBytes = TARGET_MAX_BYTES): Promise<File> {
  const ext = extOf(file.name);
  if (!RESIZABLE.includes(ext)) return file;
  if (file.size <= maxBytes) return file;

  try {
    const source = await loadImage(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      source.cleanup();
      return file;
    }

    // Adaptive degradation tiers: reduce quality first, then resolution
    const tiers = [
      { maxDim: 1800, quality: 0.82 },
      { maxDim: 1800, quality: 0.70 },
      { maxDim: 1500, quality: 0.65 },
      { maxDim: 1200, quality: 0.60 },
      { maxDim: 1000, quality: 0.50 },
    ];

    let bestBlob: Blob | null = null;

    for (const tier of tiers) {
      const scale = Math.min(1, tier.maxDim / Math.max(source.width, source.height));
      const targetWidth = Math.round(source.width * scale);
      const targetHeight = Math.round(source.height * scale);

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.clearRect(0, 0, targetWidth, targetHeight);
      source.draw(ctx, targetWidth, targetHeight);

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', tier.quality)
      );

      if (blob) {
        bestBlob = blob;
        if (blob.size <= maxBytes) {
          break; // Successfully brought under limit
        }
      }
    }

    source.cleanup();

    if (bestBlob && bestBlob.size < file.size) {
      const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
      return new File([bestBlob], newName, { type: 'image/jpeg' });
    }
    return file;
  } catch (err) {
    console.warn('Image compression fallback:', err);
    return file;
  }
}

/**
 * Uploads a form file after verifying and compressing it to <= 1 MB.
 * Returns the uploaded file URL.
 */
export async function uploadFormFile(
  original: File,
  opts: { endpoint?: string; fields?: Record<string, string> } = {}
): Promise<string> {
  const ext = extOf(original.name);
  if (!ALLOWED.includes(ext)) {
    throw new Error(
      ext === 'heic' || ext === 'heif'
        ? 'HEIC photos are not supported. Please upload a JPG or PNG.'
        : `".${ext || 'unknown'}" files are not supported. Please upload JPG, PNG or PDF.`
    );
  }

  // 1. Compress image to fit under 950 KB (1 MB)
  const file = await shrinkImage(original, TARGET_MAX_BYTES);

  // 2. Validate final file size
  if (file.size > TARGET_MAX_BYTES) {
    if (ext === 'pdf') {
      throw new Error(
        `This PDF is ${mb(file.size)}. The maximum allowed size is 1 MB. Please compress this PDF or upload as an image (JPG/PNG), which is compressed automatically.`
      );
    }
    throw new Error(`This file is ${mb(file.size)}. The maximum allowed size is 1 MB.`);
  }

  // 3. Send to server
  const data = new FormData();
  data.append('file', file);
  Object.entries(opts.fields || {}).forEach(([k, v]) => data.append(k, v));

  try {
    const res = await api.post(opts.endpoint || '/auth/upload', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90000,
    });
    const url = res.data?.url || res.data?.fileUrl;
    if (!url) throw new Error('The server did not return the uploaded file. Please try again.');
    return url;
  } catch (err: any) {
    if (err?.response) {
      const status = err.response.status;
      const msg = err.response.data?.message;
      if (status === 413) throw new Error('The file exceeds the 1 MB server limit. Please upload a smaller file.');
      throw new Error(msg || `Upload failed (server error ${status}). Please try again.`);
    }
    if (err?.code === 'ECONNABORTED') throw new Error('The upload timed out. Check your connection and try again.');
    if (err instanceof Error && !err.message.startsWith('Network')) throw err;
    throw new Error('Network error. Check your connection and try again.');
  }
}

