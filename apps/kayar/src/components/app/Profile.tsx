import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { authSessions, type AuthSessionsOutputType } from 'zitejs/api';
import { KeyRound, LogOut, ChevronLeft, Heart, Smartphone, Monitor, Headphones, Sparkles, ShieldCheck, Calendar, Phone } from 'lucide-react';
import { Skeleton } from '@project/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import { Glass } from '../kit';
import { H } from './HomeMorshed';
import { useSession, errMsg } from '../../lib/session';
import { usePreview } from '../../lib/preview';
import { fa } from '../../lib/config';

const Row = ({ icon: I, t, d, onClick, danger }: { icon: typeof Heart; t: string; d?: string; onClick: () => void; danger?: boolean }) => (
  <button onClick={onClick} className="press flex min-h-[64px] w-full items-center gap-3 px-4 text-start transition-colors hover:bg-white/[.03]">
    <span className={`grid h-10 w-10 place-items-center rounded-2xl ${danger ? 'bg-destructive/15 text-destructive' : 'bg-primary/12 text-primary'}`}><I className="h-5 w-5" /></span>
    <span className="flex-1"><span className={`block font-bold ${danger ? 'text-destructive' : ''}`}>{t}</span>{d && <span className="block text-xs text-muted-foreground">{d}</span>}</span>
    {!danger && <ChevronLeft className="h-5 w-5 text-muted-foreground" />}
  </button>
);

export function Profile() {
  const { member, logout, token } = useSession('app');
  const { favs } = usePreview();
  const nav = useNavigate();
  const [sessions, setSessions] = useState<AuthSessionsOutputType['sessions'] | null>(null);
  const [confirm, setConfirm] = useState<'one' | 'all' | null>(null);
  const load = (revokeId?: string) => token && authSessions({ token, revokeId }).then((r) => { setSessions(r.sessions); if (revokeId) toast.success('دستگاه از حسابت خارج شد'); }).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { void load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  const out = async (all?: boolean) => { await logout(all); nav('/app/login', { replace: true }); };
  const since = member?.createdAt ? new Date(member.createdAt).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long' }) : '—';
  return (
    <div className="pb-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[32px] bg-[radial-gradient(120%_140%_at_100%_0%,hsl(var(--primary)/.35),transparent_55%),radial-gradient(120%_140%_at_0%_100%,hsl(254_90%_60%/.35),transparent_55%)] p-6 ring-1 ring-white/10">
        <div className="flex items-center gap-4">
          <img src="https://images.fillout.com/888646/9une2mcrla/generated-images/qxsRtpeNFRPAMwH5RNmXmY/img_QzUQMloyT66b3uKy.jpg" alt={member?.displayName ?? 'پروفایل'} className="h-20 w-20 shrink-0 rounded-full object-cover shadow-[0_10px_40px_-10px_hsl(var(--primary)/.8)] ring-4 ring-background" />
          <div className="min-w-0"><div className="truncate text-2xl font-black">{member?.displayName}</div><div className="font-latin text-sm text-muted-foreground" dir="ltr">@{member?.username}</div>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary"><ShieldCheck className="h-3.5 w-3.5" />عضو کایار</span></div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          {[{ i: Heart, v: fa(favs.size), l: 'علاقه‌مندی' }, { i: Smartphone, v: fa(sessions?.length ?? 0), l: 'دستگاه فعال' }, { i: Calendar, v: since, l: 'عضویت از' }].map((s) => (
            <div key={s.l} className="rounded-2xl bg-black/20 p-3 backdrop-blur"><s.i className="mx-auto h-4 w-4 text-muted-foreground" /><div className="mt-1 truncate text-sm font-black">{s.v}</div><div className="text-[11px] text-muted-foreground">{s.l}</div></div>
          ))}
        </div>
      </motion.div>

      <H t="دسترسی سریع" />
      <Glass className="divide-y divide-white/5 overflow-hidden p-0">
        <Row icon={Headphones} t="موزیک‌های من" d="مرشد و علاقه‌مندی‌ها" onClick={() => nav('/app/morshed')} />
        <Row icon={Sparkles} t="برنامه‌ی تمرین و تغذیه" d="بدن‌یار" onClick={() => nav('/app/bodyyar')} />
        {member?.phone && <Row icon={Phone} t="شماره‌ی موبایل" d={fa(member.phone)} onClick={() => {}} />}
      </Glass>

      <H t="امنیت" />
      <Glass className="divide-y divide-white/5 overflow-hidden p-0">
        <Row icon={KeyRound} t="تغییر رمز عبور" d="برای امنیت بیشتر، هر چند وقت یک‌بار" onClick={() => nav('/app/change-password')} />
      </Glass>

      <H t="دستگاه‌های فعال" s={sessions && sessions.length > 1 && <button onClick={() => setConfirm('all')} className="text-sm font-bold text-destructive">خروج از همه</button>} />
      <Glass className="divide-y divide-white/5 overflow-hidden p-0">
        {!sessions ? <div className="space-y-2 p-3"><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-12 rounded-xl" /></div> : sessions.map((s) => {
          const mobile = /mobile|android|iphone/i.test(s.userAgent);
          const D = mobile ? Smartphone : Monitor;
          return (
            <div key={s.id} className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5"><D className="h-5 w-5 text-muted-foreground" /></span>
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{mobile ? 'موبایل' : 'کامپیوتر'} · <span className="font-latin text-xs text-muted-foreground" dir="ltr">{(s.userAgent.match(/(Chrome|Safari|Firefox|Edg)\/[\d]+/)?.[0]) ?? 'مرورگر'}</span></div>
                <div className="text-xs text-muted-foreground">{s.current ? <span className="font-bold text-primary">● همین دستگاه</span> : `آخرین فعالیت ${s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleDateString('fa-IR') : '—'}`}</div></div>
              {!s.current && <button onClick={() => load(s.id)} className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold hover:bg-destructive/15 hover:text-destructive">خروج</button>}
            </div>
          );
        })}
      </Glass>

      <Glass className="mt-6 overflow-hidden p-0"><Row icon={LogOut} t="خروج از حساب" danger onClick={() => setConfirm('one')} /></Glass>
      <p className="mt-6 text-center font-latin text-xs text-muted-foreground">Kayar · by Kapoosh</p>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent dir="rtl" className="rounded-3xl">
          <AlertDialogHeader><AlertDialogTitle>{confirm === 'all' ? 'خروج از همه‌ی دستگاه‌ها؟' : 'از حسابت خارج می‌شی؟'}</AlertDialogTitle>
            <AlertDialogDescription>{confirm === 'all' ? 'روی همه‌ی دستگاه‌ها باید دوباره وارد بشی.' : 'برای استفاده دوباره باید با نام کاربری و رمزت وارد بشی.'}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="gap-2"><AlertDialogCancel>انصراف</AlertDialogCancel><AlertDialogAction onClick={() => out(confirm === 'all')} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">خروج</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
