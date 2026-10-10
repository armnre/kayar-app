import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { appNotifications, type AppNotificationsOutputType } from 'zitejs/api';
import { BellOff, Megaphone, RefreshCw, ArrowLeft, CheckCheck } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import { Skeleton } from '@project/components/ui/skeleton';
import { StateView } from '../kit';
import { useSession, errMsg } from '../../lib/session';

const SEEN = 'kayar.seenNotifs';
const ago = (iso: string | null) => {
  if (!iso) return '';
  try { return new Intl.RelativeTimeFormat('fa', { numeric: 'auto' }).format(-Math.round((Date.now() - new Date(iso).getTime()) / 86400000), 'day'); } catch { return ''; }
};

export function Notifications() {
  const { token } = useSession('app');
  const [items, setItems] = useState<AppNotificationsOutputType['items'] | null>(null);
  const [err, setErr] = useState<string>();
  const [seen, setSeen] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem(SEEN) || '[]')); } catch { return new Set(); } });
  const load = () => { if (!token) return; setErr(undefined); setItems(null); appNotifications({ token }).then((r) => setItems(r.items)).catch((e) => setErr(errMsg(e))); };
  useEffect(load, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  const markAll = () => { const s = new Set([...seen, ...(items ?? []).map((i) => i.id)]); setSeen(s); localStorage.setItem(SEEN, JSON.stringify([...s])); };
  const unread = (items ?? []).filter((i) => !seen.has(i.id)).length;
  return (
    <div className="pb-6">
      <div className="flex items-end justify-between">
        <div><p className="text-sm font-bold text-primary">اعلان‌ها</p><h1 className="text-[clamp(1.8rem,7vw,2.5rem)] font-black">تازه‌ها</h1></div>
        {unread > 0 && <button onClick={markAll} className="tap flex items-center gap-1.5 rounded-full bg-card px-3 text-xs font-bold text-muted-foreground"><CheckCheck className="h-4 w-4" />همه خوانده شد</button>}
      </div>
      <div className="mt-6">
        {err ? <StateView icon={RefreshCw} title="اعلان‌ها بارگذاری نشد" text={err} action={<button onClick={load} className="tap rounded-full bg-primary px-5 font-bold text-primary-foreground">تلاش دوباره</button>} />
          : !items ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-3xl" />)}</div>
          : !items.length ? <StateView icon={BellOff} title="فعلاً اعلانی نداری" text="هر خبر یا پیام تازه‌ای از کایار اینجا نشون داده می‌شه." />
          : <ul className="space-y-3">{items.map((n, i) => { const isNew = !seen.has(n.id); return (
            <motion.li key={n.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={cn('relative flex gap-3 rounded-3xl border bg-card p-4', isNew ? 'border-primary/40' : 'border-border')}>
              <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', isNew ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground')}><Megaphone className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="font-black">{n.title}</span>{isNew && <span className="h-2 w-2 rounded-full bg-primary" />}</div>
                {n.body && <p className="mt-1 whitespace-pre-line text-sm leading-7 text-muted-foreground">{n.body}</p>}
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span>{ago(n.at)}</span>
                  {n.link && <a href={n.link} target={n.link.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="flex items-center gap-1 font-bold text-primary">مشاهده <ArrowLeft className="h-3.5 w-3.5" /></a>}</div>
              </div>
            </motion.li>); })}</ul>}
      </div>
    </div>
  );
}
