/**
 * Demo data for the standalone port.
 *
 * On the hosted platform the database starts empty (the first super-admin is created from
 * Secrets). For this browser-local build we seed a small, realistic dataset — matching the
 * field names the endpoint code expects — so every screen has something to show.
 *
 * Seeding happens once; the flag lives in localStorage together with the data itself.
 */

import { __tables, __persist, hadStoredData, STORAGE_KEY } from './db';
import { hashPassword } from '../server/auth';

/** Shared demo password for every seeded account. */
export const DEMO_PASSWORD = 'kayar1403';

const iso = (daysAgo: number, hour = 9, minute = 0) => {
  const d = new Date(Date.now() - daysAgo * 86400_000);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const NAMES = [
  'سارا محمدی', 'علی رضایی', 'مریم کریمی', 'رضا احمدی', 'نگار حسینی', 'امیر موسوی',
  'فاطمه نوری', 'حسین شریفی', 'الهام صادقی', 'محمد کاظمی', 'زهرا بیات', 'بابک تهرانی',
  'پریسا فتحی', 'سینا رحیمی', 'مهدی قاسمی', 'آیدا نوروزی',
];
const PRODUCTS = ['تی‌شرت Run', 'تی‌شرت Power Fit', 'هودی Flow', 'شلوارک Sprint'];
const STATUSES = ['active', 'active', 'active', 'pending', 'active', 'suspended', 'active', 'active'];

const SFX = (n: number) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;
const UNSPLASH = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`;

const TRACKS = [
  { t: 'ضربان شهر', a: 'KYR Sound', cat: 'کاردیو', dur: 214, sfx: 1, img: '1518611012118-696072aa579a' },
  { t: 'آهن و نفس', a: 'استودیو رِلاین', cat: 'شروع قدرتی', dur: 188, sfx: 2, img: '1534438327276-14e5300c3a48' },
  { t: 'سحرگاه', a: 'پروژه‌ی نیلی', cat: 'ریکاوری', dur: 245, sfx: 3, img: '1517836357463-d25dfeac3438' },
  { t: 'تمرکز عمیق', a: 'لایه‌های آرام', cat: 'تمرکز', dur: 302, sfx: 4, img: '1544367567-0f2fcb009e0b' },
  { t: 'سرعت نور', a: 'KYR Sound', cat: 'انرژی', dur: 176, sfx: 5, img: '1461896836934-ffe607ba8211' },
  { t: 'کیلومتر دهم', a: 'باشگاه نُت', cat: 'کاردیو', dur: 231, sfx: 6, img: '1476480862126-209bfaa8edc8' },
];

const POSTS = [
  {
    slug: 'zero-to-5k', title: 'از صفر تا ۵ کیلومتر در ۸ هفته',
    excerpt: 'یک برنامه‌ی ساده و واقعی برای کسی که تازه می‌خواهد دویدن را شروع کند.',
    tags: 'دویدن,شروع', body: '## هفته‌ی اول\nسه جلسه‌ی ۲۰ دقیقه‌ای کافی است؛ ترکیب **دویدن آرام** و راه رفتن.\n\n## نکته‌ی مهم\nسرعت را بر اساس نفس‌کشیدن تنظیم کن، نه ساعت. اگر نمی‌توانی حرف بزنی، کمی آرام‌تر بدو.\n\n> پیشرفت کند ولی پیوسته، از تلاش شدید و پراکنده بهتر است.',
  },
  {
    slug: 'protein-basics', title: 'پروتئین: چقدر، کی، از کجا؟',
    excerpt: 'جواب ساده به پرتکرارترین سؤال تغذیه‌ی ورزشی، بدون اغراق.',
    tags: 'تغذیه', body: '## روزانه چقدر؟\nبرای تمرین قدرتی، حدود **۱.۶ تا ۲ گرم** به ازای هر کیلوگرم وزن بدن کافی است.\n\n## پخش‌کردن\nمصرف را در ۳ تا ۴ وعده پخش کن؛ بدن در هر وعده حدود ۳۰ گرم را بهتر استفاده می‌کند.\n\n- تخم‌مرغ، ماست یونانی، حبوبات و مرغ ساده‌ترین گزینه‌ها هستند.',
  },
  {
    slug: 'music-tempo', title: 'ریتم موزیک و سرعت تمرین',
    excerpt: 'چرا بعضی آهنگ‌ها شما را سریع‌تر می‌کنند و چطور از آن استفاده کنیم.',
    tags: 'موزیک,کارایی', body: '## ضرب‌آهنگ هدف\nبرای دویدن آرام، ۱۵۰ تا ۱۷۰ ضربه در دقیقه (BPM) نقطه‌ی شیرین است.\n\n## در «مرشد»\nمجموعه‌ها بر اساس هدف ساخته شده‌اند: کاردیو، شروع قدرتی، ریکاوری و تمرکز.',
  },
  {
    slug: 'recovery-day', title: 'روز استراحت هم بخشی از تمرین است',
    excerpt: 'ریکاوری فعال، کشش و خواب؛ سه ستون پیشرفت پایدار.',
    tags: 'ریکاوری,خواب', body: '## ریکاوری فعال\n۲۰ دقیقه پیاده‌روی یا شنای آرام، جریان خون را بهتر می‌کند.\n\n## خواب\nکمتر از ۷ ساعت خواب، بازدهی تمرین قدرتی را تا ۲۰٪ کم می‌کند.',
  },
  {
    slug: 'kayar-guide', title: 'راهنمای شروع با کایار',
    excerpt: 'از خرید کاپوش تا اولین تمرین با بدن‌یار و مرشد.',
    tags: 'راهنما', body: '۱. از فروشگاه کاپوش کد حساب خود را بگیر.\n۲. وارد **اپ کایار** شو و رمز اولیه را عوض کن.\n۳. در «مرشد» موزیک مناسب تمرین و در «بدن‌یار» برنامه‌ی شخصی را ببین.',
  },
];

const ANNOUNCEMENTS = [
  { title: 'مجموعه‌ی جدید «کاردیو تند» منتشر شد', body: '۱۲ آهنگ تازه برای تمرین‌های اینتروال اضافه شد.', link: '/app/morshed', days: 1 },
  { title: 'به‌روزرسانی برنامه‌ی هفتگی', body: 'برنامه‌ی تمرین هفتگی هوشمندتر شد؛ حجم و شدت بر اساس روزهای حضور تنظیم می‌شود.', link: '', days: 4 },
  { title: 'تعطیلات رسمی و پشتیبانی', body: 'پاسخگویی تلفنی در روزهای تعطیل با تأخیر همراه است؛ از واتساپ استفاده کنید.', link: 'https://kapoosh.ir', days: 9 },
];

const COLLECTIONS = [
  { title: 'گرم‌کردن و شروع قدرتی', slug: 'warmup-power', desc: 'با ضرب‌آهنگ آرام‌تر شروع کن و بعد اوج بگیر.', placement: 'home', tracks: [2, 6] },
  { title: 'کاردیو تند', slug: 'cardio-fast', desc: 'برای اینتروال و دویدن سریع.', placement: 'home', tracks: [1, 5] },
  { title: 'ریکاوری', slug: 'recovery', desc: 'روزهای سبک، کشش و تنفس.', placement: 'morshed', tracks: [3] },
  { title: 'تمرکز', slug: 'focus', desc: 'برای تمرین‌های ذهنی و تنفسی.', placement: 'morshed', tracks: [4] },
];

let seeding: Promise<void> | null = null;

export function seedDemoData(): Promise<void> {
  return (seeding ??= run());
}

async function run() {
  if (hadStoredData) return;
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const push = (name: string, records: Record<string, unknown>[]) => {
    __tables[name]!.push(...records.map((r) => ({ ...r })));
  };

  /* ---------------------------------------------------------------- members */
  const staff = [
    { id: 'm-admin', username: 'admin', displayName: 'مدیر ارشد کایار', phone: '09120000000', role: 'superadmin', status: 'active', tags: ['کارکنان'], orderRef: '', note: 'حساب ساخته‌شده از Secrets پلتفرم.' },
    { id: 'm-editor', username: 'editor', displayName: 'سردبیر محتوا', phone: '09120000001', role: 'editor', status: 'active', tags: ['کارکنان'], orderRef: '', note: '' },
    { id: 'm-support', username: 'support', displayName: 'پشتیبانی کاپوش', phone: '09120000002', role: 'support', status: 'active', tags: ['کارکنان'], orderRef: '', note: '' },
  ].map((m, i) => ({
    ...m, passwordHash, mustChangePassword: false, lastLoginAt: iso(i === 0 ? 0 : i + 1, 11), createdAt: iso(160 - i * 3), updatedAt: iso(2),
  }));
  push('members', staff);

  const customers = NAMES.map((displayName, i) => {
    const status = STATUSES[i % STATUSES.length]!;
    const product = PRODUCTS[i % PRODUCTS.length]!;
    return {
      id: `m-c${i + 1}`,
      username: `kp-${1040 + i}`,
      displayName,
      phone: `0912${String(3450000 + i * 7919).slice(0, 7)}`,
      role: 'member',
      status,
      passwordHash,
      mustChangePassword: i % 7 === 3,
      orderRef: `KP-1403-${String(1000 + i)}`,
      note: i % 5 === 0 ? 'خرید حضوری از شعبه‌ی ونک.' : '',
      tags: [product],
      lastLoginAt: status === 'active' && i % 3 !== 2 ? iso(i % 9, 18, 30) : null,
      createdAt: iso(120 - i * 4, 12),
      updatedAt: iso(1),
    };
  });
  push('members', customers);

  /* -------------------------------------------------------- site settings */
  push('siteSettings', [{
    id: 's-site', key: 'site', createdAt: iso(170), updatedAt: iso(3),
    value: JSON.stringify({
      siteName: 'کایار', shopUrl: 'https://kapoosh.ir', supportPhone: '۰۲۱-۹۱۰۰۲۲۳۳', supportEmail: 'support@kapoosh.ir',
      supportWhatsapp: 'https://wa.me/989120000000', instagram: 'https://instagram.com/kapoosh', telegram: '',
      jamendoEnabled: true, maintenance: false, maintenanceMessage: '',
      loginHelpText: 'نام کاربری و رمز اولیه را از فروشگاه کاپوش دریافت کرده‌اید. حساب نمونه: kp-1040 / kayar1403',
    }),
  }]);

  /* ------------------------------------------------------------- media library */
  push('mediaAssets', TRACKS.slice(0, 4).map((t, i) => ({
    id: `a-${i + 1}`, alt: `کاور آهنگ ${t.t}`, fileUrl: UNSPLASH(t.img), kind: 'image', fileName: `${t.t.replace(/\s/g, '-')}.jpg`,
    mimeType: 'image/jpeg', width: 1200, height: 800, size: 182_000 + i * 5120, uploadedBy: 'm-editor',
    createdAt: iso(20 - i * 2, 10), updatedAt: iso(20 - i * 2, 10),
  })));

  /* ----------------------------------------------------------------- tracks */
  push('tracks', TRACKS.map((t, i) => ({
    id: `t-${i + 1}`, title: t.t, artist: t.a, album: 'مجموعه‌ی کایار', source: 'library', sourceId: '',
    coverUrl: UNSPLASH(t.img), audioUrl: SFX(t.sfx), durationSeconds: t.dur,
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', shareUrl: 'https://soundhelix.com/',
    rights: 'نمونه‌ی صوتی CC BY — SoundHelix. پیش از استفاده‌ی تجاری مجوز را بررسی کنید.',
    categories: t.cat, tags: `${t.cat},کایار`, isFeatured: i === 0 || i === 4, status: 'published', sortOrder: i + 1,
    createdAt: iso(60 - i, 9), updatedAt: iso(6 - (i % 5), 9),
  })));

  /* ----------------------------------------------------------- collections */
  push('collections', COLLECTIONS.map((c, i) => ({
    id: `col-${i + 1}`, title: c.title, slug: c.slug, description: c.desc, coverUrl: '', type: 'row',
    placement: c.placement, status: 'published', sortOrder: i + 1, createdAt: iso(50 - i, 9), updatedAt: iso(5, 9),
  })));
  push('collectionItems', COLLECTIONS.flatMap((c, i) => c.tracks.map((n, k) => ({
    id: `ci-${i + 1}-${k + 1}`, collectionId: `col-${i + 1}`, trackId: `t-${n}`, sortOrder: k + 1,
    createdAt: iso(50 - i, 9), updatedAt: iso(5, 9),
  }))));

  /* ------------------------------------------------------------------ posts */
  push('posts', POSTS.map((p, i) => ({
    id: `p-${i + 1}`, slug: p.slug, title: p.title, excerpt: p.excerpt, body: p.body, tags: p.tags,
    status: 'published', publishedAt: iso(i * 6 + 1, 8), coverMediaId: i < 4 ? `a-${i + 1}` : '',
    seoTitle: p.title, seoDescription: p.excerpt, authorId: 'm-editor',
    createdAt: iso(40 - i * 3, 8), updatedAt: iso(i * 6 + 1, 8),
  })));

  /* ---------------------------------------------------------- announcements */
  push('announcements', ANNOUNCEMENTS.map((a, i) => ({
    id: `an-${i + 1}`, title: a.title, body: a.body, link: a.link, startsAt: iso(a.days, 10), endsAt: iso(a.days - 21, 10),
    status: 'published', audience: 'all', createdBy: 'سردبیر محتوا', createdAt: iso(a.days, 10), updatedAt: iso(a.days, 10),
  })));

  /* ------------------------------------------------------------ activity data */
  const logins = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6].map((d, i) => ({
    id: `al-l${i}`, actorId: customers[i % customers.length]!.id, action: 'auth.login', targetType: 'member',
    targetId: customers[i % customers.length]!.id, meta: '{"scope":"app"}', createdAt: iso(d, 8 + (i % 9), 12),
  }));
  const events = [
    ['member.create', 'member', 'm-c16'], ['post.create', 'post', 'p-1'], ['track.publish', 'track', 't-1'],
    ['announcement.create', 'announcement', 'an-1'], ['media.upload', 'media', 'a-1'], ['collection.reorder', 'collection', ''],
    ['settings.update', 'settings', ''], ['member.suspend', 'member', 'm-c6'], ['post.publish', 'post', 'p-3'],
  ].map(([action, tt, tid], i) => ({
    id: `al-e${i}`, actorId: i % 3 === 0 ? 'm-editor' : 'm-admin', action, targetType: tt, targetId: tid,
    meta: '{}', createdAt: iso(2 + (i % 12), 9 + (i % 8), 25),
  }));
  push('auditLogs', [...logins, ...events]);

  const plays = Array.from({ length: 64 }, (_, i) => ({
    id: `lh-${i + 1}`, memberId: customers[i % customers.length]!.id, trackId: `lib:t-${(i % 6) + 1}`,
    positionSec: 30 + ((i * 17) % 150), completed: i % 5 === 0, playedAt: iso(i % 29, 7 + (i % 12), (i * 7) % 60),
    createdAt: iso(i % 29, 7, 0), updatedAt: iso(i % 29, 7, 0),
  }));
  push('listeningHistory', plays);
  push('favorites', [1, 3, 5].map((n, i) => ({
    id: `fv-${i + 1}`, memberId: 'm-c1', trackId: `lib:t-${n}`, createdAt: iso(7 - i, 19), updatedAt: iso(7 - i, 19),
  })));

  __persist();
  console.info('[kayar] seeded demo data →', STORAGE_KEY);
}
