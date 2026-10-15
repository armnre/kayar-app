import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Dumbbell, Salad, LineChart, Check, Send, Loader2, Bot, Sparkles, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { bodyyarAi } from '@/zite/api';
import { useSession, errMsg } from '../lib/session';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { cn } from '@/ui/lib/utils';
import { isBackendMode } from '@/zite/caller';
import { KButton, Glass, IconBox, SampleBadge, ProgressRing, StateView } from '../components/kit';
import { H } from '../components/app/HomeMorshed';
import { fa } from '../lib/config';
export { AppHome } from '../components/app/HomeMorshed';
export { Morshed } from '../components/app/Morshed';
export { Notifications } from '../components/app/Notifications';
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

type AiPlan = {
  title?: string; summary?: string;
  days?: { name?: string; focus?: string; exercises?: { name?: string; sets?: number; reps?: string; rest?: string; note?: string }[] }[];
  nutrition?: { calories?: number; proteinGrams?: number; tips?: string[] };
  warnings?: string[];
};

export function Bodyyar() {
  const { token } = useSession('app');
  const [stage, setStage] = useState<'intro' | 'wizard' | 'building' | 'plan'>('intro');
  const [step, setStep] = useState(0); const [ans, setAns] = useState<string[]>([]);
  const [day, setDay] = useState(0); const [done, setDone] = useState<Set<number>>(new Set([0]));
  const [msg, setMsg] = useState('');
  const [plan, setPlan] = useState<AiPlan | null>(null);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [chat, setChat] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [sending, setSending] = useState(false);
  const chatEnd = useRef<HTMLDivElement | null>(null);

  useEffect(() => { bodyyarAi({ mode: 'status' }).then((r) => setAiEnabled(r.enabled)).catch(() => setAiEnabled(false)); }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [chat.length, sending]);

  const profile = {
    goal: ans[0] ?? 'تناسب عمومی', gender: ans[1] ?? '', level: ans[2] ?? 'تازه‌کار',
    daysPerWeek: Math.max(2, Math.min(7, Number((ans[3] ?? '۳ روز').replace(/[^۰-۹0-9]/g, '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))) || 3))),
    equipment: ans[4] ?? '', diet: ans[5] ?? 'معمولی',
  };

  const buildPlan = async () => {
    setStage('building');
    try {
      const r = await bodyyarAi({ mode: 'plan', profile });
      if (r.plan) {
        setPlan(r.plan as AiPlan);
        toast.success('برنامه‌ات با هوش مصنوعی ساخته شد');
      } else {
        setPlan(null);
        toast.message('برنامه‌ی نمونه نمایش داده می‌شود', { description: 'برای ساخت برنامه‌ی اختصاصی، دستیار هوشمند باید فعال باشد.' });
      }
    } catch (e) {
      toast.error(errMsg(e));
      setPlan(null);
    } finally {
      setStage('plan');
    }
  };

  const ask = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    const next = [...chat, { role: 'user' as const, content }];
    setChat(next);
    setMsg('');
    setSending(true);
    try {
      const r = await bodyyarAi({ mode: 'chat', messages: next.slice(-10).map((m) => ({ role: m.role, content: m.content })), profile });
      setChat([...next, { role: 'assistant', content: r.text ?? '...' }]);
    } catch (e) {
      setChat([...next, { role: 'assistant', content: errMsg(e) }]);
    } finally {
      setSending(false);
    }
  };
  if (stage === 'intro') return (
    <div className="pb-6">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[32px] border border-primary/20 bg-card bg-[radial-gradient(90%_80%_at_100%_0%,hsl(var(--primary)/.22),transparent_60%)] p-6 pb-7">
        <div className="pointer-events-none absolute -end-12 -top-12 h-56 w-56 rounded-full border-[26px] border-primary/10" />
        <div className="pointer-events-none absolute -bottom-20 -start-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <span className="relative inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary"><Sparkles className="h-3.5 w-3.5" />مربی شخصی تو</span>
        <h1 className="relative mt-4 text-[clamp(2rem,8vw,2.8rem)] font-black leading-tight">بدن‌یار</h1>
        <p className="relative mt-1 max-w-xs font-medium text-muted-foreground">شش سؤال ساده، یه برنامه‌ی تمرین و تغذیه که فقط مال خودته.</p>
        <div className="relative mt-6 flex items-center gap-3">
          <button onClick={() => setStage('wizard')} className="press inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-black text-primary-foreground shadow-[0_10px_30px_-8px_hsl(var(--primary)/.6)]">شروع کن <ArrowLeft className="h-5 w-5" /></button>
          <span className="text-xs font-bold text-muted-foreground">⏱ کمتر از ۱ دقیقه</span>
        </div>
      </motion.div>
      <H t="چی می‌گیری؟" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[[Dumbbell, 'برنامه‌ی تمرین', 'متناسب با سطح و زمانت', 'bg-primary/15 text-primary'], [Salad, 'برنامه‌ی غذایی', 'با غذاهای در دسترس', 'bg-[hsl(24_100%_60%/.15)] text-[hsl(24_100%_65%)]'], [LineChart, 'پیگیری پیشرفت', 'وزن و روند هفتگی', 'bg-violet/15 text-[hsl(254_100%_78%)]']].map(([I, t, d, c], i) => {
          const Ic = I as typeof Dumbbell;
          return <motion.div key={t as string} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }} className="flex items-center gap-3 rounded-3xl border border-border bg-card p-4 sm:block"><span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl', c as string)}><Ic className="h-6 w-6" /></span><div className="sm:mt-3"><div className="font-black">{t as string}</div><div className="text-sm text-muted-foreground">{d as string}</div></div></motion.div>;
        })}
      </div>
      <button onClick={() => setStage('plan')} className="tap mt-5 w-full rounded-2xl border border-dashed border-border text-sm font-bold text-muted-foreground">دیدن یه برنامه‌ی نمونه</button>
    </div>
  );
  if (stage === 'wizard') {
    const s = wizard[step];
    return (
      <div>
        <div className="flex items-center gap-2" aria-label={`مرحله‌ی ${fa(step + 1)} از ${fa(6)}`}>{wizard.map((_, i) => <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-white/10')} />)}</div>
        <div className="mt-2 text-sm text-muted-foreground">مرحله‌ی {fa(step + 1)} از {fa(6)}</div>
        <motion.h1 key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="mt-6 text-[clamp(1.6rem,6vw,2.1rem)] font-black">{s.q}</motion.h1>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {s.o.map((o) => <button key={o} onClick={() => { const a = [...ans]; a[step] = o; setAns(a); }} className={cn('press flex min-h-[64px] items-center justify-between rounded-3xl border bg-card px-5 text-start text-lg font-bold transition', ans[step] === o ? 'border-primary bg-primary/10 text-primary' : 'border-border')}>{o}{ans[step] === o && <Check className="h-5 w-5 text-primary" />}</button>)}
        </div>
        <div className="mt-8 flex gap-3">
          <KButton variant="outline" onClick={() => (step ? setStep(step - 1) : setStage('intro'))}>قبلی</KButton>
          <KButton className="flex-1" disabled={!ans[step]} onClick={() => { if (step < 5) setStep(step + 1); else void buildPlan(); }}>{step < 5 ? 'بعدی' : 'ساخت برنامه'}</KButton>
        </div>
      </div>
    );
  }
  if (stage === 'building') return <StateView icon={Loader2} title="بدن‌یار داره برنامه‌ات رو می‌سازه…" text="هوش مصنوعی با در نظر گرفتن هدف، سطح و تجهیزاتت برنامه رو می‌نویسد…" />;
  const days = plan?.days?.length ? plan.days.map((d, i) => d.name || `روز ${fa(i + 1)}`) : ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  const aiEx = plan?.days?.[Math.min(day, (plan.days?.length ?? 1) - 1)]?.exercises?.map((x) => [x.name ?? '', `${fa(x.sets ?? 0)}×${x.reps ?? ''}`, x.note ?? x.rest ?? ''] as [string, string, string]);
  const ex: [string, string, string][] = aiEx?.length
    ? aiEx
    : [['اسکات با هالتر', '۴×۱۰', ''], ['پرس سینه', '۴×۸', ''], ['زیربغل سیم‌کش', '۳×۱۲', ''], ['پلانک', '۳×۴۵ثانیه', '']];
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[clamp(1.6rem,6vw,2.25rem)] font-black">{plan?.title ?? 'برنامه‌ی من'}</h1>
          <p className="text-sm text-muted-foreground">{plan?.summary ?? (plan ? '' : 'برنامه‌ی نمونه — برای نسخه‌ی اختصاصی، بدن‌یار هوشمند را فعال کن.')}</p>
        </div>
        {plan ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary"><Sparkles className="h-3.5 w-3.5" />هوش مصنوعی</span> : <SampleBadge />}
      </div>
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist">{days.map((d, i) => <button key={d} role="tab" aria-selected={day === i} onClick={() => setDay(i)} className={cn('tap shrink-0 rounded-2xl px-4 text-sm font-bold', day === i ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground')}>{d}</button>)}</div>
      <H t="تمرین امروز" />
      <ul className="space-y-2">{ex.map(([n, r, note], i) => <li key={`${n}-${i}`}><button onClick={() => setDone((s) => { const x = new Set(s); x.has(i) ? x.delete(i) : x.add(i); return x; })} className={cn('glass press flex w-full items-center gap-3 rounded-3xl p-4 text-start', done.has(i) && 'border-primary/40')} aria-pressed={done.has(i)}><span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full border-2', done.has(i) ? 'border-primary bg-primary text-primary-foreground' : 'border-white/20')}>{done.has(i) && <Check className="h-4 w-4" />}</span><span className={cn('min-w-0 flex-1', done.has(i) && 'text-muted-foreground line-through')}><span className="block font-bold">{n}</span>{note && <span className="block text-xs text-muted-foreground">{note}</span>}</span><span className="shrink-0 text-sm text-muted-foreground">{r}</span></button></li>)}</ul>
      <H t={plan?.nutrition?.calories ? `تغذیه‌ی امروز — حدود ${fa(plan.nutrition.calories)} کیلوکالری` : 'تغذیه‌ی امروز'} />
      <Glass className="flex flex-wrap justify-around gap-4 p-5">{[
          ['پروتئین', plan?.nutrition?.proteinGrams ? Math.min(100, Math.round((plan.nutrition.proteinGrams / Math.max(1, profile.daysPerWeek * 40 + 60)) * 100)) : 72, 'hsl(var(--primary))', plan?.nutrition?.proteinGrams ? `${fa(plan.nutrition.proteinGrams)} گرم` : '۱۲۰ گرم'],
          ['کربوهیدرات', 54, 'hsl(var(--violet))', '۲۰۰ گرم'],
          ['چربی', 40, 'hsl(var(--gold))', '۶۰ گرم'],
        ].map(([l, v, c, g]) => <div key={l as string} className="text-center"><ProgressRing value={v as number} size={84} color={c as string}><span className="font-bold">{fa(v as number)}٪</span></ProgressRing><div className="mt-2 text-sm font-bold">{l}</div><div className="text-xs text-muted-foreground">{g}</div></div>)}</Glass>
      <H t="روند وزن" />
      <Glass className="h-56 p-3" dir="ltr">
        <ResponsiveContainer><AreaChart data={weight}><defs><linearGradient id="g1" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="hsl(71 100% 56%)" stopOpacity={0.4} /><stop offset="1" stopColor="hsl(71 100% 56%)" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="w" tick={{ fill: '#A7ABB6', fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis domain={['dataMin - 1', 'dataMax + 1']} hide /><Tooltip contentStyle={{ background: '#12151A', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16 }} /><Area dataKey="v" stroke="hsl(71 100% 56%)" strokeWidth={2.5} fill="url(#g1)" /></AreaChart></ResponsiveContainer>
      </Glass>
      <H t="دستیار بدن‌یار" />
      <Glass className="p-4">
        <div className="max-h-80 space-y-2 overflow-y-auto">
          <div className="flex items-start gap-2"><IconBox icon={Bot} className="h-9 w-9 rounded-xl" /><div className="rounded-2xl bg-white/[.06] px-3 py-2 text-sm">{aiEnabled ? 'سلام! من بدنیارم؛ درباره‌ی تمرین، تغذیه یا برنامه‌ات بپرس.' : aiEnabled === false ? 'دستیار هوشمند روی این نصب فعال نشده. مدیر باید کلید هوش مصنوعی را در سرور تنظیم کند.' : 'در حال بررسی دستیار هوشمند…'}</div></div>
          {chat.map((m, i) => (
            <div key={i} className={cn('flex items-start gap-2', m.role === 'user' && 'justify-end')}>
              {m.role === 'assistant' && <IconBox icon={Bot} className="h-9 w-9 rounded-xl" />}
              <div className={cn('max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm', m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-white/[.06]')}>{m.content}</div>
            </div>
          ))}
          {sending && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />بدنیار دارد فکر می‌کند…</div>}
          <div ref={chatEnd} />
        </div>
        {chat.length > 0 && <button onClick={() => setChat([])} className="tap mt-2 text-xs text-muted-foreground underline">پاک کردن گفتگو</button>}
        <div className="mt-3 flex flex-wrap gap-2">
          {['برای وزن‌کم‌کردن صبح چی بخورم؟', 'تمرین امروز را ساده‌تر کن', 'چطور ریکاوری بهتری داشته باشم؟'].map((q) => (
            <button key={q} disabled={!aiEnabled || sending} onClick={() => void ask(q)} className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-xs disabled:opacity-40">{q}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void ask(msg); }} className="mt-3 flex gap-2">
          <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="پیامت رو بنویس…" aria-label="پیام" disabled={!aiEnabled || sending} className="h-12 min-w-0 flex-1 rounded-full border border-white/10 bg-white/[.04] px-4 text-base outline-none focus:border-primary disabled:opacity-50" />
          <button type="submit" disabled={!aiEnabled || sending || !msg.trim()} className="tap grid place-items-center rounded-full bg-primary px-4 text-primary-foreground disabled:opacity-50" aria-label="ارسال">{sending ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 -scale-x-100" />}</button>
        </form>
        {isBackendMode() ? <p className="mt-2 text-xs text-muted-foreground">اتصال امن از طریق بک‌اند کایار؛ کلید مدل‌ها روی سرور می‌ماند.</p> : null}
      </Glass>
      <button onClick={() => { setStage('intro'); setStep(0); setAns([]); setPlan(null); setDone(new Set([0])); }} className="tap mt-4 text-sm text-muted-foreground underline">ساخت دوباره‌ی برنامه</button>
    </div>
  );
}

