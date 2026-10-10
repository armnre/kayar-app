import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Heart, SearchX, RefreshCw, Music2, Mic2, Play, Pause, Zap, Dumbbell, HeartPulse, Leaf, Brain, X } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import { Skeleton } from '@project/components/ui/skeleton';
import { Cover, Waveform, StateView } from '../kit';
import { fmt } from './AppShell';
import { H, useTracks } from './HomeMorshed';
import { Podcasts } from './Podcasts';
import { usePreview } from '../../lib/preview';
import { categories, type Track } from '../../data/sample';
import { fa } from '../../lib/config';

const catMeta: Record<string, { i: typeof Zap; g: string }> = {
  'شروع قدرتی': { i: Dumbbell, g: 'from-[hsl(14_90%_55%)] to-[hsl(340_80%_40%)]' },
  'کاردیو': { i: HeartPulse, g: 'from-[hsl(330_85%_58%)] to-[hsl(280_70%_40%)]' },
  'ریکاوری': { i: Leaf, g: 'from-[hsl(160_70%_45%)] to-[hsl(200_70%_30%)]' },
  'تمرکز': { i: Brain, g: 'from-[hsl(210_90%_60%)] to-[hsl(250_70%_40%)]' },
  'انرژی': { i: Zap, g: 'from-[hsl(71_100%_50%)] to-[hsl(140_70%_32%)]' },
};

export function TrackRow({ t, i, list }: { t: Track; i: number; list: Track[] }) {
  const { play, toggle, track, playing, favs, toggleFav } = usePreview();
  const active = track?.id === t.id;
  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
      className={cn('group flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-white/[.04]', active && 'bg-violet/10 ring-1 ring-violet/30')}>
      <button onClick={() => (active ? toggle() : play(t, list))} className="flex min-w-0 flex-1 items-center gap-3 text-start" aria-label={`پخش ${t.title}`}>
        <Cover hue={t.hue} image={t.image} className="relative h-14 w-14 shrink-0 rounded-xl">
          <span className={cn('absolute inset-0 grid place-items-center rounded-xl bg-black/45 transition-opacity', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
            {active && playing ? <Waveform bars={3} playing className="h-4" color="bg-white" /> : <Play className="h-5 w-5 fill-white text-white" />}
          </span>
        </Cover>
        <span className="min-w-0"><span className={cn('block truncate font-bold', active && 'text-[hsl(254_100%_80%)]')}>{t.title}</span><span className="block truncate text-sm text-muted-foreground">{t.artist}</span></span>
      </button>
      <span className="hidden text-xs tabular-nums text-muted-foreground sm:block" dir="ltr">{t.duration ? fmt(t.duration) : ''}</span>
      <button className="tap grid place-items-center rounded-full" onClick={() => toggleFav(t.id)} aria-label="علاقه‌مندی" aria-pressed={favs.has(t.id)}><Heart className={cn('h-5 w-5 transition', favs.has(t.id) ? 'scale-110 fill-violet text-violet' : 'text-muted-foreground')} /></button>
    </motion.li>
  );
}

function Featured({ list }: { list: Track[] }) {
  const { play, track, playing, toggle } = usePreview();
  return (
    <div className="-mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
      {list.slice(0, 5).map((t, i) => { const active = track?.id === t.id; return (
        <motion.div key={t.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
          className="relative h-64 w-[82%] shrink-0 snap-center overflow-hidden rounded-[30px] sm:w-[60%]">
          <Cover hue={t.hue} image={t.image} className="absolute inset-0 h-full w-full rounded-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <span className="absolute start-4 top-4 rounded-full bg-black/40 px-3 py-1 text-[11px] font-black text-white backdrop-blur">{i === 0 ? '🔥 داغ‌ترین' : `#${fa(i + 1)} این ماه`}</span>
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
            <div className="min-w-0 flex-1 text-white"><div className="truncate text-xl font-black">{t.title}</div><div className="truncate text-sm text-white/70">{t.artist}</div>
              {active && <Waveform bars={18} playing={playing} className="mt-2 h-4" color="bg-primary" />}</div>
            <button onClick={() => (active ? toggle() : play(t, list))} className="press grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_30px_hsl(var(--primary)/.5)]" aria-label="پخش">{active && playing ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}</button>
          </div>
        </motion.div>); })}
    </div>
  );
}

function Music() {
  const { favs } = usePreview();
  const [cat, setCat] = useState('انرژی');
  const [q, setQ] = useState(''); const [dq, setDq] = useState('');
  const [onlyFav, setOnlyFav] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDq(q), 450); return () => clearTimeout(t); }, [q]);
  const { list, err, retry } = useTracks(dq ? undefined : cat, dq || undefined);
  const shown = useMemo(() => (list ?? []).filter((t) => !onlyFav || favs.has(t.id)), [list, onlyFav, favs]);
  return (
    <>
      <div className="relative mt-5"><Search className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="آهنگ یا هنرمند…" aria-label="جست‌وجو" className="h-12 w-full rounded-2xl border border-border bg-card pe-11 ps-12 text-base outline-none transition focus:border-violet" />
        {q && <button onClick={() => setQ('')} className="absolute end-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground" aria-label="پاک کردن"><X className="h-4 w-4" /></button>}
      </div>
      {!dq && <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {categories.map((c) => { const m = catMeta[c]; const on = cat === c; return (
          <button key={c} onClick={() => setCat(c)} className={cn('press relative flex h-11 shrink-0 items-center gap-2 overflow-hidden rounded-full ps-1.5 pe-4 text-sm font-black transition', on ? 'bg-foreground text-background' : 'border border-border bg-card text-muted-foreground')}>
            <span className={cn('grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br text-white', m.g)}><m.i className="h-4 w-4" /></span>{c}
          </button>); })}
      </div>}
      {!dq && !onlyFav && (list ? list.length > 0 && <Featured list={list} /> : <div className="-mx-4 mt-5 flex gap-3 overflow-hidden px-4">{[0, 1].map((i) => <Skeleton key={i} className="h-64 w-[82%] shrink-0 rounded-[30px]" />)}</div>)}
      <H t={dq ? `نتایج «${dq}»` : onlyFav ? 'علاقه‌مندی‌ها' : `بیشتر از ${cat}`} s={<button onClick={() => setOnlyFav((v) => !v)} className={cn('tap flex items-center gap-1.5 rounded-full px-3 text-xs font-bold transition', onlyFav ? 'bg-violet text-white' : 'bg-card text-muted-foreground')}><Heart className="h-3.5 w-3.5" />{fa(favs.size)}</button>} />
      {err ? <StateView icon={RefreshCw} tone="violet" title="موزیک‌ها بارگذاری نشد" text={err} action={<button onClick={retry} className="tap rounded-full bg-violet px-5 font-bold text-white">تلاش دوباره</button>} />
        : !list ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[72px] rounded-2xl" />)}</div>
        : shown.length ? <ul className="space-y-1">{(dq || onlyFav ? shown : shown.slice(5)).map((t, i) => <TrackRow key={t.id} t={t} i={i} list={shown} />)}</ul>
        : <StateView icon={SearchX} tone="violet" title={onlyFav ? 'هنوز علاقه‌مندی نداری' : 'چیزی پیدا نشد'} text={onlyFav ? 'روی قلب کنار هر آهنگ بزن تا اینجا ذخیره بشه.' : 'یه کلمه‌ی دیگه امتحان کن.'} />}
      <p className="mt-6 text-center text-xs text-muted-foreground">آهنگ‌ها از Jamendo با مجوز Creative Commons</p>
    </>
  );
}

export function Morshed() {
  const [tab, setTab] = useState<'music' | 'podcast'>('music');
  const tabs = [{ k: 'music' as const, l: 'موزیک', i: Music2 }, { k: 'podcast' as const, l: 'پادکست', i: Mic2 }];
  return (
    <div className="pb-6">
      <div className="flex items-end justify-between gap-3">
        <div><p className="text-sm font-bold text-[hsl(254_100%_78%)]">مرشد</p><h1 className="text-[clamp(1.8rem,7vw,2.5rem)] font-black leading-tight">ریتم تمرینت</h1></div>
      </div>
      <div className="relative mt-5 grid grid-cols-2 rounded-2xl border border-border bg-card p-1" role="tablist">
        {tabs.map((t) => (
          <button key={t.k} role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)} className={cn('relative z-10 flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-black transition-colors', tab === t.k ? 'text-white' : 'text-muted-foreground')}>
            {tab === t.k && <motion.span layoutId="mtab" className="absolute inset-0 -z-10 rounded-xl bg-violet shadow-[0_8px_24px_-8px_hsl(254_100%_62%/.8)]" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            <t.i className="h-4 w-4" />{t.l}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }}>
          {tab === 'music' ? <Music /> : <Podcasts />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
