import ErrorNotice from '../ErrorNotice';
import { useEffect, useState, type FormEvent } from 'react';
import { publicSettings } from 'zitejs/api';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserCog, FileText, Newspaper, Image, Music, Megaphone, Settings, History, Menu, LogOut, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@project/components/ui/sheet';
import { cn } from '@project/components/lib/utils';
import { KayarLogo, KButton, FloatInput, PasswordField } from '../kit';
import { useSession, errMsg } from '../../lib/session';
import { authChangePassword } from 'zitejs/api';

export const adminNav = [
  { to: '/admin', label: 'داشبورد', icon: LayoutDashboard, end: true, perm: 'dashboard.read' },
  { to: '/admin/customers', label: 'مشتریان', icon: Users, perm: 'customers.read' },
  { to: '/admin/staff', label: 'کارکنان', icon: UserCog, perm: 'staff.manage' },
  { to: '/admin/content', label: 'محتوای سایت', icon: FileText, perm: 'content.manage' },
  { to: '/admin/posts', label: 'مطالب', icon: Newspaper, perm: 'content.manage' },
  { to: '/admin/media', label: 'رسانه', icon: Image, perm: 'content.manage' },
  { to: '/admin/morshed', label: 'مرشد', icon: Music, perm: 'morshed.manage' },
  { to: '/admin/announcements', label: 'اعلان‌ها', icon: Megaphone, perm: 'announcements.manage' },
  { to: '/admin/settings', label: 'تنظیمات', icon: Settings, perm: 'settings.manage' },
  { to: '/admin/audit', label: 'گزارش فعالیت', icon: History, perm: 'audit.read' },
];

function NavList({ compact, onNav }: { compact?: boolean; onNav?: () => void }) {
  const { can } = useSession('admin');
  return (
    <nav className="space-y-1" aria-label="منوی ادمین">
      {adminNav.filter((n) => can(n.perm)).map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end} onClick={onNav} title={n.label}
          className={({ isActive }) => cn('tap relative flex items-center gap-3 rounded-2xl px-3 py-2.5 font-bold transition-colors', compact && 'justify-center px-0 xl:justify-start xl:px-3', isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground')}>
          {({ isActive }) => <>{isActive && <span className="glow absolute inset-y-2 start-0 w-1 rounded-full bg-primary" />}<n.icon className="h-5 w-5 shrink-0" /><span className={cn(compact && 'hidden xl:inline')}>{n.label}</span></>}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminShell() {
  const { member, loading, logout } = useSession('admin');
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  if (loading) return <div className="grid min-h-svh place-items-center depth-bg"><KayarLogo className="animate-pulse text-xl" /></div>;
  if (!member) return <Navigate to="/admin/login" replace />;
  return (
    <div className="min-h-svh depth-bg">
      <div className="flex">
        <aside className="glass sticky top-0 hidden h-svh w-20 shrink-0 flex-col rounded-none border-y-0 border-s-0 p-3 sm:flex lg:w-64 xl:w-64">
          <div className="mb-6 flex h-12 items-center justify-center lg:justify-start lg:px-2"><KayarLogo className="text-base" mark /></div>
          <div className="lg:hidden"><NavList compact /></div>
          <div className="hidden lg:block"><NavList /></div>
          <button onClick={async () => { await logout(); nav('/admin/login'); }} className="tap mt-auto flex items-center justify-center gap-3 rounded-2xl px-3 text-muted-foreground hover:text-destructive lg:justify-start"><LogOut className="h-5 w-5" /><span className="hidden lg:inline">خروج</span></button>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="glass sticky top-0 z-30 flex h-16 items-center gap-2 rounded-none border-x-0 border-t-0 px-3 sm:px-6">
            <button className="tap grid place-items-center rounded-full sm:hidden" onClick={() => setOpen(true)} aria-label="منو"><Menu className="h-6 w-6" /></button>
            <div className="hidden text-sm text-muted-foreground sm:block">پنل مدیریت کایار</div>
            <div className="sm:hidden"><KayarLogo className="text-sm" /></div>
            <div className="ms-auto flex items-center gap-1">
              <span className="hidden text-end text-sm leading-5 sm:block"><b className="block">{member.displayName || member.username}</b><span className="text-xs text-muted-foreground">{ROLE_FA[member.role] ?? member.role}</span></span>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-violet font-bold text-white">{(member.displayName || member.username)[0]}</span>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1200px] px-3 py-6 pb-[calc(96px+var(--safe-b))] sm:px-6 min-[1440px]:max-w-[1560px]"><Outlet /></main>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[280px] border-white/10 bg-bg1 pt-[calc(16px+var(--safe-t))]" dir="rtl">
          <SheetTitle className="mb-6"><KayarLogo className="text-base" /></SheetTitle>
          <NavList onNav={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

export const ROLE_FA: Record<string, string> = { superadmin: 'مدیر ارشد', admin: 'مدیر', editor: 'ویراستار', support: 'پشتیبانی', coach: 'مربی', member: 'مشتری' };

function AuthFrame({ children, onSubmit }: { children: React.ReactNode; onSubmit: (e: FormEvent) => void }) {
  return (
    <div className="relative grid min-h-svh place-items-center overflow-hidden px-4 py-8 depth-bg">
      <div className="dot-grid absolute inset-0 opacity-50" />
      <div className="absolute end-[-10%] top-[-10%] h-96 w-96 rounded-full bg-primary/15 blur-[120px]" />
      <form onSubmit={onSubmit} noValidate className="glass relative w-full max-w-md rounded-[32px] p-6 sm:p-8">
        <KayarLogo className="text-lg" /><div className="mt-1 text-sm text-muted-foreground">پنل مدیریت</div>
        {children}
      </form>
    </div>
  );
}
const ErrBox = ({ err }: { err?: string }) => <ErrorNotice err={err} />;

export function AdminLogin() {
  const { login, member } = useSession('admin');
  const nav = useNavigate();
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState<string>(); const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null);
  useEffect(() => { publicSettings({}).then((s) => setReady(s.adminReady)).catch(() => setReady(true)); }, []);
  if (member) return <Navigate to="/admin" replace />;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!u.trim() || !p) { setErr('نام کاربری و رمز را وارد کنید.'); return; }
    setLoading(true); setErr(undefined);
    try { await login(u, p); nav('/admin', { replace: true }); } catch (x) { setErr(errMsg(x)); setLoading(false); }
  };
  return (
    <AuthFrame onSubmit={submit}>
      <h1 className="mt-6 text-2xl font-black">ورود مدیر</h1>
      {ready === false ? (
        <div className="mt-5 rounded-2xl border border-gold/30 bg-gold/10 p-4 text-sm leading-7 text-gold">راه‌اندازی اولیه انجام نشده است. مالک سایت باید رازهای <span className="font-latin" dir="ltr">ZITE_BOOTSTRAP_ADMIN_USERNAME</span> و <span className="font-latin" dir="ltr">ZITE_BOOTSTRAP_ADMIN_PASSWORD</span> را در تنظیمات Zite ثبت کند.</div>
      ) : (
        <div className="mt-5 space-y-4">
          <FloatInput id="au" label="نام کاربری" value={u} onChange={setU} autoComplete="username" dir="ltr" />
          <PasswordField id="ap" label="رمز عبور" value={p} onChange={setP} autoComplete="current-password" />
          <ErrBox err={err} />
          <KButton type="submit" size="lg" className="w-full" loading={loading}>ورود <ArrowLeft className="h-5 w-5" /></KButton>
        </div>
      )}
    </AuthFrame>
  );
}

function AdminChangePassword() {
  const { member, token, refresh, logout } = useSession('admin');
  const [cur, setCur] = useState(''); const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<string>(); const [loading, setLoading] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 8 || pw !== pw2) { setErr(pw !== pw2 ? 'تکرار رمز یکسان نیست.' : 'رمز باید حداقل ۸ نویسه باشد.'); return; }
    setLoading(true); setErr(undefined);
    try { await authChangePassword({ token: token!, current: cur, next: pw }); await refresh(); } catch (x) { setErr(errMsg(x)); } finally { setLoading(false); }
  };
  return (
    <AuthFrame onSubmit={submit}>
      <span className="mt-6 grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary"><ShieldCheck className="h-6 w-6" /></span>
      <h1 className="mt-4 text-2xl font-black">تغییر رمز الزامی است</h1>
      <p className="mt-1 text-sm text-muted-foreground">پیش از ادامه، رمز موقت را عوض کنید.</p>
      <div className="mt-5 space-y-4">
        <PasswordField id="c" label="رمز فعلی" value={cur} onChange={setCur} autoComplete="current-password" />
        <PasswordField id="n" label="رمز جدید" value={pw} onChange={setPw} autoComplete="new-password" meter username={member?.username} />
        <PasswordField id="n2" label="تکرار رمز جدید" value={pw2} onChange={setPw2} autoComplete="new-password" />
        <ErrBox err={err} />
        <KButton type="submit" size="lg" className="w-full" loading={loading}>ذخیره</KButton>
        <button type="button" onClick={() => logout()} className="tap mx-auto flex text-sm text-muted-foreground">خروج</button>
      </div>
    </AuthFrame>
  );
}
