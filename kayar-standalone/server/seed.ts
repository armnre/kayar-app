/**
 * KAYAR backend — first-boot bootstrap.
 *
 * • creates the super-admin from Secrets (`ZITE_BOOTSTRAP_ADMIN_USERNAME/PASSWORD`) when the
 *   members table is empty — exactly like the hosted platform did;
 * • on an empty database only, seeds a realistic Persian demo dataset so the site, the member
 *   app and the admin panel have real content (deletable from the admin panel afterwards).
 */
import { config } from './config';
import { db, collection } from './db';
import { hashPassword, normalizeUsername } from '@/server/auth';

export const DEMO_PASSWORD = config.auth.bootstrapPassword || 'kayar1403';

const iso = (daysAgo: number, hour = 9, minute = 0) => {
  const d = new Date(Date.now() - daysAgo * 86400_000);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const NAMES = ['سارا محمدی', 'علی رضایی', 'مریم کریمی', 'رضا احمدی', 'نگار حسینی', 'امیر موسوی', 'فاطمه نوری', 'حسین شریفی', 'الهام صادقی', 'محمد کاظمی', 'زهرا بیات', 'بابک تهرانی', 'پریسا فتحی', 'سینا رحیمی', 'مهدی قاسمی', 'آیدا نوروزی'];
const PRODUCTS = ['تی‌شرت Run', 'تی‌شرت Power Fit', 'هودی Flow', 'شلوارک Sprint'];
const STATUSES = ['active', 'active', 'active', 'pending', 'active', 'suspended', 'active', 'active'];
const SFX = (n: number) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;
const IMG = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`;

const TRACKS = [
  { t: 'ضربان شهر', a: 'KYR Sound', cat: 'کاردیو', dur: 214, sfx: 1, img: '1518611012118-696072aa579a' },
  { t: 'آهن و نفس', a: 'استودیو رِلاین', cat: 'شروع قدرتی', dur: 188, sfx: 2, img: '1534438327276-14e5300c3a48' },
  { t: 'سحرگاه', a: 'پروژه‌ی نیلی', cat: 'ریکاوری', dur: 245, sfx: 3, img: '1517836357463-d25dfeac3438' },
  { t: 'تمرکز عمیق', a: 'لایه‌های آرام', cat: 'تمرکز', dur: 302, sfx: 4, img: '1544367567-0f2fcb009e0b' },
  { t: 'سرعت نور', a: 'KYR Sound', cat: 'انرژی', dur: 176, sfx: 5, img: '1461896836934-ffe607ba8211' },
  { t: 'کیلومتر دهم', a: 'باشگاه نُت', cat: 'کاردیو', dur: 231, sfx: 6, img: '1476480862126-209bfaa8edc8' },
];

const POSTS = [
  { slug: 'zero-to-5k', title: 'از صفر تا ۵ کیلومتر در ۸ هفته', excerpt: 'یک برنامه‌ی ساده و واقعی برای کسی که تازه می‌خواهد دویدن را شروع کند.', tags: 'دویدن,شروع', body: '## هفته‌ی اول\nسه جلسه‌ی ۲۰ دقیقه‌ای کافی است؛ ترکیب **دویدن آرام** و راه رفتن.\n\n## نکته‌ی مهم\nسرعت را بر اساس نفس‌کشیدن تنظیم کن، نه ساعت. اگر نمی‌توانی حرف بزنی، کمی آرام‌تر بدو.\n\n> پیشرفت کند ولی پیوسته، از تلاش شدید و پراکنده بهتر است.' },
  { slug: 'protein-basics', title: 'پروتئین: چقدر، کی، از کجا؟', excerpt: 'جواب ساده به پرتکرارترین سؤال تغذیه‌ی ورزشی، بدون اغراق.', tags: 'تغذیه', body: '## روزانه چقدر؟\nبرای تمرین قدرتی حدود **۱.۶ تا ۲ گرم** به ازای هر کیلوگرم وزن بدن کافی است.\n\n## پخش‌کردن\nمصرف را در ۳ تا ۴ وعده پخش کن.\n\n- تخم‌مرغ، ماست یونانی، حبوبات و مرغ ساده‌ترین گزینه‌ها هستند.' },
  { slug: 'music-tempo', title: 'ریتم موزیک و سرعت تمرین', excerpt: 'چرا بعضی آهنگ‌ها شما را سریع‌تر می‌کنند و چطور از آن استفاده کنیم.', tags: 'موزیک,کارایی', body: '## ضرب‌آهنگ هدف\nبرای دویدن آرام، ۱۵۰ تا ۱۷۰ ضربه در دقیقه (BPM) نقطه‌ی شیرین است.\n\n## در «مرشد»\nمجموعه‌ها بر اساس هدف ساخته شده‌اند: کاردیو، شروع قدرتی، ریکاوری و تمرکز.' },
  { slug: 'recovery-day', title: 'روز استراحت هم بخشی از تمرین است', excerpt: 'ریکاوری فعال، کشش و خواب؛ سه ستون پیشرفت پایدار.', tags: 'ریکاوری,خواب', body: '## ریکاوری فعال\n۲۰ دقیقه پیاده‌روی یا شنای آرام، جریان خون را بهتر می‌کند.\n\n## خواب\nکمتر از ۷ ساعت خواب، بازدهی تمرین قدرتی را تا ۲۰٪ کم می‌کند.' },
  { slug: 'kayar-guide', title: 'راهنمای شروع با کایار', excerpt: 'از خرید کاپوش تا اولین تمرین با بدن‌یار و مرشد.', tags: 'راهنما', body: '۱. از فروشگاه کاپوش کد حساب خود را بگیر.\n۲. وارد **اپ کایار** شو و رمز اولیه را عوض کن.\n۳. در «مرشد» موزیک مناسب تمرین و در «بدن‌یار» برنامه‌ی شخصی را ببین.' },
];

const ANNOUNCEMENTS = [
  { title: 'مجموعه‌ی جدید «کاردیو تند» منتشر شد', body: '۱۲ آهنگ تازه برای تمرین‌های اینتروال اضافه شد.', link: '/app/morshed', days: 1 },
  { title: 'به‌روزرسانی برنامه‌ی هفتگی', body: 'برنامه‌ی تمرین هفتگی هوشمندتر شد؛ حجم و شدت بر اساس روزهای حضور تنظیم می‌شود.', link: '', days: 4 },
  { title: 'تعطیلات رسمی و پشتیبانی', body: 'پاسخگویی تلفنی در روزهای تعطیل با تأخیر همراه است؛ از واتس‌اپ استفاده کنید.', link: 'https://kapoosh.ir', days: 9 },
];

const COLLECTIONS = [
  { title: 'گرم‌کردن و شروع قدرتی', slug: 'warmup-power', desc: 'با ضرب‌آهنگ آرام‌تر شروع کن و بعد اوج بگیر.', placement: 'home', tracks: [2, 6] },
  { title: 'کاردیو تند', slug: 'cardio-fast', desc: 'برای اینتروال و دویدن سریع.', placement: 'home', tracks: [1, 5] },
  { title: 'ریکاوری', slug: 'recovery', desc: 'روزهای سبک، کشش و تنفس.', placement: 'morshed', tracks: [3] },
  { title: 'تمرکز', slug: 'focus', desc: 'برای تمرین‌های ذهنی و تنفسی.', placement: 'morshed', tracks: [4] },
];

export async function bootstrap(): Promise<{ createdSuperadmin?: string; seeded?: number }> {
  const members = collection('members');
  const staffCount = await members.count({ filters: { role: { in: ['support', 'editor', 'admin', 'superadmin'] } } });

  if (staffCount === 0) {
    if (!config.auth.bootstrapPassword) {
      console.warn('[kayar] no staff accounts and no ZITE_BOOTSTRAP_ADMIN_PASSWORD set — set it in server/.env');
      return {};
    }
    const created = await members.create({
      record: {
        username: normalizeUsername(config.auth.bootstrapUsername),
        displayName: 'مدیر ارشد کایار',
        phone: '09120000000',
        role: 'superadmin',
        status: 'active',
        passwordHash: await hashPassword(config.auth.bootstrapPassword),
        mustChangePassword: false,
        tags: ['کارکنان'],
        orderRef: '',
        note: 'حساب ساخته‌شده از Secrets هنگام راه‌اندازی سرور.',
        createdBy: 'bootstrap',
      },
    });
    await collection('auditLogs').create({ record: { actorId: 'system', action: 'bootstrap.superadmin', targetType: 'member', targetId: created.id, meta: '{}' } });
    const seeded = await seedDemo();
    return { createdSuperadmin: String(created.username), seeded };
  }
  return {};
}

/** Seeds content only when the database is empty (idempotent). */
async function seedDemo(countOnly = false): Promise<number> {
  const posts = collection('posts');
  const existing = await posts.count({});
  if (existing > 0) return 0;
  if (countOnly) return 0;
  let n = 0;

  const hash = await hashPassword(DEMO_PASSWORD);
  const members = collection('members');

  // staff
  for (const [i, s] of [['editor', 'سردبیر محتوا', 'editor'], ['support', 'پشتیبانی کاپوش', 'support']].entries()) {
    await members.create({ record: { username: s[0], displayName: s[1], phone: `0912000000${i + 1}`, role: s[2], status: 'active', passwordHash: hash, mustChangePassword: false, tags: ['کارکنان'], orderRef: '', note: '', lastLoginAt: iso(i + 1, 11) } });
    n++;
  }

  // customers (accounts created from shop orders)
  const customerIds: string[] = [];
  for (let i = 0; i < NAMES.length; i++) {
    const status = STATUSES[i % STATUSES.length]!;
    const c = await members.create({
      record: {
        username: `kp-${1040 + i}`, displayName: NAMES[i], phone: `0912${String(3450000 + i * 7919).slice(0, 7)}`,
        role: 'member', status, passwordHash: hash, mustChangePassword: i % 7 === 3,
        orderRef: `KP-1403-${1000 + i}`, note: i % 5 === 0 ? 'خرید حضوری از شعبه‌ی ونک.' : '', tags: [PRODUCTS[i % PRODUCTS.length]!],
        lastLoginAt: status === 'active' && i % 3 !== 2 ? iso(i % 9, 18, 30) : null, createdBy: 'shop',
      },
    });
    customerIds.push(c.id);
    n++;
  }

  // site settings
  await collection('siteSettings').create({
    record: {
      key: 'site',
      value: JSON.stringify({
        siteName: 'کایار', shopUrl: 'https://kapoosh.ir', supportPhone: '۰۲۱-۹۱۰۰۲۲۳۳', supportEmail: 'support@kapoosh.ir',
        supportWhatsapp: 'https://wa.me/989120000000', instagram: 'https://instagram.com/kapoosh', telegram: '',
        jamendoEnabled: true, maintenance: false, maintenanceMessage: '',
        loginHelpText: `نام کاربری و رمز اولیه را از فروشگاه کاپوش دریافت کرده‌اید. حساب نمونه: kp-1040 / ${DEMO_PASSWORD}`,
      }),
    },
  });
  n++;

  // media library
  const assetIds: string[] = [];
  for (let i = 0; i < 4; i++) {
    const t = TRACKS[i]!;
    const a = await collection('mediaAssets').create({ record: { alt: `کاور آهنگ ${t.t}`, fileUrl: IMG(t.img), kind: 'image', fileName: `${t.t.replace(/\s/g, '-')}.jpg`, mimeType: 'image/jpeg', width: 1200, height: 800, size: 182_000 + i * 5120, uploadedBy: '' } });
    assetIds.push(a.id);
    n++;
  }

  // tracks + collections
  const trackIds: string[] = [];
  for (let i = 0; i < TRACKS.length; i++) {
    const t = TRACKS[i]!;
    const row = await collection('tracks').create({
      record: {
        title: t.t, artist: t.a, album: 'مجموعه‌ی کایار', source: 'library', sourceId: '', coverUrl: IMG(t.img), audioUrl: SFX(t.sfx),
        durationSeconds: t.dur, licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', shareUrl: 'https://soundhelix.com/',
        rights: 'نمونه‌ی صوتی CC BY — SoundHelix. پیش از استفاده‌ی تجاری مجوز را بررسی کنید.',
        categories: t.cat, tags: `${t.cat},کایار`, isFeatured: i === 0 || i === 4, status: 'published', sortOrder: i + 1,
      },
    });
    trackIds.push(row.id);
    n++;
  }
  for (let i = 0; i < COLLECTIONS.length; i++) {
    const c = COLLECTIONS[i]!;
    const col = await collection('collections').create({ record: { title: c.title, slug: c.slug, description: c.desc, coverUrl: '', type: 'row', placement: c.placement, status: 'published', sortOrder: i + 1 } });
    for (let k = 0; k < c.tracks.length; k++) {
      await collection('collectionItems').create({ record: { collectionId: col.id, trackId: trackIds[c.tracks[k]! - 1]!, sortOrder: k + 1 } });
      n++;
    }
    n++;
  }

  // posts
  for (let i = 0; i < POSTS.length; i++) {
    const p = POSTS[i]!;
    await posts.create({
      record: {
        slug: p.slug, title: p.title, excerpt: p.excerpt, body: p.body, tags: p.tags, status: 'published', publishedAt: iso(i * 6 + 1, 8),
        coverMediaId: i < 4 ? assetIds[i]! : '', seoTitle: p.title, seoDescription: p.excerpt, authorId: '',
      },
    });
    n++;
  }

  // announcements
  for (const a of ANNOUNCEMENTS) {
    await collection('announcements').create({ record: { title: a.title, body: a.body, link: a.link, startsAt: iso(a.days, 10), endsAt: iso(a.days - 21, 10), status: 'published', audience: 'all', createdBy: 'سردبیر محتوا' } });
    n++;
  }

  // activity: logins, plays, audit trail (drives the dashboard charts)
  for (let i = 0; i < 64; i++) {
    const d = i % 29;
    await collection('listeningHistory').create({ record: { memberId: customerIds[i % customerIds.length]!, trackId: `lib:${trackIds[i % trackIds.length]!}`, positionSec: 30 + ((i * 17) % 150), completed: i % 5 === 0, playedAt: iso(d, 7 + (i % 12), (i * 7) % 60) } });
    n++;
  }
  for (let i = 0; i < 13; i++) {
    await collection('auditLogs').create({
      record: {
        actorId: customerIds[i % customerIds.length]!, action: 'auth.login', targetType: 'member',
        targetId: customerIds[i % customerIds.length]!, meta: '{"scope":"app"}',
        // spread the logins over the last week so the dashboard trend is real data
        createdAt: iso(i % 7, 8 + (i % 9), (i * 11) % 60),
      },
    });
    n++;
  }
  const events: [string, string, string][] = [['post.create', 'post', ''], ['track.publish', 'track', trackIds[0]!], ['announcement.create', 'announcement', ''], ['media.upload', 'media', assetIds[0]!], ['settings.update', 'settings', ''], ['customer.bulk_create', 'member', ''], ['member.suspend', 'member', customerIds[5]!], ['post.publish', 'post', '']];
  for (const [action, tt, tid] of events) {
    await collection('auditLogs').create({ record: { actorId: '', action, targetType: tt, targetId: tid, meta: '{}' } });
    n++;
  }
  for (const t of trackIds.slice(0, 3)) {
    await collection('favorites').create({ record: { memberId: customerIds[0]!, trackId: t } });
    n++;
  }

  console.log(`[kayar] demo dataset seeded (${n} records) — sign in as kp-1040 / ${DEMO_PASSWORD}`);
  return n;
}

/** Used by `npm run db:reset`. */
export function resetDatabase() {
  for (const table of Object.keys(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().reduce((acc: Record<string, string>, r: any) => ({ ...acc, [r.name]: r.name }), {}))) {
    db.prepare(`DELETE FROM "${table}"`).run();
  }
}
