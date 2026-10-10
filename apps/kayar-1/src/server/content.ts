import { z } from 'zod';
import { ZiteError } from 'zitejs/backend';

export const bad = (m: string) => new ZiteError({ code: 'BAD_REQUEST', message: 'INVALID', userFacingMessage: m });

/** Unicode-friendly slug: lowercase letters/digits (Persian allowed) joined by single dashes. */
export const SLUG_RE = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;
export const slugField = z.string().trim().toLowerCase().max(120);

export const splitTags = (s?: string | null) => (s ?? '').split(',').map((t) => t.trim()).filter(Boolean);
export const joinTags = (a: string[]) => Array.from(new Set(a.map((t) => t.trim().slice(0, 40)).filter(Boolean))).slice(0, 15).join(',');

/** Internal path ("/app/morshed") or absolute https URL. Anything else is rejected. */
export function safeLink(v: string | undefined | null) {
  const s = (v ?? '').trim();
  if (!s) return '';
  if (/^\/(?!\/)[\w\-./?=&%#\u0600-\u06FF]*$/.test(s)) return s;
  try { const u = new URL(s); if (u.protocol === 'https:') return u.toString(); } catch { /* fallthrough */ }
  throw bad('لینک باید مسیر داخلی (شروع با /) یا آدرس https باشد.');
}

export const isoOrNull = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw bad('تاریخ واردشده معتبر نیست.');
  return d.toISOString();
};

export const ALLOWED_UPLOAD_HOSTS = ['uploads.zite.com', 'eu-uploads.zite.com'];
