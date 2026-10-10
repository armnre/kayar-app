import { z } from 'zod';
import { zite } from 'zitejs/db';

const url = z.string().trim().max(300).refine((v) => !v || /^https:\/\/[^\s]+$/.test(v), 'لینک باید با https:// شروع شود.');

export const settingsSchema = z.object({
  siteName: z.string().trim().min(1).max(80).default('کایار'),
  shopUrl: url.default('https://kapoosh.ir'),
  supportPhone: z.string().trim().max(30).refine((v) => !v || /^[+\d\s\-()۰-۹]+$/.test(v), 'شماره تماس معتبر نیست.').default(''),
  supportEmail: z.string().trim().max(120).refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'ایمیل معتبر نیست.').default(''),
  supportWhatsapp: url.default(''),
  instagram: url.default(''),
  telegram: url.default(''),
  jamendoEnabled: z.boolean().default(true),
  maintenance: z.boolean().default(false),
  maintenanceMessage: z.string().max(500).default('در حال به‌روزرسانی هستیم؛ کمی بعد برگرد.'),
  /** System texts editors may change (plain text only). */
  loginHelpText: z.string().max(300).default('نام کاربری و رمز را از فروشگاه کاپوش دریافت کرده‌ای.'),
});
export type Settings = z.infer<typeof settingsSchema>;

export async function getSettings(): Promise<Settings & { _id?: string }> {
  const rec = await zite.siteSettings.findOne({ filters: { key: 'site' } });
  let raw: unknown = {};
  try { raw = JSON.parse(rec?.value || '{}'); } catch { raw = {}; }
  const parsed = settingsSchema.safeParse(raw);
  // Stored values that no longer pass validation fall back field-by-field to defaults.
  const fallback = settingsSchema.parse({});
  const data = parsed.success ? parsed.data : { ...fallback, ...Object.fromEntries(Object.entries(raw as object).filter(([k, v]) => settingsSchema.shape[k as keyof Settings]?.safeParse(v).success)) };
  return { ...(data as Settings), _id: rec?.id };
}
