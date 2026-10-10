import { useCallback, useEffect, useState } from 'react';
import { Plus, ListMusic, ImagePlus, Trash2, ArrowRight, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { adminCollections, type AdminCollectionsOutputType, type AdminTracksOutputType } from 'zitejs/api';
import { cn } from '@project/components/lib/utils';
import { KButton, Glass, StateView, Cover } from '../../components/kit';
import { ListSkeleton, ErrorState, ResponsiveModal, Confirm } from '../../components/admin/ui';
import { SortableList } from '../../components/admin/SortableList';
import { MediaPicker } from './Media';
import { Pill, slugify } from './Posts';
import { useAdmin, errMsg } from '../../lib/session';
import { fa } from '../../lib/config';

type Col = AdminCollectionsOutputType['collections'][0];
type Item = AdminCollectionsOutputType['items'][0];
type T = AdminTracksOutputType['tracks'][0];
const inp = 'mt-1 h-11 w-full rounded-2xl border border-white/10 bg-bg1 px-3 text-sm font-normal outline-none focus:border-primary';

function ColForm({ col, onSaved }: { col?: Col; onSaved: (all: Col[]) => void }) {
  const { token } = useAdmin();
  const [f, setF] = useState({ title: col?.title ?? '', slug: col?.slug ?? '', description: col?.description ?? '', coverUrl: col?.coverUrl ?? '', type: (col?.type ?? 'row') as 'row' | 'playlist', placement: (col?.placement ?? 'morshed') as 'home' | 'morshed', status: (col?.status ?? 'draft') as 'draft' | 'published' | 'hidden' });
  const [touched, setTouched] = useState(!!col); const [pick, setPick] = useState(false); const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { const r = await adminCollections({ token, action: 'save', id: col?.id, data: f }); onSaved(r.collections); toast.success('ذخیره شد'); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } };
  const seg = <K extends 'type' | 'placement' | 'status'>(k: K, opts: [Col[K] & string, string][]) => <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${opts.length},1fr)` }}>{opts.map(([v, l]) => <button key={v} onClick={() => setF({ ...f, [k]: v })} className={cn('h-10 rounded-2xl text-sm font-bold', f[k] === v ? 'bg-primary text-primary-foreground' : 'bg-white/5')}>{l}</button>)}</div>;
  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold">عنوان<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value, slug: touched ? f.slug : slugify(e.target.value) })} className={inp} /></label>
      <label className="block text-sm font-bold">نامک<input value={f.slug} onChange={(e) => { setTouched(true); setF({ ...f, slug: slugify(e.target.value) }); }} className={inp} dir="ltr" /></label>
      <label className="block text-sm font-bold">توضیح<textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={500} rows={2} className={cn(inp, 'h-auto py-2')} /></label>
      <div className="flex items-center gap-3">{f.coverUrl && <img src={f.coverUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />}<KButton variant="outline" onClick={() => setPick(true)}><ImagePlus className="h-4 w-4" />کاور از رسانه</KButton>{f.coverUrl && <button onClick={() => setF({ ...f, coverUrl: '' })} className="text-xs text-muted-foreground underline">حذف کاور</button>}</div>
      <div className="text-sm font-bold">نوع</div>{seg('type', [['row', 'ردیف'], ['playlist', 'پلی‌لیست']])}
      <div className="text-sm font-bold">محل نمایش</div>{seg('placement', [['home', 'خانه‌ی اپ'], ['morshed', 'مرشد']])}
      <div className="text-sm font-bold">وضعیت</div>{seg('status', [['draft', 'پیش‌نویس'], ['published', 'منتشر'], ['hidden', 'مخفی']])}
      <KButton className="w-full" loading={busy} disabled={!f.title.trim() || !f.slug} onClick={save}>ذخیره</KButton>
      <MediaPicker open={pick} onOpenChange={setPick} onSelect={(a) => setF({ ...f, coverUrl: a.url })} />
    </div>
  );
}

function Items({ col, tracks, back, onChange }: { col: Col; tracks: T[]; back: () => void; onChange: (all: Col[]) => void }) {
  const { token } = useAdmin();
  const [items, setItems] = useState<Item[] | null>(null); const [add, setAdd] = useState(''); const [preview, setPreview] = useState(false);
  const run = useCallback(async (p: Parameters<typeof adminCollections>[0]) => { try { const r = await adminCollections(p); setItems(r.items); onChange(r.collections); } catch (e) { toast.error(errMsg(e)); } }, [onChange]);
  useEffect(() => { run({ token, action: 'items', id: col.id }); }, [col.id, token, run]);
  const available = tracks.filter((t) => !items?.some((i) => i.trackId === t.id));
  const reorder = useCallback((next: Item[]) => run({ token, action: 'reorderItems', id: col.id, ids: next.map((i) => i.id) }), [run, token, col.id]);
  return (
    <div>
      <button onClick={back} className="tap mb-3 inline-flex items-center gap-1 text-muted-foreground"><ArrowRight className="h-4 w-4" />مجموعه‌ها</button>
      <div className="mb-4 flex flex-wrap items-center gap-3"><h2 className="flex-1 text-xl font-black">{col.title}</h2><Pill s={col.status === 'hidden' ? 'archived' : col.status} />{col.status === 'published' && <KButton variant="outline" size="sm" onClick={() => setPreview(true)}>پیش‌نمایش</KButton>}</div>
      <div className="mb-4 flex gap-2"><select value={add} onChange={(e) => setAdd(e.target.value)} aria-label="افزودن آهنگ" className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-bg1 px-3 text-sm"><option value="">افزودن آهنگ از کتابخانه…</option>{available.map((t) => <option key={t.id} value={t.id}>{t.title} — {t.artist}{t.status !== 'published' ? ' (منتشرنشده)' : ''}</option>)}</select><KButton disabled={!add} onClick={() => { run({ token, action: 'addItem', id: col.id, trackId: add }); setAdd(''); }}><Plus className="h-4 w-4" />افزودن</KButton></div>
      {!items ? <ListSkeleton /> : !items.length ? <Glass><StateView icon={ListMusic} title="این مجموعه خالی است" /></Glass> : (
        <SortableList items={items} onReorder={reorder} render={(i) => <div className="flex items-center gap-3"><Cover hue={200} image={i.coverUrl} className="h-10 w-10 shrink-0 rounded-lg" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{i.title}</div><div className="truncate text-xs text-muted-foreground">{i.artist}{i.status !== 'published' ? ' · در اپ نمایش داده نمی‌شود' : ''}</div></div><button onClick={() => run({ token, action: 'removeItem', id: col.id, itemId: i.id })} className="tap grid place-items-center text-muted-foreground hover:text-destructive" aria-label="حذف از مجموعه"><Trash2 className="h-4 w-4" /></button></div>} />
      )}
      <ResponsiveModal open={preview} onOpenChange={setPreview} title="پیش‌نمایش در اپ">
        {col.coverUrl && <img src={col.coverUrl} alt="" className="mb-3 aspect-video w-full rounded-2xl object-cover" />}
        <div className="font-black">{col.title}</div><p className="text-sm text-muted-foreground">{col.description}</p>
        <ul className="mt-3 space-y-1">{(items ?? []).filter((i) => i.status === 'published').map((i) => <li key={i.id} className="flex items-center gap-2 text-sm"><Cover hue={200} image={i.coverUrl} className="h-8 w-8 rounded-md" />{i.title}</li>)}</ul>
      </ResponsiveModal>
    </div>
  );
}

export function CollectionsPanel({ tracks }: { tracks: T[] }) {
  const { token } = useAdmin();
  const [cols, setCols] = useState<Col[] | null>(null); const [err, setErr] = useState<string>();
  const [edit, setEdit] = useState<Col | 'new' | null>(null); const [open, setOpen] = useState<Col | null>(null); const [del, setDel] = useState<Col | null>(null);
  const load = useCallback(() => { setErr(undefined); adminCollections({ token, action: 'list' }).then((r) => setCols(r.collections)).catch((e) => setErr(errMsg(e))); }, [token]);
  useEffect(load, [load]);
  const reorder = useCallback((next: Col[]) => { adminCollections({ token, action: 'reorder', ids: next.map((c) => c.id) }).then((r) => setCols(r.collections)).catch((e) => toast.error(errMsg(e))); }, [token]);
  if (open) return <Items col={cols?.find((c) => c.id === open.id) ?? open} tracks={tracks} back={() => setOpen(null)} onChange={setCols} />;
  return (
    <div>
      <div className="mb-3 flex justify-end"><KButton onClick={() => setEdit('new')}><Plus className="h-5 w-5" />مجموعه‌ی جدید</KButton></div>
      {err ? <Glass><ErrorState text={err} onRetry={load} /></Glass> : !cols ? <ListSkeleton /> : !cols.length ? <Glass><StateView icon={ListMusic} title="هنوز مجموعه‌ای نیست" text="مجموعه‌ها در خانه‌ی اپ یا مرشد به‌صورت ردیف یا پلی‌لیست نمایش داده می‌شوند." /></Glass> : (
        <SortableList items={cols} onReorder={reorder} render={(c) => (
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(c)} className="flex min-w-0 flex-1 items-center gap-3 text-start">{c.coverUrl ? <img src={c.coverUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5"><ListMusic className="h-5 w-5" /></span>}<div className="min-w-0"><div className="truncate font-bold">{c.title}</div><div className="truncate text-xs text-muted-foreground">{c.placement === 'home' ? 'خانه' : 'مرشد'} · {c.type === 'playlist' ? 'پلی‌لیست' : 'ردیف'} · {fa(c.count)} آهنگ</div></div></button>
            <Pill s={c.status === 'hidden' ? 'archived' : c.status} />
            <button onClick={() => setEdit(c)} className="tap grid place-items-center text-muted-foreground" aria-label="ویرایش"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => setDel(c)} className="tap grid place-items-center text-muted-foreground hover:text-destructive" aria-label="حذف"><Trash2 className="h-4 w-4" /></button>
          </div>
        )} />
      )}
      <ResponsiveModal open={!!edit} onOpenChange={(v) => !v && setEdit(null)} title={edit === 'new' ? 'مجموعه‌ی جدید' : 'ویرایش مجموعه'}>{edit && <ColForm col={edit === 'new' ? undefined : edit} onSaved={(all) => { setCols(all); setEdit(null); }} />}</ResponsiveModal>
      <Confirm open={!!del} onOpenChange={(v) => !v && setDel(null)} danger title="حذف مجموعه؟" confirmLabel="حذف" text="مجموعه از اپ حذف می‌شود؛ آهنگ‌ها در کتابخانه می‌مانند." onConfirm={() => del && adminCollections({ token, action: 'delete', id: del.id }).then((r) => setCols(r.collections)).catch((e) => toast.error(errMsg(e)))} />
    </div>
  );
}
