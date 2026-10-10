import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { authSessions, type AuthSessionsOutputType } from 'zitejs/api';
import { useSession, errMsg } from '../lib/session';
import { useNavigate } from 'react-router-dom';
import { Headphones, Sparkles, ArrowLeft, Play, Heart, Search, Megaphone, Dumbbell, Salad, LineChart, Check, Send, KeyRound, LogOut, Bell, ChevronLeft, Loader2, SearchX, Bot } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Switch } from '@project/components/ui/switch';
import { cn } from '@project/components/lib/utils';
import { KButton, Glass, IconBox, Cover, SampleBadge, ProgressRing, StateView, Waveform } from '../components/kit';
import { ShopSection } from '../components/site/Sections';
import { fmt } from '../components/app/AppShell';
import { usePreview } from '../lib/preview';
import { tracks, podcasts, categories } from '../data/sample';
import { fa } from '../lib/config';

const H = ({ t, s }: { t: string; s?: React.ReactNode }) => <div className="mb-3 mt-8 flex items-center justify-between"><h2 className="text-lg font-extrabold">{t}</h2>{s}</div>;

export function AppHome() {
  const { play, track, setFullPlayer } = usePreview();
  const { member } = useSession('app');
  const nav = useNavigate();
  return (
    <div>
      <p className="text-muted-foreground">سلام {member?.displayName}،</p>
      <h1 className="text-[clamp(1.6rem,6vw,2.25rem)] font-black">امروز چی کار کنیم؟</h1>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <button onClick={() => { play(tracks[0]); setFullPlayer(true); }} className="press group relative min-h-[180px] overflow-hidden rounded-[28px] bg-gradient-to-br from-violet to-[hsl(254_70%_30%)] p-5 text-start text-white shadow-[0_16px_48px_hsl(254_100%_40%/.35)]">
          <Headphones className="absolute -bottom-4 -end-4 h-36 w-36 opacity-15" />
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><Play className="h-6 w-6 fill-current" /></span>
          <div className="mt-8 text-xl font-black">شروع ورزش با موزیک</div>
          <div className="text-sm text-white/75">مرشد پلی‌لیستت رو آماده کرده</div>
        </button>
        <button onClick={() => nav('/app/bodyyar')} className="press glow relative min-h-[180px] overflow-hidden rounded-[28px] bg-primary p-5 text-start text-primary-foreground">
          <Sparkles className="absolute -bottom-4 -end-4 h-36 w-36 opacity-15" />
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-black/10"><Sparkles className="h-6 w-6" /></span>
          <div className="mt-8 text-xl font-black">برنامه‌ی من / بدن‌یار</div>
          <div className="text-sm opacity-75">تمرین و تغذیه‌ی امروزت</div>
        </button>
      </div>
      <H t="ادامه‌ی پخش" s={<SampleBadge />} />
      <Glass className="flex items-center gap-3 p-3">
        <Cover hue={(track ?? tracks[2]).hue} className="h-14 w-14 shrink-0" />
        <div className="min-w-0 flex-1"><div className="truncate font-bold">{(track ?? tracks[2]).title}</div><div className="text-sm text-muted-foreground">{(track ?? tracks[2]).artist}</div></div>
        <button className="press tap grid h-12 w-12 place-items-center rounded-full bg-violet text-white" onClick={() => play(track ?? tracks[2])} aria-label="پخش"><Play className="h-5 w-5 fill-current" /></button>
      </Glass>
      <H t="برنامه‌ی امروز" s={<SampleBadge />} />
      <Glass className="flex items-center gap-4 p-4">
        <ProgressRing value={50} size={64}><span className="text-sm font-bold">{fa(50)}٪</span></ProgressRing>
        <div className="min-w-0 flex-1"><div className="font-bold">تمرین قدرتی بالاتنه</div><div className="text-sm text-muted-foreground">{fa(3)} از {fa(6)} حرکت · {fa(35)} دقیقه</div></div>
        <KButton size="sm" variant="outline" to="/app/bodyyar">ادامه</KButton>
      </Glass>
      <Glass className="mt-4 flex items-start gap-3 border-gold/30 p-4"><IconBox icon={Megaphone} tone="gold" /><div><div className="flex items-center gap-2 font-bold">اعلان فروشگاه <SampleBadge /></div><p className="text-sm text-muted-foreground">کالکشن پاییزه‌ی کاپوش رسید؛ برای خریداران کایار ارسال رایگان.</p></div></Glass>
      <H t="پیشنهاد کاپوش" />
      <ShopSection compact />
    </div>
  );
}

function TrackRow({ t, i }: { t: (typeof tracks)[0]; i: number }) {
  const { play, track, playing, favs, toggleFav } = usePreview();
  const active = track?.id === t.id;
  return (
    <li className={cn('flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-white/5', active && 'bg-violet/10')}>
      <button onClick={() => play(t)} className="flex min-w-0 flex-1 items-center gap-3 text-start" aria-label={`پخش ${t.title}`}>
        <span className="w-5 text-center text-sm text-muted-foreground">{active && playing ? <Waveform bars={3} className="h-4" color="bg-violet" /> : fa(i + 1)}</span>
        <Cover hue={t.hue} className="h-12 w-12 shrink-0 rounded-xl" />
        <span className="min-w-0"><span className={cn('block truncate font-bold', active && 'text-[hsl(254_100%_78%)]')}>{t.title}</span><span className="block truncate text-sm text-muted-foreground">{t.artist} · {t.cat}</span></span>
      </button>
      <span className="hidden text-sm text-muted-foreground sm:block" dir="ltr">{fmt(t.duration)}</span>
      <button className="tap grid place-items-center rounded-full" onClick={() => toggleFav(t.id)} aria-label="علاقه‌مندی" aria-pressed={favs.has(t.id)}><Heart className={cn('h-5 w-5', favs.has(t.id) ? 'fill-violet text-violet' : 'text-muted-foreground')} /></button>
    </li>
  );
}

export function Morshed() {
  const { play, favs } = usePreview();
  const [tab, setTab] = useState<'music' | 'podcast'>('music');
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState(''); const [onlyFav, setOnlyFav] = useState(false);
  const src = tab === 'music' ? tracks : podcasts;
  const list = src.filter((t) => (!cat || t.cat === cat) && (!q || t.title.includes(q) || t.artist.includes(q)) && (!onlyFav || favs.has(t.id)));
  const rows = [{ t: 'پیشنهاد برای تو', l: tracks.slice(0, 5) }, { t: 'پرطرفدار', l: tracks.slice(3) }, { t: 'مخصوص دویدن', l: tracks.filter((t) => t.cat === 'کاردیو' || t.cat === 'انرژی') }];
  return (
    <div>
      <div className="flex items-center justify-between"><h1 className="text-[clamp(1.6rem,6vw,2.25rem)] font-black">مرشد</h1><SampleBadge /></div>
      <div className="mt-4 grid grid-cols-2 rounded-full bg-white/5 p-1" role="tablist">
        {(['music', 'podcast'] as const).map((k) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn('tap rounded-full font-bold transition-all duration-300', tab === k ? 'bg-violet text-white shadow-lg' : 'text-muted-foreground')}>{k === 'music' ? 'موزیک' : 'پادکست'}</button>)}
      </div>
      <div className="relative mt-4"><Search className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجوی آهنگ یا هنرمند" aria-label="جست‌وجو" className="h-12 w-full rounded-full border border-white/10 bg-white/[.04] pe-4 ps-12 text-base outline-none focus:border-violet" /></div>
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <button onClick={() => setOnlyFav((v) => !v)} className={cn('tap flex shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold', onlyFav ? 'bg-violet text-white' : 'bg-white/5 text-muted-foreground')}><Heart className="h-4 w-4" />علاقه‌مندی‌ها</button>
        {categories.map((c) => <button key={c} onClick={() => setCat(cat === c ? null : c)} className={cn('tap shrink-0 rounded-full px-4 text-sm font-bold', cat === c ? 'bg-violet text-white' : 'bg-white/5 text-muted-foreground')}>{c}</button>)}
      </div>
      {tab === 'music' && !cat && !q && !onlyFav && rows.map((r) => (
        <div key={r.t}><H t={r.t} />
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">{r.l.map((t) => <button key={t.id} onClick={() => play(t)} className="press w-36 shrink-0 snap-start text-start"><Cover hue={t.hue} className="aspect-square w-full"><span className="absolute bottom-2 end-2 grid h-10 w-10 place-items-center rounded-full bg-violet text-white"><Play className="h-4 w-4 fill-current" /></span></Cover><div className="mt-2 truncate text-sm font-bold">{t.title}</div><div className="truncate text-xs text-muted-foreground">{t.artist}</div></button>)}</div>
        </div>
      ))}
      <H t={tab === 'music' ? 'همه‌ی آهنگ‌ها' : 'اپیزودها'} />
      {list.length ? <ul className="space-y-1">{list.map((t, i) => <TrackRow key={t.id} t={t} i={i} />)}</ul> : <StateView icon={SearchX} tone="violet" title="چیزی پیدا نشد" text="فیلترها یا جست‌وجو را تغییر بده." />}
      <p className="mt-6 text-center text-xs text-muted-foreground">آهنگ‌ها با مجوز Creative Commons؛ نام هنرمند کنار هر آهنگ آمده است.</p>
    </div>
  );
}

const wizard = [
  { q: 'هدفت چیه؟', o: ['کاهش وزن', 'افزایش عضله', 'تناسب عمومی', 'آمادگی مسابقه'] },
  { q: 'جنسیت', o: ['زن', 'مرد'] },
  { q: 'سطح فعالیتت', o: ['تازه‌کار', 'متوسط', 'حرفه‌ای'] },
  { q: 'هفته‌ای چند روز؟', o: ['۲ روز', '۳ روز', '۴ روز', '۵+ روز'] },
  { q: 'کجا تمرین می‌کنی؟', o: ['باشگاه', 'خانه', 'فضای باز'] },
  { q: 'رژیم غذایی', o: ['معمولی', 'گیاهی', 'کم‌کربوهیدرات'] },
];
const weight = [82, 81.4, 81, 80.2, 79.8, 79.1, 78.6].map((v, i) => ({ w: `هفته ${fa(i + 1)}`, v }));

export function Bodyyar() {
  const [stage, setStage] = useState<'intro' | 'wizard' | 'building' | 'plan'>('intro');
  const [step, setStep] = useState(0); const [ans, setAns] = useState<string[]>([]);
  const [day, setDay] = useState(0); const [done, setDone] = useState<Set<number>>(new Set([0]));
  const [msg, setMsg] = useState('');
  if (stage === 'intro') return (
    <div>
      <div className="relative overflow-hidden rounded-[32px] bg-primary p-6 text-primary-foreground">
        <div className="absolute -end-10 -top-10 h-48 w-48 rounded-full border-[18px] border-black/10" />
        <h1 className="relative text-[clamp(1.6rem,6vw,2.25rem)] font-black">بدن‌یار</h1>
        <p className="relative mt-1 max-w-sm font-medium opacity-80">با شش سؤال ساده، برنامه‌ی تمرین و غذایی مخصوص خودت رو بگیر.</p>
        <button onClick={() => setStage('wizard')} className="press tap relative mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-primary-foreground px-6 font-bold text-primary">شروع کن <ArrowLeft className="h-5 w-5" /></button>
      </div>
      <H t="چه می‌گیری؟" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[[Dumbbell, 'برنامه‌ی تمرین', 'متناسب با سطح و زمانت'], [Salad, 'برنامه‌ی غذایی', 'با غذاهای در دسترس'], [LineChart, 'پیگیری', 'وزن و پیشرفت هفتگی']].map(([I, t, d]) => <Glass key={t as string} className="p-4"><IconBox icon={I as typeof Dumbbell} /><div className="mt-3 font-bold">{t as string}</div><div className="text-sm text-muted-foreground">{d as string}</div></Glass>)}
      </div>
      <button onClick={() => setStage('plan')} className="tap mt-4 text-sm text-muted-foreground underline">دیدن برنامه‌ی نمونه</button>
    </div>
  );
  if (stage === 'wizard') {
    const s = wizard[step];
    return (
      <div>
        <div className="flex items-center gap-2" aria-label={`مرحله‌ی ${fa(step + 1)} از ${fa(6)}`}>{wizard.map((_, i) => <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-white/10')} />)}</div>
        <div className="mt-2 text-sm text-muted-foreground">مرحله‌ی {fa(step + 1)} از {fa(6)}</div>
        <h1 className="mt-6 text-2xl font-black">{s.q}</h1>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {s.o.map((o) => <button key={o} onClick={() => { const a = [...ans]; a[step] = o; setAns(a); }} className={cn('press glass flex min-h-[64px] items-center justify-between rounded-3xl px-5 text-start text-lg font-bold', ans[step] === o && 'glass-active')}>{o}{ans[step] === o && <Check className="h-5 w-5 text-primary" />}</button>)}
        </div>
        <div className="mt-8 flex gap-3">
          <KButton variant="outline" onClick={() => (step ? setStep(step - 1) : setStage('intro'))}>قبلی</KButton>
          <KButton className="flex-1" disabled={!ans[step]} onClick={() => { if (step < 5) setStep(step + 1); else { setStage('building'); setTimeout(() => setStage('plan'), 1800); } }}>{step < 5 ? 'بعدی' : 'ساخت برنامه'}</KButton>
        </div>
      </div>
    );
  }
  if (stage === 'building') return <StateView icon={Loader2} title="بدن‌یار داره برنامه‌ات رو می‌سازه…" text="(نمونه — ساخت واقعی با هوش مصنوعی در فاز ۱)" />;
  const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  const ex = [['اسکات با هالتر', '۴×۱۰'], ['پرس سینه', '۴×۸'], ['زیربغل سیم‌کش', '۳×۱۲'], ['پلانک', '۳×۴۵ثانیه']];
  return (
    <div>
      <div className="flex items-center justify-between"><h1 className="text-[clamp(1.6rem,6vw,2.25rem)] font-black">برنامه‌ی من</h1><SampleBadge /></div>
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist">{days.map((d, i) => <button key={d} role="tab" aria-selected={day === i} onClick={() => setDay(i)} className={cn('tap shrink-0 rounded-2xl px-4 text-sm font-bold', day === i ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground')}>{d}</button>)}</div>
      <H t="تمرین امروز" />
      <ul className="space-y-2">{ex.map(([n, r], i) => <li key={n}><button onClick={() => setDone((s) => { const x = new Set(s); x.has(i) ? x.delete(i) : x.add(i); return x; })} className={cn('glass press flex w-full items-center gap-3 rounded-3xl p-4 text-start', done.has(i) && 'border-primary/40')} aria-pressed={done.has(i)}><span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full border-2', done.has(i) ? 'border-primary bg-primary text-primary-foreground' : 'border-white/20')}>{done.has(i) && <Check className="h-4 w-4" />}</span><span className={cn('flex-1 font-bold', done.has(i) && 'text-muted-foreground line-through')}>{n}</span><span className="text-sm text-muted-foreground">{r}</span></button></li>)}</ul>
      <H t="تغذیه‌ی امروز" />
      <Glass className="flex flex-wrap justify-around gap-4 p-5">{[['پروتئین', 72, 'hsl(var(--primary))', '۱۲۰ گرم'], ['کربوهیدرات', 54, 'hsl(var(--violet))', '۲۰۰ گرم'], ['چربی', 40, 'hsl(var(--gold))', '۶۰ گرم']].map(([l, v, c, g]) => <div key={l as string} className="text-center"><ProgressRing value={v as number} size={84} color={c as string}><span className="font-bold">{fa(v as number)}٪</span></ProgressRing><div className="mt-2 text-sm font-bold">{l}</div><div className="text-xs text-muted-foreground">{g}</div></div>)}</Glass>
      <H t="روند وزن" />
      <Glass className="h-56 p-3" dir="ltr">
        <ResponsiveContainer><AreaChart data={weight}><defs><linearGradient id="g1" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="hsl(71 100% 56%)" stopOpacity={0.4} /><stop offset="1" stopColor="hsl(71 100% 56%)" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="w" tick={{ fill: '#A7ABB6', fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis domain={['dataMin - 1', 'dataMax + 1']} hide /><Tooltip contentStyle={{ background: '#12151A', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16 }} /><Area dataKey="v" stroke="hsl(71 100% 56%)" strokeWidth={2.5} fill="url(#g1)" /></AreaChart></ResponsiveContainer>
      </Glass>
      <H t="دستیار بدن‌یار" />
      <Glass className="p-4">
        <div className="space-y-2"><div className="flex items-start gap-2"><IconBox icon={Bot} className="h-9 w-9 rounded-xl" /><div className="rounded-2xl bg-white/[.06] px-3 py-2 text-sm">سلام! سؤالی درباره‌ی برنامه‌ات داری؟ (نمونه)</div></div></div>
        <form onSubmit={(e) => { e.preventDefault(); setMsg(''); }} className="mt-3 flex gap-2"><input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="پیامت رو بنویس… (فاز ۱)" aria-label="پیام" className="h-12 min-w-0 flex-1 rounded-full border border-white/10 bg-white/[.04] px-4 text-base outline-none focus:border-primary" disabled /><button disabled className="tap grid place-items-center rounded-full bg-primary text-primary-foreground opacity-50" aria-label="ارسال"><Send className="h-5 w-5 -scale-x-100" /></button></form>
      </Glass>
      <button onClick={() => { setStage('intro'); setStep(0); setAns([]); }} className="tap mt-4 text-sm text-muted-foreground underline">ساخت دوباره‌ی برنامه</button>
    </div>
  );
}

export function Profile() {
  const { member, logout, token } = useSession('app');
  const nav = useNavigate();
  const [sessions, setSessions] = useState<AuthSessionsOutputType['sessions'] | null>(null);
  const load = (revokeId?: string) => token && authSessions({ token, revokeId }).then((r) => setSessions(r.sessions)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { void load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  const out = async (all?: boolean) => { await logout(all); nav('/app/login', { replace: true }); };
  return (
    <div>
      <Glass className="flex items-center gap-4 p-5">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary text-2xl font-black text-primary-foreground">{member?.displayName[0]}</span>
        <div className="min-w-0"><div className="truncate text-xl font-black">{member?.displayName}</div><div className="font-latin text-sm text-muted-foreground" dir="ltr">{member?.username}</div></div>
      </Glass>
      <div className="mt-5 space-y-2">
        <button onClick={() => nav('/app/change-password')} className="glass press flex min-h-[60px] w-full items-center gap-3 rounded-3xl px-4"><KeyRound className="h-5 w-5 text-primary" /><span className="flex-1 text-start font-bold">تغییر رمز</span><ChevronLeft className="h-5 w-5 text-muted-foreground" /></button>
      </div>
      <H t="نشست‌های فعال" s={<button onClick={() => out(true)} className="tap text-sm font-bold text-destructive">خروج از همه</button>} />
      <Glass className="divide-y divide-white/5 p-1">
        {!sessions ? <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin" /></div> : sessions.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold" dir="ltr">{s.userAgent.slice(0, 60) || 'دستگاه نامشخص'}</div><div className="text-xs text-muted-foreground">{s.current ? 'همین دستگاه' : `آخرین فعالیت ${s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleDateString('fa-IR') : '—'}`}</div></div>
            {!s.current && <KButton variant="ghost" size="sm" onClick={() => load(s.id)}>خروج</KButton>}
          </div>
        ))}
      </Glass>
      <button onClick={() => out()} className="glass press mt-5 flex min-h-[60px] w-full items-center gap-3 rounded-3xl px-4 text-destructive"><LogOut className="h-5 w-5" /><span className="flex-1 text-start font-bold">خروج</span></button>
    </div>
  );
}
