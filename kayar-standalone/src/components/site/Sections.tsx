import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, KeyRound, QrCode, Play, Pause, ArrowLeft, Shirt } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/ui/ui/accordion';
import { kapooshProducts, type KapooshProductsOutputType } from '@/zite/api';
import { KButton, Glass, IconBox, Waveform, SampleBadge, Cover, ProgressRing, KayarLogo } from '../kit';
import { tracks, faqs, fallbackProducts } from '../../data/sample';
import { usePosts, usePublicSettings, type PostCard } from '../../lib/publicData';
import { fa, faDate, toman } from '../../lib/config';
import { useBlock } from '../../lib/cms';

const Divider = () => <div aria-hidden className="mx-auto h-px max-w-5xl bg-gradient-to-l from-transparent via-primary/40 to-transparent" />;

export function SectionHead({ eyebrow, title, accent, text, tone = 'text-primary' }: { eyebrow: string; title: string; accent: string; text?: string; tone?: string }) {
  return (
    <div className="reveal mx-auto mb-10 max-w-2xl text-center">
      <div className={`mb-2 font-latin text-sm font-bold tracking-[.2em] ${tone}`}>{eyebrow}</div>
      <h2 className="text-[clamp(1.75rem,4.5vw,3rem)] font-black">{title} <span className={tone}>{accent}</span></h2>
      {text && <p className="mt-3 text-[17px] leading-[1.8] text-muted-foreground">{text}</p>}
    </div>
  );
}

const STEP_ICONS = [ShoppingBag, KeyRound, QrCode];
export function Steps() {
  const b = useBlock('steps');
  const s = b.items.map((x, i) => ({ ...x, icon: STEP_ICONS[i % STEP_ICONS.length] }));
  return (
    <section id="how" className="relative scroll-mt-20 px-4 py-20 md:py-28">
      <SectionHead eyebrow="HOW IT WORKS" title={b.title} accent={b.accent} text={b.text} />
      <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
        {s.map((x, i) => (
          <Glass key={i} className="reveal relative overflow-hidden p-6" style={{ transitionDelay: `${i * 90}ms` }}>
            <span className="absolute -top-4 end-3 font-latin text-[96px] font-black leading-none text-white/[.04]">{i + 1}</span>
            <IconBox icon={x.icon} className="h-14 w-14" />
            <div className="mt-5 text-sm font-bold text-primary">مرحله‌ی {fa(i + 1)}</div>
            <h3 className="mt-1 text-xl font-extrabold">{x.t}</h3>
            <p className="mt-2 text-muted-foreground">{x.d}</p>
          </Glass>
        ))}
      </div>
    </section>
  );
}

export function MorshedSection() {
  const b = useBlock('morshed');
  const [playing, setPlaying] = useState(true);
  return (
    <section id="morshed" className="relative scroll-mt-20 overflow-hidden px-4 py-20 md:py-28">
      <div className="absolute inset-0 -z-10 [clip-path:polygon(0_6%,100%_0,100%_94%,0_100%)] bg-gradient-to-b from-violet/15 via-bg1 to-background" aria-hidden />
      <div className="absolute start-1/2 top-1/3 -z-10 h-80 w-80 rounded-full bg-violet/30 blur-[120px]" aria-hidden />
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
        <div className="reveal min-w-0">
          <div className="mb-2 font-latin text-sm font-bold tracking-[.2em] text-[hsl(254_100%_78%)]">MORSHED</div>
          <h2 className="text-[clamp(1.75rem,4.5vw,3rem)] font-black">{b.title} <span className="text-[hsl(254_100%_78%)]">{b.accent}</span></h2>
          <p className="mt-3 text-[17px] leading-[1.8] text-muted-foreground">{b.text}</p>
          <div className="mt-6 flex flex-wrap gap-2">{b.chips.map((c) => <span key={c} className="rounded-full border border-violet/40 bg-violet/10 px-4 py-2 text-sm font-bold">{c}</span>)}</div>
        </div>
        <div className="reveal relative min-w-0">
          <img src="https://images.fillout.com/888622/bvjezbu9kd/generated-images/afjACL6i7DDEtnZvwFmFHK/img_oPmkOrwF9MOWO-W_.jpg" alt="هدفون و گوشی روی کف باشگاه" width={1376} height={768} loading="lazy" className="aspect-video w-full rounded-[28px] object-cover opacity-80" />
          <Glass className="relative -mt-16 mx-3 p-4 sm:mx-8">
            <div className="mb-3 flex items-center justify-between"><span className="text-sm text-muted-foreground">در حال پخش</span><SampleBadge /></div>
            <div className="flex items-center gap-3">
              <Cover hue={254} className="h-14 w-14 shrink-0" />
              <div className="min-w-0 flex-1"><div className="truncate font-bold">{tracks[0].title}</div><div className="truncate text-sm text-muted-foreground">{tracks[0].artist}</div></div>
              <button className="press tap grid h-12 w-12 place-items-center rounded-full bg-violet text-white" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'توقف' : 'پخش'}>{playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}</button>
            </div>
            <Waveform bars={40} playing={playing} className="mt-3 w-full justify-between" color="bg-[hsl(254_100%_75%)]" />
          </Glass>
        </div>
      </div>
    </section>
  );
}

function PhoneMock() {
  const msgs = ['سلام! هدفت چیه؟', 'می‌خوام ۵ کیلو کم کنم و قوی‌تر بشم 💪', 'عالیه. برنامه‌ی ۴ روز در هفته برات ساختم.'];
  const [n, setN] = useState(1);
  useEffect(() => { const t = setInterval(() => setN((x) => (x >= 3 ? 1 : x + 1)), 1800); return () => clearInterval(t); }, []);
  return (
    <div className="relative mx-auto w-[min(300px,82vw)] rounded-[44px] border border-white/15 bg-bg1 p-3 shadow-xl" aria-hidden>
      <div className="mx-auto mb-3 h-5 w-24 rounded-full bg-black" />
      <div className="space-y-2 px-1">
        {msgs.slice(0, n).map((m, i) => <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-6 ${i % 2 ? 'ms-auto bg-primary text-primary-foreground' : 'bg-white/[.07]'}`}>{m.replace('💪', '')}</div>)}
      </div>
      <div className="mt-3 rounded-2xl bg-white/[.05] p-3">
        <div className="mb-2 flex items-center justify-between text-xs"><span className="font-bold">ماکروی امروز</span><SampleBadge /></div>
        <div className="flex justify-between">
          {[['پروتئین', 72, 'hsl(var(--primary))'], ['کربو', 54, 'hsl(var(--violet))'], ['چربی', 40, 'hsl(var(--gold))']].map(([l, v, c]) => <div key={l as string} className="text-center"><ProgressRing value={v as number} size={54} stroke={5} color={c as string}><span className="text-xs">{fa(v as number)}٪</span></ProgressRing><div className="mt-1 text-xs text-muted-foreground">{l}</div></div>)}
        </div>
      </div>
      <div className="mt-3 rounded-2xl bg-white/[.05] p-3">
        <div className="mb-1 text-xs font-bold">روند وزن</div>
        <svg viewBox="0 0 100 30" className="h-12 w-full"><defs><linearGradient id="wg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="hsl(71 100% 56%)" stopOpacity=".4" /><stop offset="1" stopColor="hsl(71 100% 56%)" stopOpacity="0" /></linearGradient></defs><path d="M0 8 L20 10 L40 13 L60 15 L80 19 L100 22 L100 30 L0 30Z" fill="url(#wg)" /><path d="M0 8 L20 10 L40 13 L60 15 L80 19 L100 22" fill="none" stroke="hsl(71 100% 56%)" strokeWidth="1.5" /></svg>
      </div>
    </div>
  );
}

export function BodyyarSection() {
  const b = useBlock('bodyyar');
  const steps = b.steps;
  return (
    <section id="bodyyar" className="relative scroll-mt-20 overflow-hidden px-4 py-20 md:py-28">
      <div className="absolute end-0 top-10 -z-10 h-96 w-96 rounded-full bg-primary/15 blur-[120px]" aria-hidden />
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <div className="reveal order-2 md:order-1"><PhoneMock /></div>
        <div className="reveal order-1 min-w-0 md:order-2">
          <div className="mb-2 font-latin text-sm font-bold tracking-[.2em] text-primary">BODYYAR</div>
          <h2 className="text-[clamp(1.75rem,4.5vw,3rem)] font-black">{b.title} <span className="text-primary">{b.accent}</span></h2>
          <p className="mt-3 text-[17px] leading-[1.8] text-muted-foreground">{b.text}</p>
          <ol className="relative mt-8 space-y-5 ps-2">
            <span className="absolute bottom-3 start-[27px] top-3 border-s-2 border-dashed border-primary/40" aria-hidden />
            {steps.map((s, i) => <li key={s} className="relative flex items-center gap-4"><span className="z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary font-black text-primary-foreground">{fa(i + 1)}</span><span className="text-lg font-bold">{s}</span></li>)}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function ShopSection({ compact }: { compact?: boolean }) {
  const [data, setData] = useState<KapooshProductsOutputType | null>(null);
  useEffect(() => { kapooshProducts({ limit: 4 }).then(setData).catch(() => setData({ products: [], live: false })); }, []);
  const live = data?.live && data.products.length > 0;
  const items = live ? data!.products.slice(0, 4) : fallbackProducts;
  return (
    <div className={compact ? '' : 'mx-auto max-w-6xl'}>
      {!live && data && <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><SampleBadge />اتصال به فروشگاه برقرار نشد؛ نمونه نمایش داده می‌شود.</div>}
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {!data ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4] w-[62vw] shrink-0 rounded-[28px] md:w-auto" />) : items.map((p) => (
          <a key={p.id} href={p.link} target="_blank" rel="noreferrer" className="glass press group w-[62vw] max-w-[260px] shrink-0 snap-start overflow-hidden rounded-[28px] md:w-auto md:max-w-none">
            <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-bg2 to-background">
              {p.image ? <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="absolute inset-0 grid place-items-center"><div className="absolute h-28 w-28 -rotate-12 rounded-3xl bg-primary/20" /><Shirt className="relative h-16 w-16 text-primary" strokeWidth={1.4} /></div>}
            </div>
            <div className="p-4"><div className="truncate font-bold">{p.name}</div><div className="mt-1 text-sm text-primary">{toman(p.price)}</div></div>
          </a>
        ))}
      </div>
    </div>
  );
}

export function BlogCards({ list }: { list: PostCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((p, i) => (
        <Link key={p.slug} to={`/blog/${encodeURIComponent(p.slug)}`} className="glass press group overflow-hidden rounded-[28px]">
          <div className="relative aspect-[16/9] overflow-hidden" style={p.coverUrl ? undefined : { background: `radial-gradient(100% 100% at ${20 + i * 30}% 0%, hsl(${[71, 254, 188, 40][i % 4]} 80% 50% / .45), hsl(var(--bg-2)))` }}>
            {p.coverUrl && <img src={p.coverUrl} alt={p.coverAlt || p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
            {p.tags[0] && <span className="absolute bottom-3 start-3 rounded-full bg-black/50 px-3 py-1 text-xs font-bold backdrop-blur">{p.tags[0]}</span>}
          </div>
          <div className="p-5"><h3 className="text-lg font-extrabold leading-8 group-hover:text-primary">{p.title}</h3><p className="mt-2 line-clamp-2 text-muted-foreground">{p.excerpt}</p><div className="mt-3 text-[13px] text-muted-foreground">{faDate(p.publishedAt)}</div></div>
        </Link>
      ))}
    </div>
  );
}

/** Latest published posts for the landing page; renders nothing when there are none or on error. */
export function LatestPosts() {
  const { d, err } = usePosts({ page: 1, pageSize: 3 });
  if (err || (d && !d.posts.length)) return null;
  return (
    <section className="px-4 py-20">
      <SectionHead eyebrow="BLOG" title="تازه‌ها از" accent="وبلاگ" />
      <div className="mx-auto max-w-6xl">{d ? <BlogCards list={d.posts} /> : <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton aspect-[4/3] rounded-[28px]" />)}</div>}</div>
      <div className="mt-8 text-center"><KButton variant="outline" to="/blog">همه‌ی مطالب</KButton></div>
    </section>
  );
}

export function FAQ() {
  const b = useBlock('faq');
  const items = b.items.length ? b.items : faqs;
  return (
    <section className="px-4 py-20">
      <SectionHead eyebrow="FAQ" title="سؤال‌های" accent="پرتکرار" />
      <Accordion type="single" collapsible className="reveal mx-auto max-w-3xl space-y-3">
        {items.map((f, i) => (
          <AccordionItem key={i} value={`f${i}`} className="glass rounded-3xl border-0 px-5">
            <AccordionTrigger className="min-h-[56px] text-start text-[17px] font-bold hover:no-underline">{f.q}</AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export function FinalCTA() {
  const b = useBlock('cta');
  return (
    <section className="px-4 py-16">
      <div className="reveal relative mx-auto grid max-w-6xl items-end overflow-hidden rounded-[32px] bg-primary text-primary-foreground md:grid-cols-[1.2fr_1fr]">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(-12deg, rgba(0,0,0,.3) 0 2px, transparent 2px 22px)' }} aria-hidden />
        <div className="relative p-8 md:p-14">
          <h2 className="text-[clamp(1.75rem,4.5vw,3.25rem)] font-black leading-tight">{b.title}</h2>
          <p className="mt-3 max-w-md text-[17px] font-medium leading-[1.8] opacity-80">{b.text}</p>
          <Link to="/app" className="press tap mt-6 inline-flex h-14 items-center gap-2 rounded-full bg-primary-foreground px-8 font-bold text-primary">ورود به کایار <ArrowLeft className="h-5 w-5" /></Link>
        </div>
        <img src="https://images.fillout.com/888646/9une2mcrla/generated-images/os1Spo3niySGCQKqh6RLQG/img_sgQAqtZdvystKoXd.jpg" alt="بانوی ورزشکار ایرانی با حجاب ورزشی و لباس تمرین کاپوش" width={1056} height={1408} loading="lazy" className="relative mx-auto h-80 w-auto object-cover md:h-[420px]" style={{ maskImage: 'radial-gradient(ellipse 55% 70% at 50% 45%, black 55%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 55% 70% at 50% 45%, black 55%, transparent 100%)' }} />
      </div>
    </section>
  );
}

export function Footer() {
  const b = useBlock('footer');
  const st = usePublicSettings();
  return (
    <footer className="relative overflow-hidden border-t border-white/5 px-4 pb-[calc(32px+var(--safe-b))] pt-14">
      <div className="pointer-events-none absolute inset-x-0 bottom-[-4vw] select-none text-center font-latin text-[22vw] font-black leading-none text-white/[.03]" aria-hidden>KAYAR</div>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:justify-between">
        <div><KayarLogo className="text-xl" /><p className="mt-3 max-w-xs text-muted-foreground">{b.tagline}</p></div>
        <nav className="grid grid-cols-2 gap-x-10 gap-y-1 text-[15px]" aria-label="پیوندهای فوتر">
          {([['/p/about', 'درباره'], ['/p/terms', 'قوانین'], ['/p/privacy', 'حریم خصوصی'], ['/blog', 'وبلاگ'], [st?.shopUrl || 'https://kapoosh.ir', 'فروشگاه کاپوش'], ['/app', 'ورود به کایار'], ...(st?.instagram ? [[st.instagram, 'اینستاگرام']] : []), ...(st?.telegram ? [[st.telegram, 'تلگرام']] : [])] as string[][]).map(([h, l]) => h.startsWith('http') ? <a key={h} href={h} target="_blank" rel="noopener noreferrer" className="tap flex items-center text-muted-foreground hover:text-foreground">{l}</a> : <Link key={h} to={h} className="tap flex items-center text-muted-foreground hover:text-foreground">{l}</Link>)}
        </nav>
      </div>
      <div className="relative mx-auto mt-10 flex max-w-6xl flex-wrap justify-between gap-2 text-[13px] text-muted-foreground"><span>{b.copyright}</span>{(st?.supportPhone || st?.supportEmail) && <span dir="ltr">{[st.supportPhone, st.supportEmail].filter(Boolean).join(' · ')}</span>}</div>
    </footer>
  );
}

export { Divider };
