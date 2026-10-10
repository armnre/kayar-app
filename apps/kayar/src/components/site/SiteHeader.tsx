import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, ArrowLeft } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@project/components/ui/sheet';
import { cn } from '@project/components/lib/utils';
import { KayarLogo, KButton } from '../kit';

const links = [
  { href: '/#morshed', label: 'مرشد' },
  { href: '/#bodyyar', label: 'بدن‌یار' },
  { href: '/#shop', label: 'فروشگاه کاپوش' },
  { href: '/blog', label: 'وبلاگ' },
];

export function useMeta(title: string, description: string) {
  useEffect(() => {
    document.title = `${title} | کایار`;
    const set = (sel: string, attr: string, key: string, val: string) => {
      let m = document.head.querySelector<HTMLMetaElement>(sel);
      if (!m) { m = document.createElement('meta'); m.setAttribute(attr, key); document.head.appendChild(m); }
      m.content = val;
    };
    set('meta[name="description"]', 'name', 'description', description);
    set('meta[property="og:title"]', 'property', 'og:title', title);
    set('meta[property="og:description"]', 'property', 'og:description', description);
    set('meta[property="og:image"]', 'property', 'og:image', '/assets/og/og.svg');
  }, [title, description]);
}

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className="pt-safe fixed inset-x-0 top-0 z-40">
      <div className={cn('mx-auto mt-2 flex h-14 max-w-6xl items-center justify-between gap-3 px-4 transition-all duration-300', scrolled && 'glass mx-3 rounded-full px-3 shadow-lg md:mx-auto')}>
        <Link to="/" aria-label="کایار، صفحه‌ی اصلی" className="tap flex items-center"><KayarLogo className="text-lg" /></Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="منوی اصلی">
          {links.map((l) => <a key={l.href} href={l.href} className="rounded-full px-4 py-2 text-[15px] text-muted-foreground transition-colors hover:text-foreground">{l.label}</a>)}
        </nav>
        <div className="flex items-center gap-1">
          <KButton to="/app" size="sm" className="hidden sm:inline-flex">ورود به کایار <ArrowLeft className="h-4 w-4" /></KButton>
          <button className="tap grid place-items-center rounded-full hover:bg-white/5 md:hidden" onClick={() => setOpen(true)} aria-label="باز کردن منو"><Menu className="h-6 w-6" /></button>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-[32px] border-white/10 bg-bg1 pb-[calc(24px+var(--safe-b))]" dir="rtl">
          <SheetTitle className="sr-only">منو</SheetTitle>
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/15" />
          <nav className="grid gap-1">
            {links.map((l) => <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="tap flex items-center rounded-2xl px-4 text-lg font-bold hover:bg-white/5">{l.label}</a>)}
          </nav>
          <KButton to="/app" size="lg" className="mt-4 w-full">ورود به کایار</KButton>
        </SheetContent>
      </Sheet>
    </header>
  );
}
