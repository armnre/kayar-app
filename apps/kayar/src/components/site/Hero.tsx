import { useEffect, useState } from 'react';
import { Headphones, Dumbbell, Bot, Utensils, AudioWaveform, ArrowLeft, Play, Sparkles } from 'lucide-react';
import { KButton, Glass, Waveform, ProgressRing, SampleBadge, Cover } from '../kit';
import { fa } from '../../lib/config';

const orbs = [
  { icon: Headphones, target: 'morshed', label: 'مرشد' },
  { icon: Dumbbell, target: 'bodyyar', label: 'تمرین' },
  { icon: Bot, target: 'bodyyar', label: 'دستیار' },
  { icon: Utensils, target: 'bodyyar', label: 'تغذیه' },
  { icon: AudioWaveform, target: 'morshed', label: 'موزیک' },
];

function Orbit() {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0; const s = performance.now();
    const loop = (n: number) => { setT((n - s) / 1000); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <>
      {orbs.map((o, i) => {
        const a = (i / orbs.length) * Math.PI * 2 + t * 0.18;
        const x = 50 + Math.cos(a) * 46, y = 52 + Math.sin(a) * 30;
        const front = Math.sin(a) > 0;
        return (
          <button key={i} onClick={() => document.getElementById(o.target)?.scrollIntoView({ behavior: 'smooth' })} aria-label={o.label}
            className="glass press absolute grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-primary hover:glow md:h-14 md:w-14"
            style={{ left: `${x}%`, top: `${y}%`, zIndex: front ? 30 : 5, opacity: front ? 1 : 0.6, scale: front ? '1' : '.85' }}>
            <o.icon className="h-5 w-5 md:h-6 md:w-6" />
          </button>
        );
      })}
    </>
  );
}

function Scene() {
  return (
    <div className="relative mx-auto h-[46svh] w-full max-w-[560px] md:h-full">
      <div className="absolute inset-x-[14%] bottom-[6%] top-[14%] -rotate-12 overflow-hidden rounded-[32px] bg-primary" aria-hidden>
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,.25) 0 1px, transparent 1px 6px)' }} />
        <div className="shine absolute inset-0" />
      </div>
      <div className="absolute left-1/2 top-[48%] aspect-square w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-primary/30 animate-spin-slow" aria-hidden />
      <img src="https://images.fillout.com/888622/bvjezbu9kd/generated-images/m7CVfYZ1XxoDXoHHPmRnjU/img_6hSskSlC6BwCKZ21.jpg" alt="ورزشکار با هدفون و گوشی" width={1056} height={1408} fetchPriority="high"
        className="absolute bottom-0 left-1/2 z-20 h-[104%] w-auto max-w-none -translate-x-1/2 object-contain"
        style={{ maskImage: 'radial-gradient(ellipse 50% 62% at 50% 44%, black 58%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 50% 62% at 50% 44%, black 58%, transparent 100%)' }} />
      <Orbit />
      <div aria-hidden className="pointer-events-none">
        <Glass className="animate-float absolute end-[-2%] top-[8%] z-30 hidden w-52 p-3 sm:block">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span>مرشد در حال پخش</span><SampleBadge /></div>
          <div className="flex items-center gap-3"><Cover hue={254} className="h-11 w-11 shrink-0"><Play className="absolute inset-0 m-auto h-4 w-4 fill-white text-white" /></Cover><div className="min-w-0"><div className="truncate text-sm font-bold">ضربان شهر</div><Waveform bars={14} className="h-5" color="bg-[hsl(254_100%_75%)]" /></div></div>
        </Glass>
        <Glass className="animate-float absolute bottom-[10%] start-[-4%] z-30 hidden w-48 p-3 [animation-delay:1.5s] sm:block">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span>برنامه‌ی امروز</span><SampleBadge /></div>
          <div className="flex items-center gap-3"><ProgressRing value={68} size={52} stroke={5}><span className="text-xs font-bold">{fa(68)}٪</span></ProgressRing><div className="text-sm leading-6"><div className="font-bold">تمرین قدرتی</div><div className="text-muted-foreground">{fa(4)} از {fa(6)} حرکت</div></div></div>
        </Glass>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="noise relative isolate overflow-hidden pt-[calc(var(--header-h)+var(--safe-t)+8px)]">
      <div className="absolute inset-0 -z-10 depth-bg" aria-hidden />
      <div className="dot-grid absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_40%,black,transparent)]" aria-hidden />
      <div className="absolute -top-20 end-[-10%] -z-10 h-[420px] w-[420px] rounded-full bg-primary/20 blur-[120px]" aria-hidden />
      <div className="absolute bottom-0 start-[-10%] -z-10 h-[380px] w-[380px] rounded-full bg-violet/25 blur-[120px]" aria-hidden />
      <div className="outline-text pointer-events-none absolute inset-x-0 top-[18%] -z-10 select-none text-center font-latin text-[26vw] font-black leading-none opacity-[.08]" aria-hidden>KAYAR</div>

      <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 md:min-h-[min(88svh,780px)] md:grid-cols-[52fr_48fr] md:gap-4">
        <div className="min-w-0 pt-4 md:pt-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[13px] font-bold text-primary"><Sparkles className="h-4 w-4" />همراه هوشمند ورزش و سلامت</span>
          <h1 className="mt-4 text-[clamp(2rem,7vw,4.75rem)] font-black leading-[1.2]">
            <span className="line-mask"><span>تیشرتت رو پوشیدی؟</span></span>
            <span className="line-mask"><span style={{ animationDelay: '120ms' }}>حالا <span className="brush text-primary">همراهت رو داری</span></span></span>
          </h1>
          <p className="mt-4 max-w-xl text-[clamp(1rem,2.2vw,1.15rem)] leading-[1.8] text-muted-foreground">موزیک مخصوص ورزش و برنامه‌ی تمرین و تغذیه‌ی هوشمند، فقط برای خریداران کاپوش.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <KButton to="/app" size="lg" className="animate-pulse-glow">ورود به کایار <ArrowLeft className="h-5 w-5" /></KButton>
            <KButton variant="outline" size="lg" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>چطور کار می‌کنه؟</KButton>
          </div>
        </div>
        <Scene />
      </div>

      <div className="relative -mx-4 mt-2 -rotate-2 overflow-hidden bg-primary py-3 text-primary-foreground" aria-hidden>
        <div className="ticker-track flex w-max gap-8 whitespace-nowrap text-lg font-black">
          {Array.from({ length: 8 }).map((_, i) => <span key={i} className="flex gap-8">{['مرشد', 'بدن‌یار', 'موزیک ورزشی', 'برنامه‌ی هوشمند', 'لباس کاپوش'].map((w) => <span key={w}>{w} •</span>)}</span>)}
        </div>
      </div>
    </section>
  );
}
