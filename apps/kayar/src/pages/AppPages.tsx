import { useState } from 'react';
import { ArrowLeft, Dumbbell, Salad, LineChart, Check, Send, Loader2, Bot } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { cn } from '@project/components/lib/utils';
import { KButton, Glass, IconBox, SampleBadge, ProgressRing, StateView } from '../components/kit';
import { H } from '../components/app/HomeMorshed';
import { fa } from '../lib/config';
export { AppHome, Morshed } from '../components/app/HomeMorshed';
export { Profile } from '../components/app/Profile';

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

