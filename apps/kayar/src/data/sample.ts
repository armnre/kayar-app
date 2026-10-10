// Sample data — every UI that uses this shows a «نمونه» badge. Replaced by real data in phase 1.
export type Track = { id: string; title: string; artist: string; duration: number; cat: string; hue: number; license: string; audio?: string; image?: string };

export const categories = ['شروع قدرتی', 'کاردیو', 'ریکاوری', 'تمرکز', 'انرژی'];

export const tracks: Track[] = [
  { id: 't1', title: 'ضربان شهر', artist: 'گروه نمونه', duration: 214, cat: 'کاردیو', hue: 254, license: 'CC BY' },
  { id: 't2', title: 'آهن و نفس', artist: 'هنرمند نمونه', duration: 188, cat: 'شروع قدرتی', hue: 71, license: 'CC BY' },
  { id: 't3', title: 'سحرگاه', artist: 'پروژه‌ی نمونه', duration: 245, cat: 'ریکاوری', hue: 188, license: 'CC BY-SA' },
  { id: 't4', title: 'تمرکز عمیق', artist: 'گروه نمونه', duration: 302, cat: 'تمرکز', hue: 40, license: 'CC BY' },
  { id: 't5', title: 'سرعت نور', artist: 'هنرمند نمونه', duration: 176, cat: 'انرژی', hue: 320, license: 'CC BY' },
  { id: 't6', title: 'کیلومتر دهم', artist: 'پروژه‌ی نمونه', duration: 231, cat: 'کاردیو', hue: 200, license: 'CC BY' },
  { id: 't7', title: 'ست آخر', artist: 'گروه نمونه', duration: 199, cat: 'شروع قدرتی', hue: 12, license: 'CC BY-SA' },
  { id: 't8', title: 'نفس آرام', artist: 'هنرمند نمونه', duration: 268, cat: 'ریکاوری', hue: 150, license: 'CC BY' },
];

export const podcasts: Track[] = [
  { id: 'p1', title: 'چرا گرم کردن مهم است', artist: 'پادکست نمونه', duration: 1260, cat: 'تمرکز', hue: 254, license: 'CC BY' },
  { id: 'p2', title: 'خواب و ریکاوری', artist: 'پادکست نمونه', duration: 1540, cat: 'ریکاوری', hue: 188, license: 'CC BY' },
];

export const posts = [
  { slug: 'start-running', title: 'از صفر تا ۵ کیلومتر در ۸ هفته', excerpt: 'یک برنامه‌ی ساده و واقعی برای کسی که تازه می‌خواهد دویدن را شروع کند.', tag: 'دویدن', date: new Date(2026, 8, 20), read: 6 },
  { slug: 'protein-basics', title: 'پروتئین: چقدر، کی، از کجا؟', excerpt: 'جواب ساده به پرتکرارترین سؤال تغذیه‌ی ورزشی، بدون اغراق.', tag: 'تغذیه', date: new Date(2026, 8, 12), read: 5 },
  { slug: 'music-tempo', title: 'ریتم موزیک و سرعت تمرین', excerpt: 'چرا بعضی آهنگ‌ها شما را سریع‌تر می‌کنند و چطور از آن استفاده کنیم.', tag: 'موزیک', date: new Date(2026, 8, 3), read: 4 },
  { slug: 'recovery-day', title: 'روز استراحت هم بخشی از تمرین است', excerpt: 'ریکاوری فعال، کشش و خواب؛ سه ستون پیشرفت پایدار.', tag: 'ریکاوری', date: new Date(2026, 7, 25), read: 5 },
];

export const faqs = [
  { q: 'کایار چیست؟', a: 'کایار همراه ورزشی هوشمند کاپوش است: موزیک مخصوص ورزش (مرشد) و برنامه‌ی تمرین و تغذیه‌ی شخصی (بدن‌یار).' },
  { q: 'چطور حساب کاربری بگیرم؟', a: 'بعد از خرید از فروشگاه کاپوش، نام کاربری و رمز اولیه را از فروشگاه دریافت می‌کنید. ثبت‌نام عمومی نداریم.' },
  { q: 'باید اپ نصب کنم؟', a: 'نه. کایار در مرورگر کار می‌کند. اگر بخواهید، بعداً می‌توانید آن را به صفحه‌ی اصلی گوشی اضافه کنید.' },
  { q: 'رمزم را فراموش کرده‌ام، چه کنم؟', a: 'با پشتیبانی فروشگاه کاپوش تماس بگیرید تا رمز جدید برایتان صادر شود.' },
  { q: 'هزینه دارد؟', a: 'برای خریداران لباس کاپوش رایگان است.' },
];

export const customers = Array.from({ length: 23 }, (_, i) => ({
  id: `c${i + 1}`,
  name: ['سارا محمدی', 'علی رضایی', 'مریم کریمی', 'رضا احمدی', 'نگار حسینی', 'امیر موسوی'][i % 6],
  username: `kp-${1040 + i}`,
  phone: `0912${String(3000000 + i * 7919).slice(0, 7)}`,
  product: ['تیشرت Run', 'تیشرت Power', 'هودی Flow'][i % 3],
  status: (['active', 'active', 'pending', 'suspended'] as const)[i % 4],
  created: new Date(2026, 8, 28 - i),
}));

export const audit = [
  { who: 'مدیر نمونه', action: 'ساخت حساب مشتری kp-1062', at: new Date(2026, 9, 10, 18, 20) },
  { who: 'کارمند نمونه', action: 'ویرایش مطلب «پروتئین»', at: new Date(2026, 9, 10, 15, 2) },
  { who: 'مدیر نمونه', action: 'تعلیق حساب kp-1043', at: new Date(2026, 9, 9, 11, 40) },
  { who: 'مدیر نمونه', action: 'تغییر تنظیمات پشتیبانی', at: new Date(2026, 9, 8, 9, 15) },
];

export const fallbackProducts = [
  { id: 1, name: 'تیشرت ورزشی Run', price: 890000, image: '', link: 'https://kapoosh.ir' },
  { id: 2, name: 'تیشرت Power Fit', price: 940000, image: '', link: 'https://kapoosh.ir' },
  { id: 3, name: 'هودی Flow', price: 1650000, image: '', link: 'https://kapoosh.ir' },
  { id: 4, name: 'شلوارک Sprint', price: 720000, image: '', link: 'https://kapoosh.ir' },
];
