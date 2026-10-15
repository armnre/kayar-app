/**
 * `zitejs/upload` stand-in.
 *
 * Upstream this hook streams the file to the platform's object storage and resolves a
 * `https://uploads.zite.com/...` URL. In this standalone port the file is normalised
 * (resized + re-encoded when needed) into a `data:` URL that the media endpoint can
 * re-verify byte-by-byte before registering it in the library.
 */

import { useCallback, useState } from 'react';
import { backendUrl, isBackendMode } from './caller';

const MAX_EDGE = 1280;
const MAX_LOCAL_BYTES = 700_000;

const readAsDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('خواندن فایل ناموفق بود.'));
    fr.readAsDataURL(file);
  });

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('این فایل یک تصویر معتبر نیست.'));
    img.src = url;
  });

async function toLocalUrl(file: File): Promise<string> {
  if (file.size <= 250_000 && file.type !== 'image/jpeg') return readAsDataUrl(file);

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('پردازش تصویر در این مرورگر ممکن نیست.');
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
    if (dataUrl.length > MAX_LOCAL_BYTES) {
      throw new Error('حجم تصویر برای ذخیره‌سازی محلی زیاد است؛ تصویر کوچکتری انتخاب کن.');
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(async (file: File | Blob) => {
    setIsUploading(true);
    try {
      // Real storage when the KAYAR backend is running; otherwise a local data URL.
      if (isBackendMode()) {
        const form = new FormData();
        form.append('file', file as File, (file as File).name || 'upload');
        const res = await fetch(`${backendUrl()}/upload`, { method: 'POST', body: form });
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: { user_facing_message?: string } };
        if (!res.ok || !data.url) throw new Error(data.error?.user_facing_message ?? 'آپلود فایل ناموفق بود.');
        return { url: data.url, path: data.url, name: (file as File).name ?? 'file' };
      }
      const url = await toLocalUrl(file as File);
      return { url, path: url, name: (file as File).name ?? 'image' };
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { upload, isUploading, progress: isUploading ? 1 : 0 };
}
