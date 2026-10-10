import { z } from 'zod';

/** Shared (frontend + backend) CMS block contracts. Pure zod — no SDK imports. */
const s = (max: number) => z.string().trim().max(max);
const req = (max: number) => z.string().trim().min(1, 'این فیلد الزامی است').max(max);

export const blockSchemas = {
  hero: z.object({ eyebrow: s(60), title1: req(80), title2: req(80), subtitle: s(300), cta: req(40) }),
  steps: z.object({ title: req(60), accent: s(40), text: s(200), items: z.array(z.object({ t: req(60), d: s(200) })).min(1).max(6) }),
  morshed: z.object({ title: req(60), accent: s(60), text: s(400), chips: z.array(req(30)).max(8) }),
  bodyyar: z.object({ title: req(60), accent: s(60), text: s(400), steps: z.array(req(60)).min(1).max(8) }),
  faq: z.object({ items: z.array(z.object({ q: req(200), a: req(1200) })).max(20) }),
  cta: z.object({ title: req(80), text: s(300) }),
  footer: z.object({ tagline: s(200), copyright: s(120) }),
  seo: z.object({ title: req(70), description: s(170) }),
} as const;

export type BlockKey = keyof typeof blockSchemas;
export type BlockContent<K extends BlockKey> = z.infer<(typeof blockSchemas)[K]>;
export const BLOCK_KEYS = Object.keys(blockSchemas) as BlockKey[];

export const BLOCK_LABELS: Record<BlockKey, string> = {
  hero: 'بخش آغازین (هیرو)', steps: 'مراحل استفاده', morshed: 'معرفی مرشد', bodyyar: 'معرفی بدن‌یار',
  faq: 'سؤالات متداول', cta: 'دعوت پایانی', footer: 'فوتر', seo: 'SEO صفحه‌ی اصلی',
};

/** Built-in defaults shown on the site when nothing is published. Not "published content". */
export const DEFAULTS: { [K in BlockKey]: BlockContent<K> } = {
  hero: { eyebrow: 'همراه هوشمند ورزش و سلامت', title1: 'تیشرتت رو پوشیدی؟', title2: 'همراهت رو داری', subtitle: 'موزیک مخصوص ورزش و برنامه‌ی تمرین و تغذیه‌ی هوشمند، فقط برای خریداران کاپوش.', cta: 'ورود به کایار' },
  steps: { title: 'چطور کار', accent: 'می‌کنه؟', text: 'سه قدم ساده؛ بدون ثبت‌نام، بدون دانلود.', items: [
    { t: 'تیشرت کاپوش بخر', d: 'از فروشگاه آنلاین یا حضوری کاپوش.' },
    { t: 'حساب کایار رو بگیر', d: 'فروشگاه نام کاربری و رمز اولیه‌ات را بهت می‌دهد.' },
    { t: 'QR رو اسکن کن و شروع کن', d: 'QR روی لباس مستقیم تو را به کایار می‌برد.' },
  ] },
  morshed: { title: 'مرشد؛', accent: 'ریتم تمرینت', text: 'موزیک‌هایی که برای ورزش انتخاب شده‌اند؛ برای دویدن، تمرین قدرتی، ریکاوری و تمرکز. بزن و برو.', chips: ['دویدن', 'قدرتی', 'ریکاوری', 'تمرکز'] },
  bodyyar: { title: 'بدن‌یار؛', accent: 'برنامه‌ی مخصوص خودت', text: 'برنامه‌ی تمرین و غذایی من، هر روز در پروفایلم. بدن‌یار با شناخت بدن و هدفت، برنامه می‌سازد و همراهت پیش می‌آید.', steps: ['پروفایل بدنی‌ات رو بساز', 'هدفت رو انتخاب کن', 'برنامه‌ی هوشمند بگیر', 'هر روز پیگیری کن'] },
  faq: { items: [] },
  cta: { title: 'لباست آماده‌ست. تو چی؟', text: 'QR روی لباس را اسکن کن یا همین حالا وارد کایار شو.' },
  footer: { tagline: 'همراه ورزشی و سلامت تو، از برند کاپوش.', copyright: '© ۱۴۰۵ کاپوش. همه‌ی حقوق محفوظ است.' },
  seo: { title: 'همراه هوشمند ورزش و سلامت', description: 'کایار: موزیک مخصوص ورزش و برنامه‌ی تمرین و تغذیه‌ی هوشمند برای خریداران کاپوش.' },
};

/** Parses stored JSON; returns null when missing/invalid so callers can fall back. */
export function parseBlock<K extends BlockKey>(key: K, raw: string | null | undefined): BlockContent<K> | null {
  if (!raw) return null;
  try {
    const r = blockSchemas[key].safeParse(JSON.parse(raw));
    return r.success ? (r.data as BlockContent<K>) : null;
  } catch { return null; }
}
