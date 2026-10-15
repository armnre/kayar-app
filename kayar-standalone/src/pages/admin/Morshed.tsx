import { useCallback, useEffect, useState } from 'react';
import { Music, Search, Plus, Check, ExternalLink, Star, Pencil, Trash2, Radio, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { adminTracks, type AdminTracksOutputType } from '@/zite/api';
import { Switch } from '@/ui/ui/switch';
import { cn } from '@/ui/lib/utils';
import { KButton, Glass, StateView, Cover } from '../../components/kit';
import { PageHead, ListSkeleton, ErrorState, ResponsiveModal, Confirm } from '../../components/admin/ui';
import { SortableList } from '../../components/admin/SortableList';
import { CollectionsPanel } from './Collections';
import { Pill } from './Posts';
import { useAdmin, errMsg } from '../../lib/session';
import { fa } from '../../lib/config';

type T = AdminTracksOutputType['tracks'][0];
type J = AdminTracksOutputType['jamendo'][0];
type St = AdminTracksOutputType['status'];
const dur = (s: number) => `${fa(Math.floor(s / 60))}:${fa(String(Math.floor(s % 60)).padStart(2, '0'))}`;
const inp = 'mt-1 h-11 w-full rounded-2xl border border-white/10 bg-bg1 px-3 text-sm font-normal outline-none focus:border-primary';
const CATS = ['شروع قدرتی', 'کاردیو', 'ریکاوری', 'تمرکز', 'انرژی'];

function EditTrack({ t, onSaved }: { t: T; onSaved: (all: T[]) => void }) {
  const { token } = useAdmin();
  const [f, setF] = useState({ title: t.title, artist: t.artist, album: t.album, rights: t.rights, categories: t.categories, tags: t.tags.join('، '), featured: t.featured, status: t.status as 'draft' | 'published' | 'hidden' });
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { const r = await adminTracks({ token, action: 'update', id: t.id, patch: { ...f, tags: f.tags.split(/[,،]/).map((x) => x.trim()).filter(Boolean) } }); onSaved(r.tracks); toast.success('ذخیره شد'); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3"><Cover hue={200} image={t.coverUrl} className="h-16 w-16 rounded-xl" /><div className="min-w-0 text-sm text-muted-foreground"><div>منبع: {t.source === 'jamendo' ? `Jamendo #${t.sourceId}` : t.source}</div><div>مدت: {dur(t.duration)}</div>{t.audioUrl && <audio src={t.audioUrl} controls preload="none" className="mt-1 h-8 w-full" />}</div></div>
      <label className="block text-sm font-bold">عنوان<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inp} /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-bold">هنرمند<input value={f.artist} onChange={(e) => setF({ ...f, artist: e.target.value })} className={inp} /></label><label className="block text-sm font-bold">آلبوم<input value={f.album} onChange={(e) => setF({ ...f, album: e.target.value })} className={inp} /></label></div>
      <div className="text-sm font-bold">دسته‌ها<div className="mt-1 flex flex-wrap gap-2">{CATS.map((c) => <button key={c} onClick={() => setF({ ...f, categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c] })} className={cn('rounded-full px-3 py-1.5 text-xs font-bold', f.categories.includes(c) ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground')}>{c}</button>)}</div></div>
      <label className="block text-sm font-bold">تگ‌ها<input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} className={inp} placeholder="با کاما جدا کن" /></label>
      <label className="block text-sm font-bold">اطلاعات حقوق و مجوز<textarea value={f.rights} onChange={(e) => setF({ ...f, rights: e.target.value })} rows={3} className={cn(inp, 'h-auto py-2')} /></label>
      <div className="flex flex-wrap gap-3 text-xs">{t.licenseUrl && <a href={t.licenseUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline">لینک مجوز<ExternalLink className="h-3 w-3" /></a>}{t.shareUrl && <a href={t.shareUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline">صفحه‌ی اصلی آهنگ<ExternalLink className="h-3 w-3" /></a>}</div>
      <label className="flex min-h-[44px] items-center justify-between"><span className="font-bold">پیشنهاد ویژه</span><Switch checked={f.featured} onCheckedChange={(v) => setF({ ...f, featured: v })} /></label>
      <div className="grid grid-cols-3 gap-2">{(['draft', 'published', 'hidden'] as const).map((s) => <button key={s} onClick={() => setF({ ...f, status: s })} className={cn('h-11 rounded-2xl text-sm font-bold', f.status === s ? 'bg-primary text-primary-foreground' : 'bg-white/5')}>{{ draft: 'پیش‌نویس', published: 'منتشر', hidden: 'مخفی' }[s]}</button>)}</div>
      <KButton className="w-full" loading={busy} disabled={!f.title.trim()} onClick={save}>ذخیره</KButton>
    </div>
  );
}

function LibraryTab({ tracks, setTracks }: { tracks: T[]; setTracks: (t: T[]) => void }) {
  const { token } = useAdmin();
  const [q, setQ] = useState(''); const [st, setSt] = useState(''); const [edit, setEdit] = useState<T | null>(null); const [del, setDel] = useState<T | null>(null);
  const filtered = tracks.filter((t) => (!st || t.status === st) && `${t.title} ${t.artist}`.toLowerCase().includes(q.toLowerCase()));
  const canSort = !q && !st;
  const reorder = useCallback((next: T[]) => { adminTracks({ token, action: 'reorder', ids: next.map((t) => t.id) }).then((r) => setTracks(r.tracks)).catch((e) => toast.error(errMsg(e))); }, [token, setTracks]);
  const row = (t: T) => <button onClick={() => setEdit(t)} className="flex w-full items-center gap-3 text-start"><Cover hue={200} image={t.coverUrl} className="h-11 w-11 shrink-0 rounded-xl" /><div className="min-w-0 flex-1"><div className="flex items-center gap-1 truncate font-bold">{t.featured && <Star className="h-3.5 w-3.5 shrink-0 fill-gold text-gold" />}{t.title}</div><div className="truncate text-xs text-muted-foreground">{t.artist} · {t.source} · {dur(t.duration)}</div></div><Pill s={t.status === 'hidden' ? 'archived' : t.status} /></button>;
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجو…" className="h-11 min-w-0 flex-1 basis-40 rounded-full border border-white/10 bg-bg1 px-4 text-sm outline-none focus:border-primary" /><select value={st} onChange={(e) => setSt(e.target.value)} aria-label="وضعیت" className="h-11 rounded-full border border-white/10 bg-bg1 px-3 text-sm"><option value="">همه</option><option value="published">منتشر</option><option value="draft">پیش‌نویس</option><option value="hidden">مخفی</option></select></div>
      {!tracks.length ? <Glass><StateView icon={Music} title="کتابخانه خالی است" text="از تب «جست‌وجوی Jamendo» آهنگ اضافه کن." /></Glass>
        : canSort ? <><p className="mb-2 text-xs text-muted-foreground">برای تغییر ترتیب نمایش، بکش یا از فلش‌ها استفاده کن.</p><SortableList items={tracks} onReorder={reorder} render={(t) => <div className="flex items-center gap-2">{row(t)}<button onClick={() => setDel(t)} className="tap grid place-items-center text-muted-foreground hover:text-destructive" aria-label="حذف"><Trash2 className="h-4 w-4" /></button></div>} /></>
        : <ul className="space-y-2">{filtered.map((t) => <li key={t.id} className="glass flex items-center gap-2 rounded-2xl p-2">{row(t)}<Pencil className="h-4 w-4 text-muted-foreground" /></li>)}</ul>}
      <ResponsiveModal open={!!edit} onOpenChange={(v) => !v && setEdit(null)} title="ویرایش آهنگ">{edit && <EditTrack t={edit} onSaved={(all) => { setTracks(all); setEdit(null); }} />}</ResponsiveModal>
      <Confirm open={!!del} onOpenChange={(v) => !v && setDel(null)} danger title="حذف آهنگ؟" confirmLabel="حذف" text="آهنگ از کتابخانه و همه‌ی مجموعه‌ها حذف می‌شود." onConfirm={() => del && adminTracks({ token, action: 'delete', id: del.id }).then((r) => { setTracks(r.tracks); toast.success('حذف شد'); }).catch((e) => toast.error(errMsg(e)))} />
    </>
  );
}

function JamendoTab({ status, onAdded }: { status: St; onAdded: (all: T[]) => void }) {
  const { token } = useAdmin();
  const [q, setQ] = useState(''); const [tags, setTags] = useState(''); const [order, setOrder] = useState<'relevance' | 'popularity_month' | 'releasedate_desc'>('popularity_month');
  const [page, setPage] = useState(1); const [res, setRes] = useState<{ list: J[]; hasMore: boolean } | null>(null); const [err, setErr] = useState<string>(); const [busy, setBusy] = useState(false); const [adding, setAdding] = useState('');
  const search = async (p = 1) => { setBusy(true); setErr(undefined); try { const r = await adminTracks({ token, action: 'jamendoSearch', q: q || undefined, tags: tags || undefined, order, page: p }); setRes({ list: p === 1 ? r.jamendo : [...(res?.list ?? []), ...r.jamendo], hasMore: r.hasMore }); setPage(p); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); } };
  const add = async (j: J) => { setAdding(j.id); try { const r = await adminTracks({ token, action: 'addJamendo', jamendoId: j.id }); onAdded(r.tracks); setRes((x) => x && { ...x, list: x.list.map((y) => (y.id === j.id ? { ...y, added: true } : y)) }); toast.success('به کتابخانه اضافه شد (پیش‌نویس)'); } catch (e) { toast.error(errMsg(e)); } finally { setAdding(''); } };
  if (!status.configured) return <Glass><StateView icon={AlertTriangle} tone="gold" title="Jamendo تنظیم نشده (Blocked)" text="راز ZITE_JAMENDO_CLIENT_ID در تنظیمات Zite ثبت نشده است." /></Glass>;
  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); search(1); }} className="mb-3 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام آهنگ یا هنرمند" className="h-11 min-w-0 flex-1 basis-40 rounded-full border border-white/10 bg-bg1 px-4 text-sm outline-none focus:border-primary" />
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="تگ (مثلاً electronic+rock)" dir="ltr" className="h-11 w-48 rounded-full border border-white/10 bg-bg1 px-4 text-sm outline-none focus:border-primary" />
        <select value={order} onChange={(e) => setOrder(e.target.value as typeof order)} aria-label="ترتیب" className="h-11 rounded-full border border-white/10 bg-bg1 px-3 text-sm"><option value="popularity_month">محبوب ماه</option><option value="relevance">مرتبط‌ترین</option><option value="releasedate_desc">جدیدترین</option></select>
        <KButton type="submit" loading={busy}><Search className="h-4 w-4" />جست‌وجو</KButton>
      </form>
      {err ? <Glass><ErrorState text={err} onRetry={() => search(page)} /></Glass> : !res ? <p className="text-sm text-muted-foreground">برای شروع جست‌وجو کن.</p> : !res.list.length ? <Glass><StateView icon={Search} title="نتیجه‌ای نبود" /></Glass> : (
        <ul className="space-y-2">{res.list.map((j) => (
          <li key={j.id} className="glass flex items-center gap-3 rounded-2xl p-2">
            <Cover hue={200} image={j.image} className="h-12 w-12 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1"><div className="truncate font-bold">{j.title}</div><div className="truncate text-xs text-muted-foreground">{j.artist}{j.album ? ` · ${j.album}` : ''} · {dur(j.duration)}</div>
              <div className="flex flex-wrap gap-2 text-[11px]">{j.licenseUrl && <a href={j.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">{j.license || 'مجوز'}</a>}{j.shareUrl && <a href={j.shareUrl} target="_blank" rel="noopener noreferrer" className="underline">لینک اصلی</a>}</div>
              <audio src={j.audio} controls preload="none" className="mt-1 h-8 w-full max-w-xs" /></div>
            {j.added ? <span className="flex items-center gap-1 text-xs text-primary"><Check className="h-4 w-4" />در کتابخانه</span> : <KButton size="sm" loading={adding === j.id} onClick={() => add(j)}><Plus className="h-4 w-4" />افزودن</KButton>}
          </li>
        ))}</ul>
      )}
      {res?.hasMore && <div className="mt-3 text-center"><KButton variant="outline" loading={busy} onClick={() => search(page + 1)}>بیشتر</KButton></div>}
    </>
  );
}

export function AdminMorshed() {
  const { token, can } = useAdmin();
  const [tab, setTab] = useState<'library' | 'jamendo' | 'collections'>('library');
  const [d, setD] = useState<{ tracks: T[]; status: St } | null>(null); const [err, setErr] = useState<string>();
  const load = useCallback(() => { setErr(undefined); adminTracks({ token, action: 'list' }).then((r) => setD({ tracks: r.tracks, status: r.status })).catch((e) => setErr(errMsg(e))); }, [token]);
  useEffect(load, [load]);
  const setTracks = useCallback((tracks: T[]) => setD((x) => x && { ...x, tracks }), []);
  return (
    <div>
      <PageHead title="مرشد" sub="کتابخانه‌ی مدیریت‌شده، جست‌وجوی Jamendo و مجموعه‌ها" />
      {d && <Glass className="mb-4 flex flex-wrap items-center gap-3 p-3 text-sm"><Radio className={cn('h-5 w-5', d.status.available ? 'text-primary' : 'text-muted-foreground')} /><span className="flex-1">منبع زنده‌ی Jamendo برای کاربران: <b>{d.status.available ? 'فعال' : d.status.reason === 'disabled' ? 'غیرفعال توسط مدیر' : 'Blocked — کلید تنظیم نشده'}</b></span>{can('settings.manage') && <a href="/admin/settings" className="text-primary underline">تغییر در تنظیمات</a>}</Glass>}
      <div className="mb-4 flex gap-2 overflow-x-auto" role="tablist">{([['library', 'کتابخانه'], ['jamendo', 'جست‌وجوی Jamendo'], ['collections', 'مجموعه‌ها']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn('tap shrink-0 rounded-full px-5 text-sm font-bold', tab === k ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground')}>{l}</button>)}</div>
      {err ? <Glass><ErrorState text={err} onRetry={load} /></Glass> : !d ? <ListSkeleton /> : tab === 'library' ? <LibraryTab tracks={d.tracks} setTracks={setTracks} /> : tab === 'jamendo' ? <JamendoTab status={d.status} onAdded={setTracks} /> : <CollectionsPanel tracks={d.tracks} />}
    </div>
  );
}
