import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { morshedTracks } from 'zitejs/api';
import { Headphones, Sparkles, ArrowLeft, Play, Pause, Dumbbell, Salad, Flame, Timer, Trophy, Droplets } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import { Skeleton } from '@project/components/ui/skeleton';
import { Glass, Cover, Waveform } from '../kit';
import { ShopSection } from '../site/Sections';

import { usePreview } from '../../lib/preview';
import { useSession, errMsg } from '../../lib/session';
import { type Track } from '../../data/sample';
import { fa } from '../../lib/config';

export const H = ({ t, s }: { t: string; s?: React.ReactNode }) => <div className="mb-3 mt-9 flex items-end justify-between"><h2 className="text-lg font-black tracking-tight">{t}</h2>{s}</div>;
const up = (i: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.06, duration: 0.45, ease: 'easeOut' as const } });

/** Loads live Jamendo tracks for a category (cached per session). */
const cache = new Map<string, Track[]>();
export function useTracks(cat?: string, q?: string) {
  const key = `${cat ?? ''}|${q ?? ''}`;
  const [list, setList] = useState<Track[] | null>(cache.get(key) ?? null);
  const [err, setErr] = useState<string>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (cache.has(key)) { setList(cache.get(key)!); return; }
    let on = true; setList(null); setErr(undefined);
    morshedTracks({ cat, q, limit: 24 }).then((r) => { cache.set(key, r.tracks); on && setList(r.tracks); }).catch((e) => on && setErr(errMsg(e)));
    return () => { on = false; };
  }, [key, n]); // eslint-disable-line react-hooks/exhaustive-deps
  return { list, err, retry: () => { cache.delete(key); setN((x) => x + 1); } };
}

function greet() { const h = new Date().getHours(); return h < 5 ? 'شب بخیر' : h < 12 ? 'صبح بخیر' : h < 17 ? 'ظهر بخیر' : 'عصر بخیر'; }

export function AppHome() {
  const { member } = useSession('app');
  const { play, track, playing, toggle, setFullPlayer } = usePreview();
  const nav = useNavigate();
  const { list } = useTracks('انرژی');
  const first = member?.displayName?.split(' ')[0] ?? '';
  const stats = [{ i: Flame, v: fa(0), l: 'روز پیاپی', c: 'text-[hsl(24_100%_60%)]' }, { i: Timer, v: fa(0), l: 'دقیقه تمرین', c: 'text-primary' }, { i: Trophy, v: fa(0), l: 'تمرین کامل', c: 'text-gold' }];
  return (
    <div className="pb-6">
      <motion.div {...up(0)} className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />{new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
        </span>
        <p className="mt-4 text-base font-bold text-muted-foreground">{greet()}{first && <>، <span className="text-foreground">{first}</span></>}</p>
        <h1 className="mt-1 text-[clamp(2rem,8vw,2.9rem)] font-black leading-[1.15] tracking-tight">
          آماده‌ی <span className="relative inline-block text-primary">یه تمرین خوب<svg viewBox="0 0 200 12" className="absolute -bottom-2 start-0 h-3 w-full text-primary/60" preserveAspectRatio="none"><path d="M2 9 Q 50 2 100 7 T 198 5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></span>؟
        </h1>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">هر قدم کوچیک امروز، نتیجه‌ی بزرگ فرداست. بزن بریم 💪</p>
      </motion.div>

      <motion.button {...up(1)} onClick={() => { if (track) { setFullPlayer(true); return; } if (list?.length) { play(list[0], list); setFullPlayer(true); } else nav('/app/morshed'); }}
        className="press group relative mt-6 block w-full overflow-hidden rounded-[32px] bg-[radial-gradient(120%_120%_at_0%_0%,hsl(254_90%_62%),hsl(254_70%_28%)_55%,hsl(240_30%_10%))] p-6 text-start text-white shadow-[0_24px_60px_-20px_hsl(254_100%_50%/.6)]">
        <div className="pointer-events-none absolute -end-10 -top-10 h-56 w-56 rounded-full border-[28px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-16 end-10 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur"><Headphones className="h-3.5 w-3.5" />مرشد</span>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div className="min-w-0"><div className="text-2xl font-black">{track ? track.title : 'شروع ورزش با موزیک'}</div><div className="mt-1 truncate text-sm text-white/70">{track ? track.artist : 'پلی‌لیست پرانرژی امروز آماده‌ست'}</div>
            <Waveform bars={22} playing={playing} className="mt-4 h-6" color="bg-white/80" /></div>
          <span onClick={(e) => { if (track) { e.stopPropagation(); toggle(); } }} className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white text-[hsl(254_70%_35%)] shadow-xl transition-transform group-hover:scale-105">{track && playing ? <Pause className="h-7 w-7 fill-current" /> : <Play className="h-7 w-7 translate-x-[-2px] fill-current" />}</span>
        </div>
      </motion.button>

      <motion.div {...up(2)} className="mt-4 grid grid-cols-3 gap-3">
        {stats.map((s) => <Glass key={s.l} className="p-3.5 text-center"><s.i className={cn('mx-auto h-5 w-5', s.c)} /><div className="mt-1.5 text-xl font-black">{s.v}</div><div className="text-[11px] text-muted-foreground">{s.l}</div></Glass>)}
      </motion.div>

      <H t="برای امروز" />
      <motion.div {...up(3)} className="grid grid-cols-2 gap-3">
        {[{ i: Dumbbell, t: 'برنامه‌ی تمرین', d: 'شخصی برای هدفت', bg: 'bg-primary text-primary-foreground' }, { i: Salad, t: 'رژیم غذایی', d: 'وعده‌های ساده و سالم', bg: 'glass' }].map((c) => (
          <button key={c.t} onClick={() => nav('/app/bodyyar')} className={cn('press relative min-h-[150px] overflow-hidden rounded-[28px] p-5 text-start', c.bg)}>
            <c.i className="absolute -bottom-5 -end-5 h-28 w-28 opacity-10" />
            <span className={cn('grid h-11 w-11 place-items-center rounded-2xl', c.bg.includes('glass') ? 'bg-primary/15 text-primary' : 'bg-black/10')}><c.i className="h-5 w-5" /></span>
            <div className="mt-6 font-black">{c.t}</div><div className="text-xs opacity-70">{c.d}</div>
          </button>
        ))}
      </motion.div>
      <motion.div {...up(4)}><Glass className="mt-3 flex items-center gap-3 p-4"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[hsl(200_90%_55%/.15)] text-[hsl(200_90%_65%)]"><Droplets className="h-5 w-5" /></span><div className="flex-1"><div className="text-sm font-bold">یادت نره آب بخوری</div><div className="text-xs text-muted-foreground">روزی ۸ لیوان، بدنت ازت ممنونه</div></div><Sparkles className="h-4 w-4 text-primary" /></Glass></motion.div>

      <H t="پرانرژی‌های این ماه" s={<button onClick={() => nav('/app/morshed')} className="flex items-center gap-1 text-sm font-bold text-primary">همه <ArrowLeft className="h-4 w-4" /></button>} />
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {!list ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square w-36 shrink-0 rounded-2xl" />) : list.slice(0, 10).map((t) => (
          <button key={t.id} onClick={() => play(t, list)} className="press w-36 shrink-0 snap-start text-start"><Cover hue={t.hue} image={t.image} className="aspect-square w-full shadow-lg"><span className="absolute bottom-2 end-2 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-black"><Play className="h-4 w-4 fill-current" /></span></Cover><div className="mt-2 truncate text-sm font-bold">{t.title}</div><div className="truncate text-xs text-muted-foreground">{t.artist}</div></button>
        ))}
      </div>
      <H t="پیشنهاد کاپوش" />
      <ShopSection compact />
    </div>
  );
}

