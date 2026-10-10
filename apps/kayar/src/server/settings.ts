import { z } from 'zod';
import { zite } from 'zitejs/db';

export const settingsSchema = z.object({
  siteName: z.string().max(80).default('کایار'),
  shopUrl: z.string().max(300).default('https://kapoosh.ir'),
  supportPhone: z.string().max(30).default(''),
  supportWhatsapp: z.string().max(300).default(''),
  instagram: z.string().max(300).default(''),
  telegram: z.string().max(300).default(''),
  jamendoEnabled: z.boolean().default(true),
  maintenance: z.boolean().default(false),
  maintenanceMessage: z.string().max(500).default('در حال به‌روزرسانی هستیم؛ کمی بعد برگرد.'),
});
export type Settings = z.infer<typeof settingsSchema>;

export async function getSettings(): Promise<Settings & { _id?: string }> {
  const rec = await zite.siteSettings.findOne({ filters: { key: 'site' } });
  let raw: unknown = {};
  try { raw = JSON.parse(rec?.value || '{}'); } catch { raw = {}; }
  const parsed = settingsSchema.safeParse(raw);
  return { ...(parsed.success ? parsed.data : settingsSchema.parse({})), _id: rec?.id };
}
