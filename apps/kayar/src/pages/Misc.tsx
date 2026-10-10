import { useState } from 'react';
import { WifiOff, Lock, ShieldX, Compass, Inbox, AlertTriangle, Music } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@project/components/ui/tabs';
import { Switch } from '@project/components/ui/switch';
import { KButton, Glass, KayarLogo, SampleBadge, StatusBadge, PasswordField, FloatInput, CopyField, ProgressRing, Waveform, StateView, IconBox, Sparkline } from '../components/kit';
import { PreviewBanner } from '../components/app/AppShell';
import { fa } from '../lib/config';

export function NotFound() {
  return <div className="grid min-h-svh place-items-center depth-bg"><StateView icon={Compass} title="این صفحه پیدا نشد (۴۰۴)" text="شاید آدرس اشتباه است." action={<KButton to="/">صفحه‌ی اصلی</KButton>} /></div>;
}

const swatches = [['--background', 'bg'], ['--bg-1', 'bg-1'], ['--bg-2', 'bg-2'], ['--surface', 'surface'], ['--primary', 'lime'], ['--lime-hi', 'lime-hi'], ['--violet', 'violet'], ['--gold', 'gold'], ['--cyan', 'cyan'], ['--muted-foreground', 'muted']];

export function Styleguide() {
  const [pw, setPw] = useState('kayar2026'); const [v, setV] = useState(''); const [sw, setSw] = useState(true);
  return (
    <div className="min-h-svh depth-bg">
      <PreviewBanner />
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
        <div className="flex items-center justify-between"><KayarLogo className="text-2xl" /><SampleBadge /></div>
        <h1 className="text-[clamp(2rem,6vw,4rem)] font-black">دیزاین‌سیستم <span className="text-primary">کایار</span></h1>
        <section><h2 className="mb-3 text-xl font-extrabold">رنگ‌ها</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{swatches.map(([k, l]) => <div key={k} className="glass rounded-3xl p-2"><div className="h-16 rounded-2xl" style={{ background: `hsl(var(${k}))` }} /><div className="mt-2 px-1 font-latin text-xs" dir="ltr">{l}</div></div>)}</div></section>
        <section><h2 className="mb-3 text-xl font-extrabold">تایپوگرافی</h2><Glass className="space-y-2 p-6"><div className="text-5xl font-black">تیتر ۹۰۰</div><div className="text-2xl font-extrabold">تیتر ۸۰۰</div><p className="text-[17px] leading-[1.8] text-muted-foreground">متن بدنه ۴۰۰ با ارتفاع خط ۱٫۸ — ارقام فارسی {fa(1405)}</p><div className="font-latin text-lg font-bold" dir="ltr">Sora — LATIN LABELS</div></Glass></section>
        <section><h2 className="mb-3 text-xl font-extrabold">دکمه‌ها</h2><div className="flex flex-wrap gap-3"><KButton>اصلی</KButton><KButton variant="outline">خط‌دور</KButton><KButton variant="ghost">شبح</KButton><KButton variant="danger">حذف</KButton><KButton loading>در حال ارسال</KButton><KButton disabled>غیرفعال</KButton></div></section>
        <section className="grid gap-4 md:grid-cols-2"><div className="space-y-4"><h2 className="text-xl font-extrabold">فرم</h2><FloatInput id="sg1" label="ورودی با برچسب شناور" value={v} onChange={setV} /><FloatInput id="sg2" label="ورودی با خطا" value="" onChange={() => {}} error="این فیلد لازم است." /><PasswordField id="sg3" label="رمز جدید" value={pw} onChange={setPw} autoComplete="new-password" meter /><CopyField label="نام کاربری" value="kp-1042" /><label className="flex items-center justify-between"><span>سوییچ</span><Switch checked={sw} onCheckedChange={setSw} /></label></div>
          <div className="space-y-4"><h2 className="text-xl font-extrabold">نمایش داده</h2><div className="flex flex-wrap gap-2"><StatusBadge status="active" /><StatusBadge status="pending" /><StatusBadge status="suspended" /><StatusBadge status="draft" /><StatusBadge status="published" /></div><Glass active className="flex items-center gap-4 p-4"><ProgressRing value={72}><span className="font-bold">{fa(72)}٪</span></ProgressRing><div className="flex-1"><Waveform /><Sparkline data={[3, 5, 4, 7, 6, 9, 8]} /></div></Glass><div className="flex gap-3"><IconBox icon={Music} tone="violet" /><IconBox icon={Music} /><IconBox icon={Music} tone="cyan" /><IconBox icon={Music} tone="gold" /></div><div className="space-y-2"><div className="skeleton h-6 w-2/3 rounded-full" /><div className="skeleton h-20 rounded-3xl" /></div>
            <Tabs defaultValue="a" dir="rtl"><TabsList className="rounded-full bg-white/5"><TabsTrigger value="a" className="rounded-full">تب یک</TabsTrigger><TabsTrigger value="b" className="rounded-full">تب دو</TabsTrigger></TabsList><TabsContent value="a" className="text-muted-foreground">محتوای تب یک</TabsContent><TabsContent value="b" className="text-muted-foreground">محتوای تب دو</TabsContent></Tabs></div></section>
        <section><h2 className="mb-3 text-xl font-extrabold">حالت‌های لبه</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Glass><StateView icon={Inbox} title="خالی" text="هنوز چیزی این‌جا نیست." /></Glass>
          <Glass><StateView icon={AlertTriangle} tone="gold" title="خطا" text="مشکلی پیش آمد." action={<KButton size="sm" variant="outline">تلاش دوباره</KButton>} /></Glass>
          <Glass><StateView icon={WifiOff} tone="cyan" title="آفلاین" text="اتصال اینترنت را بررسی کن." /></Glass>
          <Glass><StateView icon={Lock} tone="violet" title="نیاز به ورود" text="برای دیدن این بخش وارد شو." /></Glass>
          <Glass><StateView icon={ShieldX} tone="gold" title="دسترسی نداری (۴۰۳)" /></Glass>
          <Glass><StateView icon={Compass} title="پیدا نشد (۴۰۴)" /></Glass>
        </div></section>
      </div>
    </div>
  );
}
