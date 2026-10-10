import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { authChangePassword, publicSettings, type PublicSettingsOutputType } from 'zitejs/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Phone, MessageCircle, ShieldCheck, Check } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@project/components/ui/sheet';
import { KayarLogo, KButton, FloatInput, PasswordField, passwordRules } from '../components/kit';
import { useSession, errMsg } from '../lib/session';

/** Only same-app relative paths under /app are allowed as returnTo (no open redirects). */
const safeReturn = (v: string | null) => (v && /^\/app(\/[\w\-/]*)?$/.test(v) && !v.startsWith('/app/login') ? v : '/app');

const quotes = ['هر قدم امروز، قوی‌ترت می‌کنه.', 'موزیک رو بذار، بقیه‌اش با خودت.', 'برنامه‌ات آماده‌ست؛ فقط شروع کن.'];

function useKeyboardOffset() {
  const [off, setOff] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport; if (!vv) return;
    const on = () => setOff(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener('resize', on); vv.addEventListener('scroll', on);
    return () => { vv.removeEventListener('resize', on); vv.removeEventListener('scroll', on); };
  }, []);
  return off;
}

function ArtPanel() {
  const [q, setQ] = useState(0);
  useEffect(() => { const t = setInterval(() => setQ((x) => (x + 1) % quotes.length), 3800); return () => clearInterval(t); }, []);
  return (
    <div className="relative hidden overflow-hidden lg:block">
      <img src="https://images.fillout.com/888622/bvjezbu9kd/generated-images/m7CVfYZ1XxoDXoHHPmRnjU/img_6hSskSlC6BwCKZ21.jpg" alt="" width={1056} height={1408} className="absolute inset-0 h-full w-full object-cover object-top" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-l from-background/80 to-transparent" />
      <div className="absolute -bottom-20 -start-10 h-72 w-72 -rotate-12 rounded-[40px] bg-primary/80 mix-blend-multiply" />
      <div className="absolute bottom-12 start-12 end-12">
        <AnimatePresence mode="wait"><motion.p key={q} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.5 }} className="text-4xl font-black leading-snug">{quotes[q]}</motion.p></AnimatePresence>
      </div>
    </div>
  );
}

export function Login() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { login, member, loading: sLoading } = useSession('app');
  const [u, setU] = useState(''); const [p, setP] = useState('');
  const [err, setErr] = useState<string>(); const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [settings, setSettings] = useState<PublicSettingsOutputType>();
  useEffect(() => { publicSettings({}).then(setSettings).catch(() => {}); }, []);
  const kb = useKeyboardOffset();
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!u.trim() || !p) { setErr('نام کاربری و رمز عبور را وارد کن.'); return; }
    setErr(undefined); setLoading(true);
    try {
      const m = await login(u, p);
      nav(m.mustChangePassword ? '/app/change-password' : safeReturn(params.get('returnTo')), { replace: true });
    } catch (e) { setErr(errMsg(e)); setLoading(false); }
  };
  if (!sLoading && member && !loading) return <Navigate to={member.mustChangePassword ? '/app/change-password' : '/app'} replace />;

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <ArtPanel />
      <div className="relative flex min-h-svh flex-col">
        <div className="relative h-[40svh] overflow-hidden lg:hidden">
          <img src="https://images.fillout.com/888622/bvjezbu9kd/generated-images/m7CVfYZ1XxoDXoHHPmRnjU/img_6hSskSlC6BwCKZ21.jpg" alt="" width={1056} height={1408} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-[50%_15%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/10" />
          <div className="absolute -bottom-10 -end-10 h-40 w-40 rounded-full bg-primary/30 blur-[60px]" />
          <div className="pt-safe absolute inset-x-0 top-0 p-5"><KayarLogo className="text-lg" /></div>
        </div>
        <div className="relative -mt-16 flex flex-1 flex-col justify-center px-5 pb-[calc(24px+var(--safe-b))] lg:mt-0 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="hidden lg:block"><KayarLogo className="mb-10 text-xl" /></div>
            <h1 className="text-[clamp(1.75rem,6vw,2.5rem)] font-black leading-tight">خوش اومدی! <span className="text-primary">موزیک و برنامه‌ات منتظرته</span></h1>
            <p className="mt-2 text-muted-foreground">با نام کاربری و رمزی که از فروشگاه گرفتی وارد شو.</p>
            <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
              <FloatInput id="username" label="نام کاربری (یا شماره موبایل)" value={u} onChange={setU} autoComplete="username" dir="ltr" autoFocus={!touch} />
              <PasswordField id="password" label="رمز عبور" value={p} onChange={setP} autoComplete="current-password" />
              {err && <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{err}</div>}
              <div className="sticky z-10 pt-1 transition-[bottom]" style={{ bottom: kb ? kb + 8 : 0 }}>
                <KButton type="submit" size="lg" loading={loading} className="w-full">ورود <ArrowLeft className="h-5 w-5" /></KButton>
              </div>
            </form>
            <button onClick={() => setForgot(true)} className="tap mx-auto mt-3 flex items-center text-[15px] text-muted-foreground hover:text-foreground">رمز را فراموش کردی؟</button>
          </div>
        </div>
      </div>
      <Sheet open={forgot} onOpenChange={setForgot}>
        <SheetContent side="bottom" dir="rtl" className="mx-auto max-w-lg rounded-t-[32px] border-white/10 bg-bg1 pb-[calc(24px+var(--safe-b))]">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/15" />
          <SheetTitle className="text-xl font-extrabold">بازیابی رمز</SheetTitle>
          <SheetDescription className="mt-2 text-base leading-8 text-muted-foreground">برای بازیابی با پشتیبانی فروشگاه کاپوش تماس بگیر.</SheetDescription>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <KButton variant="outline" disabled={!settings?.supportPhone} onClick={() => { window.location.href = `tel:${settings!.supportPhone}`; }}><Phone className="h-5 w-5" />تماس</KButton>
            <KButton disabled={!settings?.supportWhatsapp} onClick={() => window.open(settings!.supportWhatsapp, '_blank', 'noopener')}><MessageCircle className="h-5 w-5" />واتس‌اپ</KButton>
            {settings && !settings.supportPhone && !settings.supportWhatsapp && <p className="col-span-2 text-center text-sm text-muted-foreground">اطلاعات تماس هنوز در تنظیمات ثبت نشده است.</p>}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function ChangePassword() {
  const nav = useNavigate();
  const { member, token, loading: sLoading, refresh } = useSession('app');
  const [cur, setCur] = useState(''); const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [done, setDone] = useState(false); const [loading, setLoading] = useState(false); const [err, setErr] = useState<string>();
  const valid = cur && pw !== cur && passwordRules(pw, member?.username).every((r) => r.ok) && pw === pw2;
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (!valid || !token) return;
    setLoading(true); setErr(undefined);
    try {
      await authChangePassword({ token, current: cur, next: pw });
      await refresh();
      setDone(true); setTimeout(() => nav('/app', { replace: true }), 1400);
    } catch (e) { setErr(errMsg(e)); } finally { setLoading(false); }
  };
  if (!sLoading && !member) return <Navigate to="/app/login" replace />;
  return (
    <div className="relative grid min-h-svh place-items-center overflow-hidden px-5 py-[calc(24px+var(--safe-t))] depth-bg">
      <div className="absolute -top-20 end-0 h-80 w-80 rounded-full bg-primary/15 blur-[120px]" />
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="ok" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
            <div className="glow mx-auto grid h-24 w-24 place-items-center rounded-full bg-primary"><motion.span initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}><Check className="h-12 w-12 text-primary-foreground" strokeWidth={3} /></motion.span></div>
            <h1 className="mt-6 text-2xl font-black">رمزت عوض شد!</h1><p className="mt-1 text-muted-foreground">بریم سراغ تمرین…</p>
          </motion.div>
        ) : (
          <motion.form key="f" onSubmit={submit} className="glass w-full max-w-md rounded-[32px] p-6 sm:p-8" noValidate>
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary"><ShieldCheck className="h-7 w-7" /></span>
            <h1 className="mt-5 text-2xl font-black">یک رمز جدید بساز</h1>
            <p className="mt-1 text-muted-foreground">برای امنیت حسابت، قبل از شروع رمز اولیه را عوض کن.</p>
            <div className="mt-6 space-y-4">
              <PasswordField id="cur" label="رمز فعلی" value={cur} onChange={setCur} autoComplete="current-password" />
              <PasswordField id="new" label="رمز جدید" value={pw} onChange={setPw} autoComplete="new-password" meter username={member?.username} />
              <PasswordField id="new2" label="تکرار رمز جدید" value={pw2} onChange={setPw2} autoComplete="new-password" error={pw2 && pw !== pw2 ? 'تکرار رمز یکسان نیست.' : undefined} />
            </div>
            {pw && pw === cur && <p className="mt-3 text-sm text-destructive">رمز جدید نباید با رمز فعلی یکی باشد.</p>}
            {err && <div role="alert" className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{err}</div>}
            <KButton type="submit" size="lg" className="mt-6 w-full" disabled={!valid} loading={loading}>ذخیره و ادامه</KButton>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
