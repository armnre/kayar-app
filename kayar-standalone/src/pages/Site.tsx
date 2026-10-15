import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/ui/lib/utils';
import SiteHeader, { useMeta } from '../components/site/SiteHeader';
import Hero from '../components/site/Hero';
import { Steps, MorshedSection, BodyyarSection, BlogCards, LatestPosts, FAQ, FinalCTA, Footer } from '../components/site/Sections';
import { Markdown } from '@/ui/markdown';
import { publicPosts, type PublicPostsOutputType } from '@/zite/api';
import { usePosts, type PostCard } from '../lib/publicData';
import { useReveal, KButton, StateView } from '../components/kit';
import { faDate } from '../lib/config';
import { useBlock } from '../lib/cms';
import { FileQuestion, RefreshCw, Newspaper } from 'lucide-react';

function StickyCTA() {
  const [show, setShow] = useState(false);
  useEffect(() => { const on = () => setShow(window.scrollY > window.innerHeight * 0.9); window.addEventListener('scroll', on, { passive: true }); return () => window.removeEventListener('scroll', on); }, []);
  return (
    <div className={cn('fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(12px+var(--safe-b))] transition-all duration-300 md:hidden', show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0')}>
      <KButton to="/app" size="lg" className="w-full">ورود به کایار <ArrowLeft className="h-5 w-5" /></KButton>
    </div>
  );
}

export function Landing() {
  const seo = useBlock('seo');
  useMeta(seo.title, seo.description);
  useReveal();
  return (
    <div className="min-h-svh">
      <SiteHeader />
      <main>
        <Hero />
        <Steps />
        <MorshedSection />
        <BodyyarSection />
        <LatestPosts />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <StickyCTA />
    </div>
  );
}

export function BlogList() {
  useMeta('وبلاگ', 'مطالب کایار درباره‌ی ورزش، تغذیه و موزیک.');
  const [tag, setTag] = useState('');
  const [page, setPage] = useState(1);
  const [all, setAll] = useState<PostCard[]>([]);
  const { d, err, retry } = usePosts({ tag: tag || undefined, page, pageSize: 9 });
  useEffect(() => { if (d) setAll((x: PostCard[]): PostCard[] => (page === 1 ? d.posts : [...x, ...d.posts.filter((p: PostCard) => !x.some((y: PostCard) => y.slug === p.slug))])); }, [d, page]);
  const choose = (t: string) => { setTag(t); setPage(1); setAll([]); };
  const [tags, setTags] = useState<string[]>([]);
  useEffect(() => { if (d?.tags.length && !tags.length) setTags(d.tags); }, [d, tags.length]);
  return (
    <div className="min-h-svh depth-bg">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-[calc(var(--header-h)+var(--safe-t)+48px)]">
        <h1 className="text-[clamp(2rem,6vw,3.5rem)] font-black">وبلاگ <span className="text-primary">کایار</span></h1>
        {tags.length > 0 && <div className="my-8 flex gap-2 overflow-x-auto pb-1" role="tablist">
          {['', ...tags].map((t) => <button key={t || 'all'} role="tab" aria-selected={tag === t} onClick={() => choose(t)} className={cn('press tap shrink-0 rounded-full px-5 text-[15px] font-bold transition-colors', tag === t ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground hover:text-foreground')}>{t || 'همه'}</button>)}
        </div>}
        <div className="mt-8">
          {err && !all.length ? <StateView icon={RefreshCw} title="مطالب بارگذاری نشد" text="اتصال را بررسی کن و دوباره تلاش کن." action={<KButton onClick={retry}>تلاش دوباره</KButton>} />
            : !d && !all.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton aspect-[4/3] rounded-[28px]" />)}</div>
            : !all.length ? <StateView icon={Newspaper} title="هنوز مطلبی منتشر نشده" text="به‌زودی مطالب تازه درباره‌ی تمرین، تغذیه و موزیک این‌جا می‌آید." />
            : <BlogCards list={all} />}
          {d && all.length < d.total && <div className="mt-8 text-center"><KButton variant="outline" onClick={() => setPage(page + 1)}>مطالب بیشتر</KButton></div>}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function BlogPost() {
  const { slug = '' } = useParams();
  const [p, setP] = useState<PublicPostsOutputType['post'] | undefined>(undefined);
  const [err, setErr] = useState(false); const [n, setN] = useState(0);
  useEffect(() => { let on = true; setErr(false); setP(undefined); publicPosts({ slug }).then((r) => on && setP(r.post)).catch(() => on && setErr(true)); return () => { on = false; }; }, [slug, n]);
  useMeta(p ? p.seoTitle || p.title : p === null ? 'مطلب پیدا نشد' : 'وبلاگ', p ? p.seoDescription || p.excerpt : '');
  return (
    <div className="min-h-svh depth-bg">
      <SiteHeader />
      <main className="mx-auto max-w-[720px] px-4 pb-20 pt-[calc(var(--header-h)+var(--safe-t)+40px)]">
        <Link to="/blog" className="tap inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><ArrowRight className="h-4 w-4" />وبلاگ</Link>
        {err ? <StateView icon={RefreshCw} title="مطلب بارگذاری نشد" action={<KButton onClick={() => setN((x) => x + 1)}>تلاش دوباره</KButton>} />
          : p === undefined ? <div className="mt-8 space-y-4"><div className="skeleton h-10 w-3/4 rounded-2xl" /><div className="skeleton aspect-video rounded-3xl" /><div className="skeleton h-40 rounded-2xl" /></div>
          : p === null ? <StateView icon={FileQuestion} title="این مطلب پیدا نشد" action={<KButton to="/blog">برگشت به وبلاگ</KButton>} /> : (
          <article>
            {p.tags.length > 0 && <div className="mt-6 flex flex-wrap gap-2 text-sm">{p.tags.map((t) => <span key={t} className="rounded-full bg-primary/15 px-3 py-1 font-bold text-primary">{t}</span>)}</div>}
            <h1 className="mt-4 text-[clamp(1.9rem,5vw,3rem)] font-black">{p.title}</h1>
            <div className="mt-3 text-sm text-muted-foreground">{faDate(p.publishedAt)}</div>
            {p.coverUrl && <img src={p.coverUrl} alt={p.coverAlt || p.title} className="mt-6 aspect-video w-full rounded-[28px] object-cover" />}
            <Markdown className="prose-invert mt-8 text-[18px] leading-[2] prose-headings:font-extrabold prose-a:text-primary">{p.body}</Markdown>
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
}

const pages: Record<string, { t: string; body: string }> = {
  about: { t: 'درباره‌ی کایار', body: 'کایار همراه ورزشی و سلامت برند کاپوش است که با هر خرید لباس، یک همراه هوشمند در اختیار ورزشکار می‌گذارد.' },
  terms: { t: 'قوانین استفاده', body: 'متن کامل قوانین در فاز ۱ از بخش محتوای سایت در پنل ادمین منتشر می‌شود.' },
  privacy: { t: 'حریم خصوصی', body: 'متن کامل سیاست حریم خصوصی در فاز ۱ از بخش محتوای سایت در پنل ادمین منتشر می‌شود. کایار از ردیاب‌های تبلیغاتی خارجی استفاده نمی‌کند.' },
};
export function StaticPage() {
  const { slug = '' } = useParams();
  const p = pages[slug];
  useMeta(p?.t ?? 'صفحه پیدا نشد', p?.body ?? '');
  return (
    <div className="min-h-svh depth-bg">
      <SiteHeader />
      <main className="mx-auto max-w-[720px] px-4 pb-20 pt-[calc(var(--header-h)+var(--safe-t)+48px)]">
        {p ? <><h1 className="text-[clamp(2rem,5vw,3rem)] font-black">{p.t}</h1><p className="mt-6 text-[18px] leading-[2] text-muted-foreground">{p.body}</p></> : <StateView icon={FileQuestion} title="صفحه پیدا نشد" action={<KButton to="/">صفحه‌ی اصلی</KButton>} />}
      </main>
      <Footer />
    </div>
  );
}
