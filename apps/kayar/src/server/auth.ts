import { ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

/* ---------- normalisation ---------- */
const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';
export function latinDigits(s: string) {
  return s.replace(/[۰-۹٠-٩]/g, (d) => String(FA.indexOf(d) >= 0 ? FA.indexOf(d) : AR.indexOf(d)));
}
/** Returns 09xxxxxxxxx or null. */
export function normalizePhone(raw: string): string | null {
  let s = latinDigits(raw).replace(/[\s\-()]/g, '');
  if (s.startsWith('+98')) s = '0' + s.slice(3);
  else if (s.startsWith('0098')) s = '0' + s.slice(4);
  else if (/^98\d{10}$/.test(s)) s = '0' + s.slice(2);
  else if (/^9\d{9}$/.test(s)) s = '0' + s;
  return /^09\d{9}$/.test(s) ? s : null;
}
export function normalizeUsername(raw: string): string {
  const s = latinDigits(raw).trim().replace(/\s+/g, '').toLowerCase();
  return normalizePhone(s) ?? s;
}

/* ---------- passwords (PBKDF2-SHA256 via WebCrypto) ---------- */
// Cloudflare Workers caps PBKDF2 at 100,000 iterations (see docs/DECISIONS.md).
export const PBKDF2_ITER = 100_000;
const enc = new TextEncoder();
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iter: number) {
  const pepper = process.env.ZITE_AUTH_PEPPER ?? '';
  const key = await crypto.subtle.importKey('raw', enc.encode(password + pepper), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as Uint8Array<ArrayBuffer>, iterations: iter }, key, 256);
  return new Uint8Array(bits);
}
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ITER}$${b64(salt)}$${b64(await derive(password, salt, PBKDF2_ITER))}`;
}
export function constantTimeEqual(a: Uint8Array, b: Uint8Array) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}
const DUMMY = 'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
/** Always runs a full derivation (even for unknown users) to avoid timing leaks. */
export async function verifyPassword(password: string, stored?: string) {
  const parts = (stored || DUMMY).split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const got = await derive(password, unb64(parts[2]), Number(parts[1]));
  return constantTimeEqual(got, unb64(parts[3])) && !!stored;
}

const COMMON = ['12345678', '123456789', '1234567890', 'password', 'password1', 'qwerty123', '11111111', '00000000', '87654321', 'iloveyou', 'kapoosh', 'kayar123', 'abcd1234', 'qwertyui'];
export function passwordPolicyError(pw: string, ctx: { username?: string; phone?: string; name?: string }) {
  if (pw.length < 8) return 'رمز باید حداقل ۸ نویسه باشد.';
  if (pw.length > 128) return 'رمز بیش از حد طولانی است.';
  const low = latinDigits(pw).toLowerCase();
  if (COMMON.includes(low) || /^(\d)\1+$/.test(low)) return 'این رمز خیلی رایج است؛ رمز دیگری انتخاب کن.';
  for (const v of [ctx.username, ctx.phone, ctx.name]) if (v && low === latinDigits(v).toLowerCase().replace(/\s+/g, '')) return 'رمز نباید با نام کاربری، شماره یا نام یکی باشد.';
  return null;
}
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; // no O0Il1
export function generateTempPassword(len = 10) {
  const out: string[] = [];
  while (out.length < len) {
    const b = crypto.getRandomValues(new Uint8Array(32));
    for (const x of b) if (x < 256 - (256 % ALPHA.length) && out.length < len) out.push(ALPHA[x % ALPHA.length]);
  }
  return out.join('');
}

/* ---------- session tokens ---------- */
export function newToken() {
  return b64(crypto.getRandomValues(new Uint8Array(32))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export async function sha256(s: string) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)));
  return Array.from(d, (x) => x.toString(16).padStart(2, '0')).join('');
}
export const MEMBER_TTL = 30 * 24 * 3600_000;
export const STAFF_TTL = 12 * 3600_000;

/* ---------- rate limit ---------- */
const WINDOW = 15 * 60_000;
const MAX = 5;
export async function assertNotLocked(key: string) {
  const rec = await zite.loginAttempts.findOne({ filters: { key } });
  if (rec?.lockedUntil && new Date(rec.lockedUntil).getTime() > Date.now()) {
    const min = Math.ceil((new Date(rec.lockedUntil).getTime() - Date.now()) / 60_000);
    throw new ZiteError({ code: 'RATE_LIMITED', message: 'locked', userFacingMessage: `به دلیل تلاش‌های ناموفق، ورود تا ${min.toLocaleString('fa-IR')} دقیقه‌ی دیگر قفل است.` });
  }
  return rec;
}
export async function recordFailure(key: string, rec?: { id: string; count?: number; windowStart?: string }) {
  const now = Date.now();
  const fresh = !rec?.windowStart || now - new Date(rec.windowStart).getTime() > WINDOW;
  const count = fresh ? 1 : (rec?.count ?? 0) + 1;
  const record = { key, count, windowStart: fresh ? new Date(now).toISOString() : rec!.windowStart!, lockedUntil: count >= MAX ? new Date(now + WINDOW).toISOString() : null };
  if (rec) await zite.loginAttempts.update({ id: rec.id, record });
  else await zite.loginAttempts.create({ record });
}
export async function clearAttempts(rec?: { id: string }) {
  if (rec) await zite.loginAttempts.delete({ id: rec.id });
}
