import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { morshedTracks, appNotifications, type MorshedTracksOutputType, type AppNotificationsOutputType } from '@/zite/api';
import { Headphones, Sparkles, ArrowLeft, Play, Pause, Dumbbell, Salad, Flame, Timer, Trophy, Droplets, Megaphone, ExternalLink } from 'lucide-react';
import { cn } from '@/ui/lib/utils';
import { Skeleton } from '@/ui/ui/skeleton';
import { Glass, Cover, Waveform } from '../kit';
import { ShopSection } from '../site/Sections';

import { usePreview } from '../../lib/preview';
import { useSession, errMsg } from '../../lib/session';
import { fa } from '../../lib/config';

export const H = ({ t, s }: { t: string; s?: React.ReactNode }) => <div className="mb-3 mt-9 flex items-end justify-between"><h2 className="text-lg font-black tracking-tight">{t}</h2>{s}</div>;
const up = (i: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.06, duration: 0.45, ease: 'easeOut' as const } });

type MorshedData = MorshedTracksOutputType;
/** Loads Morshed data (library / home / live Jamendo) with a short per-session cache. */
const cache = new Map<string, MorshedData>();
export function useMorshed(mode: 'library' | 'home' | 'jamendo', q?: string, cat?: string) {
  const { token } = useSession('app');
  const key = `${mode}|${cat ?? ''}|${q ?? ''}`;
  const [data, setData] = useState<MorshedData | null>(cache.get(key) ?? null);
  const [err, setErr] = useState<string>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!token) return;
    if (cache.has(key)) { setData(cache.get(key)!); setErr(undefined); return; }
    let on = true; setData(null); setErr(undefined);
    morshedTracks({ token, mode, q, cat }).then((r) => { cache.set(key, r); on && setData(r); }).catch((e) => on && setErr(errMsg(e)));
    return () => { on = false; };
  }, [key, n, token]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, list: data?.tracks ?? null, err, retry: () => { cache.delete(key); setN((x) => x + 1); } };
}

function HomeAnnouncement() {
  const { token } = useSession('app');
  const [item, setItem] = useState<AppNotificationsOutputType['items'][0] | null>(null);
  useEffect(() => { if (token) appNotifications({ token }).then((r) => setItem(r.items[0] ?? null)).catch(() => {}); }, [token]);
  if (!item) return null;
  const inner = <><Megaphone className="h-5 w-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{item.title}</div>{item.body && <div className="line-clamp-1 text-xs text-muted-foreground">{item.body}</div>}</div>{item.link && <span className="flex items-center gap-1 text-xs font-bold text-primary">{item.external ? <>باز کردن<ExternalLink className="h-3.5 w-3.5" /></> : <>مشاهده<ArrowLeft className="h-3.5 w-3.5" /></>}</span>}</>;
  const cls = 'mt-2 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-start';
  if (!item.link) return <Link to="/app/notifications" className={cls}>{inner}</Link>;
  return item.external ? <a href={item.link} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a> : <Link to={item.link} className={cls}>{inner}</Link>;
}

function greet() { const h = new Date().getHours(); return h < 5 ? 'شب بخیر' : h < 11 ? 'صبح بخیر' : h < 15 ? 'ظهر بخیر' : h < 19 ? 'عصر بخیر' : 'شب بخیر'; }
function subline() { const h = new Date().getHours(); return h < 5 || h >= 21 ? 'یه کشش سبک قبل خواب، بدنت ازت ممنون میشه.' : h < 11 ? 'روزت رو با یه تمرین پرانرژی شروع کن.' : h < 19 ? 'امروز بدنت رو به حرکت دربیار.' : 'هنوز وقت هست؛ یه تمرین کوتاه بزن.'; }

export function AppHome() {
  const { member } = useSession('app');
  const { play, track, playing, toggle, setFullPlayer } = usePreview();
  const nav = useNavigate();
  const { data, list } = useMorshed('home');
  const first = member?.displayName?.split(' ')[0] ?? '';
  const stats = [{ i: Flame, v: fa(0), l: 'روز پیاپی', c: 'text-[hsl(24_100%_60%)]' }, { i: Timer, v: fa(0), l: 'دقیقه تمرین', c: 'text-primary' }, { i: Trophy, v: fa(0), l: 'تمرین کامل', c: 'text-gold' }];
  return (
    <div className="pb-6">
      <motion.div {...up(0)} className="flex items-end justify-between gap-3 pt-1">
        <div className="min-w-0">
          <p className="text-xs font-bold text-muted-foreground">{new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
          <h1 className="mt-1 truncate text-2xl font-black tracking-tight">{greet()}{first && <>، <span className="text-primary">{first}</span></>}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{subline()}</p>
        </div>
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary mb-2" />
      </motion.div>

      <HomeAnnouncement />
      <motion.button {...up(1)} onClick={() => { if (track) { setFullPlayer(true); return; } if (list?.length) { play(list[0], list); setFullPlayer(true); } else nav('/app/morshed'); }}
        className="press group relative mt-6 block w-full overflow-hidden rounded-[32px] bg-[radial-gradient(120%_120%_at_0%_0%,hsl(254_90%_62%),hsl(254_70%_28%)_55%,hsl(240_30%_10%))] p-6 text-start text-white shadow-[0_24px_60px_-20px_hsl(254_100%_50%/.6)]">
        <div className="pointer-events-none absolute -end-10 -top-10 h-56 w-56 rounded-full border-[28px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-16 end-10 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur"><Headphones className="h-3.5 w-3.5" />مرشد</span>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div className="min-w-0"><div className="text-2xl font-black">{track ? track.title : 'شروع ورزش با موزیک'}</div><div className="mt-1 truncate text-sm text-white/70">{track ? track.artist : list?.length ? 'پلی‌لیست امروز آماده‌ست' : 'برو به مرشد'}</div>
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

      {(data?.collections.length ? data.collections : list?.length ? [{ id: 'featured', title: 'پیشنهاد مرشد', tracks: list }] : []).map((c) => (
        <div key={c.id}>
          <H t={c.title} s={<button onClick={() => nav('/app/morshed')} className="flex items-center gap-1 text-sm font-bold text-primary">همه <ArrowLeft className="h-4 w-4" /></button>} />
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {c.tracks.slice(0, 12).map((t) => (
              <button key={t.id} onClick={() => play(t, c.tracks)} className="press w-36 shrink-0 snap-start text-start"><Cover hue={t.hue} image={t.image} className="aspect-square w-full shadow-lg"><span className="absolute bottom-2 end-2 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-black"><Play className="h-4 w-4 fill-current" /></span></Cover><div className="mt-2 truncate text-sm font-bold">{t.title}</div><div className="truncate text-xs text-muted-foreground">{t.artist}</div></button>
            ))}
          </div>
        </div>
      ))}
      {!data && <div className="-mx-4 mt-9 flex gap-3 overflow-hidden px-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square w-36 shrink-0 rounded-2xl" />)}</div>}
      <H t="پیشنهاد کاپوش" />
      <ShopSection compact />
    </div>
  );
}

