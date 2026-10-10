import { useEffect } from 'react';
import { NavLink, Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Headphones, Sparkles, User, Play, Pause, SkipForward, SkipBack, ChevronDown, Timer, Heart, Bell, X } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import { KayarLogo, Cover, Waveform, SampleBadge } from '../kit';
import { usePreview } from '../../lib/preview';
import { useSession } from '../../lib/session';
import { fa } from '../../lib/config';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@project/components/ui/dropdown-menu';
import { toast } from 'sonner';

const nav = [
  { to: '/app', label: 'خانه', icon: Home, end: true },
  { to: '/app/morshed', label: 'مرشد', icon: Headphones },
  { to: '/app/bodyyar', label: 'بدن‌یار', icon: Sparkles, center: true },
  { to: '/app/profile', label: 'پروفایل', icon: User },
];
export const fmt = (s: number) => `${fa(Math.floor(s / 60))}:${fa(String(Math.floor(s % 60)).padStart(2, '0'))}`;

export function PreviewBanner() {
  return <div className="pt-safe sticky top-0 z-50 bg-gold text-center text-xs font-bold leading-7 text-primary-foreground">پخش‌کننده‌ی مرشد هنوز با آهنگ‌های نمونه کار می‌کند</div>;
}

function useTicker() {
  const { playing, track, progress, setProgress, next, real } = usePreview();
  useEffect(() => {
    if (!playing || !track || real) return;
    const t = setInterval(() => { if (progress + 1 >= track.duration) next(); else setProgress(progress + 1); }, 1000);
    return () => clearInterval(t);
  }, [playing, track, progress, setProgress, next, real]);
}

function MiniPlayer() {
  const { track, playing, toggle, next, stop, progress, setFullPlayer } = usePreview();
  if (!track) return null;
  return (
    <div className="relative mx-3 flex items-center gap-2 overflow-hidden rounded-2xl border border-border bg-card p-2 pe-1 shadow-lg lg:mx-0">
      <button className="flex min-w-0 flex-1 items-center gap-3 text-start" onClick={() => setFullPlayer(true)} aria-label="باز کردن پلیر">
        <Cover hue={track.hue} image={track.image} className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0"><div className="truncate text-sm font-bold">{track.title}</div><div className="truncate text-xs text-muted-foreground">{track.artist}</div></div>
      </button>
      <button className="tap grid place-items-center rounded-full" onClick={toggle} aria-label={playing ? 'توقف' : 'پخش'}>{playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}</button>
      <button className="tap grid place-items-center rounded-full" onClick={() => next()} aria-label="بعدی"><SkipForward className="h-5 w-5 -scale-x-100 fill-current" /></button>
      <button className="tap grid place-items-center rounded-full text-muted-foreground hover:text-foreground" onClick={stop} aria-label="بستن پلیر"><X className="h-5 w-5" /></button>
      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10"><span className="block h-full bg-violet" style={{ width: `${(progress / track.duration) * 100}%` }} /></span>
    </div>
  );
}

function FullPlayer() {
  const { track, playing, toggle, next, progress, setProgress, fullPlayer, setFullPlayer, favs, toggleFav } = usePreview();
  return (
    <AnimatePresence>
      {fullPlayer && track && (
        <motion.div role="dialog" aria-modal aria-label="پلیر" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-background px-6 pb-[calc(24px+var(--safe-b))] pt-[calc(12px+var(--safe-t))]">
          <div className="absolute inset-0 -z-10 opacity-60" style={{ background: `radial-gradient(80% 50% at 50% 20%, hsl(${track.hue} 80% 45% / .5), transparent)` }} />
          <div className="mx-auto flex w-full max-w-md items-center justify-between">
            <button className="tap grid place-items-center rounded-full hover:bg-white/5" onClick={() => setFullPlayer(false)} aria-label="بستن پلیر"><ChevronDown className="h-7 w-7" /></button>
            <span className="text-sm text-muted-foreground">در حال پخش</span><SampleBadge />
          </div>
          <div className="mx-auto mt-6 flex w-full max-w-md flex-1 flex-col justify-center">
            <Cover hue={track.hue} image={track.image} className="aspect-square w-full rounded-[32px] shadow-xl" />
            <div className="mt-6 flex items-center gap-3">
              <div className="min-w-0 flex-1"><h2 className="truncate text-2xl font-black">{track.title}</h2><p className="truncate text-muted-foreground">{track.artist} · مجوز {track.license}</p></div>
              <button className="tap grid place-items-center rounded-full" onClick={() => toggleFav(track.id)} aria-label="علاقه‌مندی" aria-pressed={favs.has(track.id)}><Heart className={cn('h-6 w-6', favs.has(track.id) && 'fill-violet text-violet')} /></button>
            </div>
            <Waveform bars={44} playing={playing} className="mt-5 h-10 w-full justify-between" color="bg-[hsl(254_100%_75%)]" />
            <input type="range" min={0} max={track.duration} value={progress} onChange={(e) => setProgress(Number(e.target.value))} aria-label="پیشرفت" className="mt-3 h-11 w-full cursor-pointer accent-[hsl(254_100%_62%)]" />
            <div className="flex justify-between text-xs text-muted-foreground" dir="ltr"><span>{fmt(progress)}</span><span>{fmt(track.duration)}</span></div>
            <div className="mt-4 flex items-center justify-between">
              <DropdownMenu><DropdownMenuTrigger className="tap grid place-items-center rounded-full text-muted-foreground" aria-label="تایمر خواب"><Timer className="h-6 w-6" /></DropdownMenuTrigger>
                <DropdownMenuContent>{[15, 30, 45].map((m) => <DropdownMenuItem key={m} onClick={() => toast(`تایمر خواب: ${fa(m)} دقیقه (نمونه)`)}>{fa(m)} دقیقه</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
              <button className="tap grid h-14 w-14 place-items-center rounded-full" onClick={() => next(-1)} aria-label="قبلی"><SkipBack className="h-7 w-7 -scale-x-100 fill-current" /></button>
              <button className="press grid h-20 w-20 place-items-center rounded-full bg-violet text-white shadow-[0_0_32px_hsl(254_100%_62%/.5)]" onClick={toggle} aria-label={playing ? 'توقف' : 'پخش'}>{playing ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current" />}</button>
              <button className="tap grid h-14 w-14 place-items-center rounded-full" onClick={() => next()} aria-label="بعدی"><SkipForward className="h-7 w-7 -scale-x-100 fill-current" /></button>
              <span className="w-11" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AppShell() {
  const { member, loading } = useSession('app');
  const loc = useLocation();
  useTicker();
  if (loading) return <div className="grid min-h-svh place-items-center depth-bg"><KayarLogo className="animate-pulse text-xl" /></div>;
  if (!member) return <Navigate to={`/app/login?returnTo=${encodeURIComponent(loc.pathname)}`} replace />;
  if (member.mustChangePassword) return <Navigate to="/app/change-password" replace />;
  const activeIdx = nav.findIndex((n) => (n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to)));
  return (
    <div className="min-h-svh depth-bg">
      <PreviewBanner />
      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="sticky top-7 hidden h-[calc(100svh-28px)] flex-col border-e border-white/5 p-5 lg:flex">
          <KayarLogo className="mb-8 text-lg" />
          <nav className="space-y-1">{nav.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('tap flex items-center gap-3 rounded-2xl px-4 py-3 font-bold transition-colors', isActive ? 'bg-primary text-primary-foreground glow' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground')}><n.icon className="h-5 w-5" />{n.label}</NavLink>)}</nav>
          <div className="mt-auto"><MiniPlayer /></div>
        </aside>
        <div className="min-w-0">
          <header className="sticky top-7 z-30 flex h-[var(--header-h)] items-center justify-between border-b border-border bg-background px-4 lg:hidden">
            <KayarLogo className="text-base" />
            <Link to="/app/profile" className="tap grid place-items-center rounded-full" aria-label="اعلان‌ها"><Bell className="h-5 w-5" /></Link>
          </header>
          <main className="mx-auto max-w-3xl px-4 pb-[calc(var(--nav-h)+var(--safe-b)+88px)] pt-5 lg:pb-12">
            <AnimatePresence mode="wait"><motion.div key={loc.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}><Outlet /></motion.div></AnimatePresence>
          </main>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <div className="mb-2"><MiniPlayer /></div>
        <nav className="relative grid border-t border-border bg-background shadow-[0_-8px_24px_rgb(0_0_0/.35)] h-[calc(var(--nav-h)+var(--safe-b))] grid-cols-4 rounded-none border-x-0 border-b-0 pb-[var(--safe-b)]" aria-label="ناوبری اصلی">
          {activeIdx >= 0 && !nav[activeIdx].center && <span className="absolute top-0 h-0.5 w-1/4 rounded-full bg-primary glow transition-transform duration-300" style={{ insetInlineStart: 0, transform: `translateX(${-activeIdx * 100}%)` }} />}
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('flex flex-col items-center justify-center gap-0.5 text-xs font-bold', isActive ? 'text-primary' : 'text-muted-foreground')}>
              {n.center ? <span className="-mt-7 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground animate-pulse-glow"><n.icon className="h-6 w-6" /></span> : n.to === '/app/profile' ? <img src="https://images.fillout.com/888646/9une2mcrla/generated-images/1AYCmkbto97oCLAux2rFhL/img_y1IiOTgydEJdHU8s.jpg" alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-current" /> : <n.icon className="h-6 w-6" />}
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <FullPlayer />
    </div>
  );
}
