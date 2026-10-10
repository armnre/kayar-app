import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { morshedPodcasts, type MorshedPodcastsOutputType } from 'zitejs/api';
import { ArrowRight, Search, RefreshCw, Play, Pause, Mic2, X } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import { Skeleton } from '@project/components/ui/skeleton';
import { StateView, Waveform } from '../kit';
import { H } from './HomeMorshed';
import { usePreview } from '../../lib/preview';
import { errMsg } from '../../lib/session';
import { fa } from '../../lib/config';

type Show = MorshedPodcastsOutputType['shows'][0];
type Ep = MorshedPodcastsOutputType['episodes'][0];
const topics = [['تناسب اندام', 'fitness workout'], ['تغذیه', 'nutrition health'], ['دویدن', 'running'], ['ذهن ورزشکار', 'sports psychology mindset'], ['بدنسازی', 'bodybuilding strength']];
const cache = new Map<string, MorshedPodcastsOutputType>();
const mins = (s: number) => (s ? `${fa(Math.round(s / 60))} دقیقه` : '');

function useData(key: string, args: { q?: string; feed?: string }) {
  const [d, setD] = useState(cache.get(key) ?? null); const [err, setErr] = useState<string>(); const [n, setN] = useState(0);
  useEffect(() => {
    if (cache.has(key)) { setD(cache.get(key)!); return; }
    let on = true; setD(null); setErr(undefined);
    morshedPodcasts(args).then((r) => { cache.set(key, r); on && setD(r); }).catch((e) => on && setErr(errMsg(e)));
    return () => { on = false; };
  }, [key, n]); // eslint-disable-line react-hooks/exhaustive-deps
  return { d, err, retry: () => { cache.delete(key); setN((x) => x + 1); } };
}

function Episodes({ show, back }: { show: Show; back: () => void }) {
  const { d, err, retry } = useData(`f:${show.feed}`, { feed: show.feed });
  const { play, toggle, track, playing } = usePreview();
  const eps = d?.episodes ?? [];
  return (
    <div className="mt-5">
      <button onClick={back} className="tap -ms-2 flex items-center gap-1 rounded-full px-2 text-sm font-bold text-muted-foreground"><ArrowRight className="h-4 w-4" />همه‌ی پادکست‌ها</button>
      <div className="mt-3 flex items-center gap-4">
        <img src={show.image} alt="" className="h-28 w-28 shrink-0 rounded-3xl object-cover shadow-2xl" />
        <div className="min-w-0"><h2 className="line-clamp-2 text-xl font-black">{show.title}</h2><p className="truncate text-sm text-muted-foreground">{show.author}</p>
          {eps[0] && <button onClick={() => play(eps[0], eps)} className="press mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-violet px-4 text-sm font-bold text-white"><Play className="h-4 w-4 fill-current" />پخش آخرین قسمت</button>}</div>
      </div>
      <H t="قسمت‌ها" s={d && <span className="text-xs text-muted-foreground">{fa(eps.length)} قسمت</span>} />
      {err ? <StateView icon={RefreshCw} tone="violet" title="قسمت‌ها بارگذاری نشد" text={err} action={<button onClick={retry} className="tap rounded-full bg-violet px-5 font-bold text-white">تلاش دوباره</button>} />
        : !d ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        : !eps.length ? <StateView icon={Mic2} tone="violet" title="قسمتی پیدا نشد" text="این پادکست فعلاً قسمت قابل پخشی نداره." />
        : <ul className="space-y-2">{eps.map((e: Ep, i) => { const a = track?.id === e.id; return (
          <motion.li key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
            <button onClick={() => (a ? toggle() : play(e, eps))} className={cn('press flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-start', a && 'border-violet/50 bg-violet/10')}>
              <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full', a ? 'bg-violet text-white' : 'bg-white/5')}>{a && playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}</span>
              <span className="min-w-0 flex-1"><span className="line-clamp-2 text-sm font-bold leading-6">{e.title}</span><span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">{mins(e.duration)}{a && playing && <Waveform bars={4} playing className="h-3" color="bg-violet" />}</span></span>
            </button>
          </motion.li>); })}</ul>}
    </div>
  );
}

export function Podcasts() {
  const [topic, setTopic] = useState(topics[0][1]);
  const [q, setQ] = useState(''); const [dq, setDq] = useState('');
  const [show, setShow] = useState<Show | null>(null);
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 500); return () => clearTimeout(t); }, [q]);
  const term = dq || topic;
  const { d, err, retry } = useData(`q:${term}`, { q: term });
  if (show) return <Episodes show={show} back={() => setShow(null)} />;
  return (
    <>
      <div className="relative mt-5"><Search className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجوی پادکست…" aria-label="جست‌وجوی پادکست" className="h-12 w-full rounded-2xl border border-border bg-card pe-11 ps-12 text-base outline-none transition focus:border-violet" />
        {q && <button onClick={() => setQ('')} className="absolute end-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground" aria-label="پاک کردن"><X className="h-4 w-4" /></button>}
      </div>
      {!dq && <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">{topics.map(([l, v]) => <button key={v} onClick={() => setTopic(v)} className={cn('tap shrink-0 rounded-full px-4 text-sm font-bold transition', topic === v ? 'bg-foreground text-background' : 'bg-card text-muted-foreground')}>{l}</button>)}</div>}
      <H t={dq ? `نتایج «${dq}»` : 'پادکست‌های پیشنهادی'} />
      {err ? <StateView icon={RefreshCw} tone="violet" title="پادکست‌ها بارگذاری نشد" text={err} action={<button onClick={retry} className="tap rounded-full bg-violet px-5 font-bold text-white">تلاش دوباره</button>} />
        : !d ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />)}</div>
        : !d.shows.length ? <StateView icon={Mic2} tone="violet" title="پادکستی پیدا نشد" text="یه کلمه‌ی دیگه امتحان کن." />
        : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{d.shows.map((s, i) => (
          <motion.button key={s.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(i, 9) * 0.04 }} onClick={() => setShow(s)} className="press text-start">
            <img src={s.image} alt="" loading="lazy" className="aspect-square w-full rounded-2xl object-cover shadow-lg ring-1 ring-white/10" />
            <div className="mt-2 line-clamp-2 text-sm font-bold leading-6">{s.title}</div><div className="truncate text-xs text-muted-foreground">{s.author}</div>
          </motion.button>))}</div>}
      <p className="mt-6 text-center text-xs text-muted-foreground">پادکست‌ها از دایرکتوری عمومی پادکست‌ها پخش می‌شن</p>
    </>
  );
}
