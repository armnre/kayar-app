import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Megaphone, Search, ExternalLink, Trash2, Power } from 'lucide-react';
import { toast } from 'sonner';
import { adminAnnouncements, type AdminAnnouncementsOutputType } from '@/zite/api';
import { DateTimePicker } from '@/ui/ui/date-picker';
import { Switch } from '@/ui/ui/switch';
import { cn } from '@/ui/lib/utils';
import { KButton, Glass, StateView } from '../../components/kit';
import { PageHead, ListSkeleton, ErrorState, fmtDate, ResponsiveModal, Confirm } from '../../components/admin/ui';
import { useAdmin, errMsg } from '../../lib/session';
import { fa } from '../../lib/config';

type Item = AdminAnnouncementsOutputType['items'][0];
const now = () => Date.now();
const phase = (i: Item) => i.status !== 'published' ? 'inactive' : i.endsAt && new Date(i.endsAt).getTime() <= now() ? 'expired' : i.startsAt && new Date(i.startsAt).getTime() > now() ? 'scheduled' : 'live';
const PH: Record<string, { l: string; c: string }> = { live: { l: 'در حال نمایش', c: 'bg-primary/15 text-primary' }, scheduled: { l: 'زمان‌بندی‌شده', c: 'bg-violet/15 text-[hsl(254_100%_78%)]' }, expired: { l: 'منقضی', c: 'bg-gold/15 text-gold' }, inactive: { l: 'غیرفعال', c: 'bg-white/10 text-muted-foreground' } };
const linkOk = (l: string) => !l || /^\/(?!\/)/.test(l) || /^https:\/\/[^\s]+$/.test(l);
const inp = 'mt-1 h-11 w-full rounded-2xl border border-white/10 bg-bg1 px-3 text-sm font-normal outline-none focus:border-primary';

function Form({ item, onSaved }: { item?: Item; onSaved: (all: Item[]) => void }) {
  const { token } = useAdmin();
  const [title, setTitle] = useState(item?.title ?? ''); const [body, setBody] = useState(item?.body ?? ''); const [link, setLink] = useState(item?.link ?? '');
  const [startsAt, setS] = useState<Date | undefined>(item?.startsAt ? new Date(item.startsAt) : undefined); const [endsAt, setE] = useState<Date | undefined>(item?.endsAt ? new Date(item.endsAt) : undefined);
  const [active, setActive] = useState(item?.status === 'published'); const [busy, setBusy] = useState(false);
  const err = !title.trim() ? 'عنوان الزامی است.' : !linkOk(link.trim()) ? 'لینک باید با / (صفحه‌ی داخلی) یا https:// شروع شود.' : startsAt && endsAt && endsAt <= startsAt ? 'پایان باید بعد از شروع باشد.' : active && endsAt && endsAt.getTime() < now() ? 'زمان پایان گذشته؛ اعلان منقضی را نمی‌شود فعال کرد.' : '';
  const save = async () => {
    if (err) return; setBusy(true);
    try { const r = await adminAnnouncements({ token, action: 'save', id: item?.id, data: { title: title.trim(), body: body.trim(), link: link.trim(), startsAt: startsAt?.toISOString() ?? null, endsAt: endsAt?.toISOString() ?? null, status: active ? 'published' : 'draft', audience: 'all' } }); onSaved(r.items); toast.success('ذخیره شد'); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold">عنوان<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={inp} /></label>
      <label className="block text-sm font-bold">متن<textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={3} className={cn(inp, 'h-auto py-2')} /></label>
      <label className="block text-sm font-bold">لینک (اختیاری)<input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/app/morshed یا https://kapoosh.ir/…" className={inp} dir="ltr" /><span className="mt-1 block text-xs font-normal text-muted-foreground">لینک خارجی در تب جدید با برچسب «باز کردن» باز می‌شود.</span></label>
      <div className="grid gap-3 sm:grid-cols-2"><div className="text-sm font-bold">شروع<div className="mt-1"><DateTimePicker value={startsAt} onChange={setS} /></div></div><div className="text-sm font-bold">پایان<div className="mt-1"><DateTimePicker value={endsAt} onChange={setE} /></div></div></div>
      <div className="text-sm text-muted-foreground">مخاطب: همه‌ی مشتریان</div>
      <label className="flex min-h-[48px] items-center justify-between"><span className="font-bold">فعال (منتشر شود)</span><Switch checked={active} onCheckedChange={setActive} /></label>
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3"><div className="mb-1 text-xs text-muted-foreground">پیش‌نمایش در خانه‌ی اپ</div><div className="flex items-center gap-3"><Megaphone className="h-5 w-5 text-primary" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{title || 'عنوان اعلان'}</div>{body && <div className="line-clamp-1 text-xs text-muted-foreground">{body}</div>}</div>{link && <span className="flex items-center gap-1 text-xs font-bold text-primary">{link.startsWith('https') ? <>باز کردن<ExternalLink className="h-3 w-3" /></> : 'مشاهده'}</span>}</div></div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <KButton className="w-full" onClick={save} loading={busy} disabled={!!err}>ذخیره</KButton>
    </div>
  );
}

export function AdminAnnouncements() {
  const { token } = useAdmin();
  const [items, setItems] = useState<Item[] | null>(null); const [err, setErr] = useState<string>();
  const [edit, setEdit] = useState<Item | 'new' | null>(null); const [del, setDel] = useState<Item | null>(null);
  const [q, setQ] = useState(''); const [ph, setPh] = useState('');
  const load = useCallback(() => { setErr(undefined); adminAnnouncements({ token, action: 'list' }).then((r) => setItems(r.items)).catch((e) => setErr(errMsg(e))); }, [token]);
  useEffect(load, [load]);
  const list = useMemo(() => (items ?? []).filter((i) => (!ph || phase(i) === ph) && `${i.title} ${i.body}`.toLowerCase().includes(q.toLowerCase())), [items, q, ph]);
  const toggle = async (i: Item) => { try { const r = await adminAnnouncements({ token, action: 'setStatus', id: i.id, status: i.status === 'published' ? 'draft' : 'published' }); setItems(r.items); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <div>
      <PageHead title="اعلان‌ها" sub="فقط اعلان‌های فعال و داخل بازه‌ی زمانی در خانه‌ی اپ نمایش داده می‌شوند" action={<KButton onClick={() => setEdit('new')}><Plus className="h-5 w-5" />اعلان جدید</KButton>} />
      <div className="mb-4 flex flex-wrap gap-2"><div className="relative min-w-0 flex-1 basis-48"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجو…" className="h-11 w-full rounded-full border border-white/10 bg-bg1 pe-3 ps-9 text-sm outline-none focus:border-primary" /></div>
        <select value={ph} onChange={(e) => setPh(e.target.value)} aria-label="وضعیت" className="h-11 rounded-full border border-white/10 bg-bg1 px-3 text-sm"><option value="">همه</option>{Object.entries(PH).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}</select></div>
      {err ? <Glass><ErrorState text={err} onRetry={load} /></Glass> : !items ? <ListSkeleton /> : !list.length ? <Glass><StateView icon={Megaphone} title={items.length ? 'چیزی پیدا نشد' : 'هنوز اعلانی نیست'} text="اعلان‌ها در خانه‌ی اپ و صفحه‌ی اعلان‌ها نمایش داده می‌شوند." /></Glass> : (
        <ul className="grid gap-2">{list.map((i) => { const p = phase(i); return (
          <li key={i.id} className="glass flex items-center gap-3 rounded-3xl p-3">
            <button onClick={() => setEdit(i)} className="min-w-0 flex-1 text-start"><div className="flex items-center gap-2"><span className="truncate font-bold">{i.title}</span><span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-bold', PH[p].c)}>{PH[p].l}</span></div><div className="truncate text-xs text-muted-foreground">{i.startsAt ? fmtDate(i.startsAt, true) : 'بلافاصله'} ← {i.endsAt ? fmtDate(i.endsAt, true) : 'بدون پایان'}</div></button>
            <button onClick={() => toggle(i)} className={cn('tap grid place-items-center rounded-full', i.status === 'published' ? 'text-primary' : 'text-muted-foreground')} aria-label={i.status === 'published' ? 'غیرفعال کردن' : 'فعال کردن'}><Power className="h-5 w-5" /></button>
            <button onClick={() => setDel(i)} className="tap grid place-items-center rounded-full text-muted-foreground hover:text-destructive" aria-label="حذف"><Trash2 className="h-5 w-5" /></button>
          </li>); })}</ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{items ? `${fa(items.filter((i) => phase(i) === 'live').length)} اعلان در حال نمایش` : ''}</p>
      <ResponsiveModal open={!!edit} onOpenChange={(v) => !v && setEdit(null)} title={edit === 'new' ? 'اعلان جدید' : 'ویرایش اعلان'}>{edit && <Form item={edit === 'new' ? undefined : edit} onSaved={(all) => { setItems(all); setEdit(null); }} />}</ResponsiveModal>
      <Confirm open={!!del} onOpenChange={(v) => !v && setDel(null)} danger title="حذف اعلان؟" confirmLabel="حذف" text="اعلان دیگر نمایش داده نمی‌شود." onConfirm={async () => { if (!del) return; try { const r = await adminAnnouncements({ token, action: 'delete', id: del.id }); setItems(r.items); } catch (e) { toast.error(errMsg(e)); } }} />
    </div>
  );
}
