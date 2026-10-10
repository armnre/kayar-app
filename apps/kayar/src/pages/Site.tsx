import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import SiteHeader, { useMeta } from '../components/site/SiteHeader';
import Hero from '../components/site/Hero';
import { Steps, MorshedSection, BodyyarSection, BlogCards, FAQ, FinalCTA, Footer, SectionHead } from '../components/site/Sections';
import { useReveal, KButton, SampleBadge, StateView } from '../components/kit';
import { posts } from '../data/sample';
import { fa, faDate } from '../lib/config';
import { FileQuestion } from 'lucide-react';

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
  useMeta('همراه هوشمند ورزش و سلامت', 'کایار: موزیک مخصوص ورزش و برنامه‌ی تمرین و تغذیه‌ی هوشمند برای خریداران کاپوش.');
  useReveal();
  return (
    <div className="min-h-svh">
      <SiteHeader />
      <main>
        <Hero />
        <Steps />
        <MorshedSection />
        <BodyyarSection />
        <section className="px-4 py-20">
          <SectionHead eyebrow="BLOG" title="تازه‌ها از" accent="وبلاگ" />
          <div className="mx-auto max-w-6xl"><BlogCards /></div>
          <div className="mt-8 text-center"><KButton variant="outline" to="/blog">همه‌ی مطالب</KButton></div>
        </section>
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
  useReveal();
  const tags = ['همه', ...Array.from(new Set(posts.map((p) => p.tag)))];
  const [tag, setTag] = useState('همه');
  const list = tag === 'همه' ? posts : posts.filter((p) => p.tag === tag);
  return (
    <div className="min-h-svh depth-bg">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-[calc(var(--header-h)+var(--safe-t)+48px)]">
        <h1 className="text-[clamp(2rem,6vw,3.5rem)] font-black">وبلاگ <span className="text-primary">کایار</span></h1>
        <p className="mt-2 flex items-center gap-2 text-muted-foreground">مطالب فعلی نمونه هستند <SampleBadge /></p>
        <div className="my-8 flex gap-2 overflow-x-auto pb-1" role="tablist">
          {tags.map((t) => <button key={t} role="tab" aria-selected={tag === t} onClick={() => setTag(t)} className={cn('press tap shrink-0 rounded-full px-5 text-[15px] font-bold transition-colors', tag === t ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground hover:text-foreground')}>{t}</button>)}
        </div>
        <BlogCards list={list} />
      </main>
      <Footer />
    </div>
  );
}

export function BlogPost() {
  const { slug } = useParams();
  const p = posts.find((x) => x.slug === slug);
  useMeta(p?.title ?? 'مطلب پیدا نشد', p?.excerpt ?? '');
  return (
    <div className="min-h-svh depth-bg">
      <SiteHeader />
      <main className="mx-auto max-w-[720px] px-4 pb-20 pt-[calc(var(--header-h)+var(--safe-t)+40px)]">
        <Link to="/blog" className="tap inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><ArrowRight className="h-4 w-4" />وبلاگ</Link>
        {!p ? <StateView icon={FileQuestion} title="این مطلب پیدا نشد" action={<KButton to="/blog">برگشت به وبلاگ</KButton>} /> : (
          <article>
            <div className="mt-6 flex items-center gap-2 text-sm"><span className="rounded-full bg-primary/15 px-3 py-1 font-bold text-primary">{p.tag}</span><SampleBadge /></div>
            <h1 className="mt-4 text-[clamp(1.9rem,5vw,3rem)] font-black">{p.title}</h1>
            <div className="mt-3 text-sm text-muted-foreground">{faDate(p.date)} · {fa(p.read)} دقیقه مطالعه</div>
            <div className="prose prose-invert mt-8 max-w-none text-[18px] leading-[2] prose-headings:font-extrabold prose-a:text-primary">
              <p>{p.excerpt}</p>
              <h2>چرا این موضوع مهم است؟</h2>
              <p>این متن نمونه است و در فاز ۱ از ویرایشگر مطلب در پنل ادمین جایگزین می‌شود. ساختار تایپوگرافی، فاصله‌گذاری و خوانایی این صفحه برای مطالب واقعی آماده است.</p>
              <blockquote>پیشرفت پایدار از قدم‌های کوچک و منظم می‌آید.</blockquote>
              <ul><li>ساده شروع کن</li><li>منظم ادامه بده</li><li>به بدنت گوش کن</li></ul>
            </div>
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
