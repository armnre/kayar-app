import { useCallback, useEffect, useMemo, useState } from 'react';
import { Upload, ImageIcon, Copy, ExternalLink, Trash2, Search, AlertTriangle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useUpload } from 'zitejs/upload';
import { adminMedia, type AdminMediaOutputType } from 'zitejs/api';
import { KButton, Glass, StateView } from '../../components/kit';
import { PageHead, ListSkeleton, ErrorState, fmtDate, ResponsiveModal, Confirm } from '../../components/admin/ui';
import { useAdmin, errMsg } from '../../lib/session';
import { fa } from '../../lib/config';

export type Asset = AdminMediaOutputType['assets'][0];
const MAX = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const kb = (n: number) => (n > 1024 * 1024 ? `${fa((n / 1024 / 1024).toFixed(1))} مگابایت` : `${fa(Math.round(n / 1024))} کیلوبایت`);
/** Branded file URL for copy/share; the canonical URL stays in the database. */
export const publicUrl = (u: string) => {
  const m = u.match(/^https:\/\/(eu-)?uploads\.zite\.com\/(.+)$/);
  return m && !location.hostname.includes('localhost') ? `${location.origin}/api/file/${m[1] ? 'eu' : 'us'}/${m[2]}` : u;
};
const dims = (f: File) => new Promise<{ w: number; h: number }>((res) => { const i = new Image(); i.onload = () => { res({ w: i.naturalWidth, h: i.naturalHeight }); URL.revokeObjectURL(i.src); }; i.onerror = () => res({ w: 0, h: 0 }); i.src = URL.createObjectURL(f); });

export function useMedia() {
  const { token } = useAdmin();
  const [assets, setAssets] = useState<Asset[] | null>(null); const [err, setErr] = useState<string>();
  const load = useCallback(() => { setErr(undefined); adminMedia({ token, action: 'list' }).then((r) => setAssets(r.assets)).catch((e) => setErr(errMsg(e))); }, [token]);
  useEffect(load, [load]);
  return { assets, setAssets, err, load, token };
}

/** Upload: client pre-check → real storage via useUpload → server re-verifies bytes/type/size before registering. */
function UploadForm({ onDone }: { onDone: (a: Asset, all: Asset[]) => void }) {
  const { token } = useAdmin();
  const { upload, isUploading } = useUpload();
  const [file, setFile] = useState<File | null>(null); const [alt, setAlt] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const pick = (f?: File) => { setErr(''); if (!f) return; if (!TYPES.includes(f.type)) return setErr('فقط JPG، PNG، WebP یا GIF.'); if (f.size > MAX) return setErr('حداکثر حجم تصویر ۵ مگابایت است.'); setFile(f); if (!alt) setAlt(f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')); };
  const submit = async () => {
    if (!file || !alt.trim()) return;
    setBusy(true); setErr('');
    try {
      const d = await dims(file);
      const { url } = await upload(file);
      const r = await adminMedia({ token, action: 'register', url, alt: alt.trim(), fileName: file.name, width: d.w, height: d.h });
      if (!r.saved) throw new Error('ثبت انجام نشد.');
      toast.success('تصویر آپلود و ثبت شد'); onDone(r.saved, r.assets); setFile(null); setAlt('');
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-white/15 p-6 text-center text-sm text-muted-foreground">
        {file ? <img src={URL.createObjectURL(file)} alt="" className="mb-2 h-28 rounded-xl object-contain" /> : <Upload className="mb-2 h-8 w-8 text-primary" />}
        {file ? `${file.name} · ${kb(file.size)}` : 'انتخاب تصویر (حداکثر ۵ مگابایت)'}
        <input type="file" accept={TYPES.join(',')} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      <label className="block text-sm font-bold">متن جایگزین (alt)<input value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={200} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-bg1 px-3 font-normal outline-none focus:border-primary" placeholder="توضیح کوتاه تصویر برای نابینایان و سئو" /></label>
      {err && <p className="flex items-center gap-1 text-sm text-destructive"><AlertTriangle className="h-4 w-4" />{err}</p>}
      <KButton className="w-full" onClick={submit} loading={busy || isUploading} disabled={!file || !alt.trim()}><Upload className="h-5 w-5" />آپلود</KButton>
    </div>
  );
}

function Grid({ list, onPick, selected }: { list: Asset[]; onPick: (a: Asset) => void; selected?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {list.map((a) => (
        <button key={a.id} onClick={() => onPick(a)} className={`group relative overflow-hidden rounded-2xl border text-start ${selected === a.id ? 'border-primary ring-2 ring-primary' : 'border-white/10'}`}>
          <img src={a.url} alt={a.alt} loading="lazy" className="aspect-square w-full bg-white/5 object-cover" />
          <div className="p-2"><div className="truncate text-xs font-bold">{a.alt || a.fileName}</div><div className="text-[11px] text-muted-foreground">{a.width ? `${fa(a.width)}×${fa(a.height)} · ` : ''}{kb(a.size)}</div></div>
          {selected === a.id && <span className="absolute end-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span>}
        </button>
      ))}
    </div>
  );
}

/** Modal used by posts / collections to choose an image from the library (or upload one). */
export function MediaPicker({ open, onOpenChange, onSelect, selected }: { open: boolean; onOpenChange: (v: boolean) => void; onSelect: (a: Asset) => void; selected?: string }) {
  const { assets, setAssets, err, load } = useMedia();
  const [q, setQ] = useState('');
  const list = useMemo(() => (assets ?? []).filter((a) => `${a.alt} ${a.fileName}`.toLowerCase().includes(q.toLowerCase())), [assets, q]);
  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} title="انتخاب تصویر" wide>
      <details className="mb-4 rounded-2xl border border-white/10 p-3"><summary className="cursor-pointer font-bold">آپلود تصویر جدید</summary><div className="mt-3"><UploadForm onDone={(a, all) => { setAssets(all); onSelect(a); onOpenChange(false); }} /></div></details>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجو…" className="mb-3 h-11 w-full rounded-full border border-white/10 bg-bg1 px-4 text-sm outline-none focus:border-primary" />
      {err ? <ErrorState text={err} onRetry={load} /> : !assets ? <ListSkeleton /> : list.length ? <Grid list={list} selected={selected} onPick={(a) => { onSelect(a); onOpenChange(false); }} /> : <StateView icon={ImageIcon} title="تصویری نیست" />}
    </ResponsiveModal>
  );
}

function Detail({ a, onClose, onChange }: { a: Asset; onClose: () => void; onChange: (all: Asset[]) => void }) {
  const { token } = useAdmin();
  const [alt, setAlt] = useState(a.alt); const [usage, setUsage] = useState<AdminMediaOutputType['usage'] | null>(null);
  const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { adminMedia({ token, action: 'usage', id: a.id }).then((r) => setUsage(r.usage)).catch(() => setUsage([])); }, [a.id, token]);
  const live = usage?.some((u) => u.live);
  const run = async (fn: () => Promise<AdminMediaOutputType>, ok: string, close = false) => { setBusy(true); try { const r = await fn(); onChange(r.assets); toast.success(ok); if (close) onClose(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } };
  const url = publicUrl(a.url);
  const LABEL: Record<string, string> = { post: 'مطلب', cms: 'بلوک صفحه‌ی اصلی', collection: 'مجموعه', track: 'آهنگ' };
  return (
    <div className="space-y-4">
      <img src={a.url} alt={a.alt} className="max-h-72 w-full rounded-2xl bg-white/5 object-contain" />
      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground"><span>نوع: <b dir="ltr">{a.mime || a.kind}</b></span><span>حجم: {kb(a.size)}</span><span>ابعاد: {a.width ? `${fa(a.width)}×${fa(a.height)}` : '—'}</span><span>آپلود: {a.uploadedBy} · {fmtDate(a.createdAt)}</span></div>
      <div className="flex gap-2"><KButton variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(url); toast.success('آدرس کپی شد'); }}><Copy className="h-4 w-4" />کپی آدرس</KButton><a href={url} target="_blank" rel="noopener noreferrer" className="tap inline-flex items-center gap-1 rounded-full border border-white/10 px-4 text-sm"><ExternalLink className="h-4 w-4" />مشاهده</a></div>
      <label className="block text-sm font-bold">متن جایگزین<input value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={200} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-bg1 px-3 font-normal outline-none focus:border-primary" /></label>
      <KButton className="w-full" disabled={!alt.trim() || alt === a.alt} loading={busy} onClick={() => run(() => adminMedia({ token, action: 'update', id: a.id, alt: alt.trim() }), 'ذخیره شد')}>ذخیره‌ی alt</KButton>
      <div><div className="mb-1 text-sm font-bold">محل‌های استفاده</div>{!usage ? <p className="text-sm text-muted-foreground">در حال بررسی…</p> : usage.length ? <ul className="space-y-1 text-sm">{usage.map((u) => <li key={u.type + u.id} className="flex justify-between"><span>{LABEL[u.type] ?? u.type}: {u.title}</span><span className={u.live ? 'text-primary' : 'text-muted-foreground'}>{u.live ? 'منتشرشده' : 'پیش‌نویس'}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">جایی استفاده نشده.</p>}</div>
      <KButton variant="outline" className="w-full text-destructive" disabled={!usage || live} onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" />{live ? 'در محتوای منتشرشده استفاده شده؛ قابل حذف نیست' : 'حذف'}</KButton>
      <Confirm open={confirm} onOpenChange={setConfirm} danger title="حذف تصویر؟" confirmLabel="حذف" text={usage?.length ? 'این تصویر در پیش‌نویس‌ها استفاده شده و از آن‌ها جدا می‌شود. این کار برگشت‌پذیر نیست.' : 'تصویر از کتابخانه حذف می‌شود.'} onConfirm={() => run(() => adminMedia({ token, action: 'delete', id: a.id, force: true }), 'حذف شد', true)} />
    </div>
  );
}

export function AdminMedia() {
  const { assets, setAssets, err, load } = useMedia();
  const [q, setQ] = useState(''); const [type, setType] = useState(''); const [up, setUp] = useState(false); const [sel, setSel] = useState<Asset | null>(null);
  const list = useMemo(() => (assets ?? []).filter((a) => (!type || a.mime === type) && `${a.alt} ${a.fileName}`.toLowerCase().includes(q.toLowerCase())), [assets, q, type]);
  return (
    <div>
      <PageHead title="کتابخانه‌ی رسانه" sub={assets ? `${fa(assets.length)} فایل · حداکثر ۵ مگابایت برای هر تصویر` : undefined} action={<KButton onClick={() => setUp(true)}><Upload className="h-5 w-5" />آپلود</KButton>} />
      <div className="mb-4 flex flex-wrap gap-2"><div className="relative min-w-0 flex-1 basis-48"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجو در alt یا نام فایل…" className="h-11 w-full rounded-full border border-white/10 bg-bg1 pe-3 ps-9 text-sm outline-none focus:border-primary" /></div>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="نوع" className="h-11 rounded-full border border-white/10 bg-bg1 px-3 text-sm"><option value="">همه‌ی انواع</option>{TYPES.map((t) => <option key={t} value={t}>{t.replace('image/', '').toUpperCase()}</option>)}</select></div>
      {err ? <Glass><ErrorState text={err} onRetry={load} /></Glass> : !assets ? <ListSkeleton /> : list.length ? <Grid list={list} onPick={setSel} /> : <Glass><StateView icon={ImageIcon} title={assets.length ? 'چیزی پیدا نشد' : 'هنوز تصویری آپلود نشده'} action={!assets.length && <KButton onClick={() => setUp(true)}><Upload className="h-5 w-5" />اولین آپلود</KButton>} /></Glass>}
      <ResponsiveModal open={up} onOpenChange={setUp} title="آپلود تصویر"><UploadForm onDone={(_, all) => { setAssets(all); setUp(false); }} /></ResponsiveModal>
      <ResponsiveModal open={!!sel} onOpenChange={(v) => !v && setSel(null)} title="جزئیات رسانه">{sel && <Detail a={sel} onClose={() => setSel(null)} onChange={(all) => { setAssets(all); setSel(all.find((x) => x.id === sel.id) ?? null); }} />}</ResponsiveModal>
    </div>
  );
}
