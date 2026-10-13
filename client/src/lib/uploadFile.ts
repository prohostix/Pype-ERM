import api from '@/lib/api';

const MAX_BYTES = 5 * 1024 * 1024; // matches the server's default upload limit
const ALLOWED = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'svg', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv'];
const RESIZABLE = ['jpeg', 'jpg', 'png', 'webp'];

const extOf = (name: string) => (name.split('.').pop() || '').toLowerCase();

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** Shrinks big phone photos so they fit the 5 MB limit; other files pass through. */
async function shrinkImage(file: File): Promise<File> {
  if (!RESIZABLE.includes(extOf(file.name)) || file.size <= 1.5 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file; // fall back to the original and let the size check decide
  }
}

/**
 * Uploads a form file and returns its stored URL. Throws an Error whose message
 * is safe to show the user (wrong type, too large, network, or the server's reason).
 */
export async function uploadFormFile(
  original: File,
  opts: { endpoint?: string; fields?: Record<string, string> } = {}
): Promise<string> {
  const ext = extOf(original.name);
  if (!ALLOWED.includes(ext)) {
    throw new Error(
      ext === 'heic' || ext === 'heif'
        ? 'HEIC photos are not supported. Please upload a JPG or PNG (or change the camera format to "Most compatible").'
        : `".${ext || 'unknown'}" files are not supported. Please upload JPG, PNG or PDF.`
    );
  }

  const file = await shrinkImage(original);
  if (file.size > MAX_BYTES) {
    throw new Error(`This file is ${mb(file.size)}. The maximum allowed is 5 MB.`);
  }

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
      if (status === 413) throw new Error('The file is too large for the server. Please use a smaller file.');
      throw new Error(msg || `Upload failed (server error ${status}). Please try again.`);
    }
    if (err?.code === 'ECONNABORTED') throw new Error('The upload timed out. Check your connection and try again.');
    if (err instanceof Error && !err.message.startsWith('Network')) throw err;
    throw new Error('Network error. Check your connection and try again.');
  }
}
