import { useCallback, useEffect, useMemo, useState } from 'react';
import { Save, Send, EyeOff, History, RotateCcw, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { adminCms, type AdminCmsOutputType } from 'zitejs/api';
import { cn } from '@project/components/lib/utils';
import { KButton, Glass, StatusBadge } from '../kit';
import { PageHead, ListSkeleton, ErrorState, fmtDate, Confirm, ResponsiveModal } from './ui';
import { useAdmin, errMsg } from '../../lib/session';
import { BLOCK_KEYS, BLOCK_LABELS, DEFAULTS, blockSchemas, parseBlock, type BlockKey } from '../../lib/cmsSchema';
import { BlockForm, BlockPreview } from './CmsFields';

type Block = AdminCmsOutputType['blocks'][0];
type Version = AdminCmsOutputType['versions'][0];
type Val = Record<string, unknown>;

export default function CmsEditor() {
  const { token } = useAdmin();
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [err, setErr] = useState<string>();
  const [key, setKey] = useState<BlockKey>('hero');
  const [val, setVal] = useState<Val>(DEFAULTS.hero as Val);
  const [busy, setBusy] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [confirmUnpub, setConfirmUnpub] = useState(false);

  const load = useCallback(() => {
    setErr(undefined);
    adminCms({ token, action: 'list' }).then((r) => setBlocks(r.blocks)).catch((e) => setErr(errMsg(e)));
  }, [token]);
  useEffect(load, [load]);

  const current = blocks?.find((b) => b.key === key);
  useEffect(() => {
    if (!blocks) return;
    const b = blocks.find((x) => x.key === key);
    setVal(((parseBlock(key, b?.draft) ?? parseBlock(key, b?.published) ?? DEFAULTS[key]) as Val));
  }, [key, blocks]);

  const check = useMemo(() => blockSchemas[key].safeParse(val), [key, val]);

  const run = async (action: 'saveDraft' | 'publish' | 'unpublish' | 'restore', extra: { content?: string; versionId?: string } = {}) => {
    setBusy(action);
    try {
      const r = await adminCms({ token, action, key, ...extra });
      setBlocks(r.blocks);
      if (action === 'restore') { setVersions(r.versions); toast.success('نسخه در پیش‌نویس بازگردانی شد. برای نمایش در سایت، منتشر کن.'); }
      else toast.success({ saveDraft: 'پیش‌نویس ذخیره شد.', publish: 'منتشر شد و در سایت نمایش داده می‌شود.', unpublish: 'از سایت برداشته شد؛ محتوای پیش‌فرض نمایش داده می‌شود.' }[action]);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  };
  const saveThenPublish = async () => {
    if (!check.success) return;
    setBusy('publish');
    try {
      await adminCms({ token, action: 'saveDraft', key, content: JSON.stringify(check.data) });
      const r = await adminCms({ token, action: 'publish', key });
      setBlocks(r.blocks); toast.success('منتشر شد و در سایت نمایش داده می‌شود.');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  };
  const openVersions = async () => {
    setVersions([]);
    try { setVersions((await adminCms({ token, action: 'versions', key })).versions); } catch (e) { toast.error(errMsg(e)); setVersions(null); }
  };

  if (err) return <><PageHead title="محتوای سایت" /><Glass><ErrorState text={err} onRetry={load} /></Glass></>;
  if (!blocks) return <><PageHead title="محتوای سایت" /><ListSkeleton rows={6} /></>;

  return (
    <div>
      <PageHead title="محتوای سایت" sub="ویرایش بلوک‌های صفحه‌ی اصلی؛ تا وقتی منتشر نکنی، در سایت دیده نمی‌شود." />
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <nav className="-mx-1 flex gap-2 overflow-x-auto pb-1 lg:mx-0 lg:flex-col lg:overflow-visible" aria-label="بلوک‌ها">
          {BLOCK_KEYS.map((k) => {
            const b = blocks.find((x) => x.key === k);
            return (
              <button key={k} onClick={() => setKey(k)} disabled={!!busy} className={cn('glass press flex shrink-0 items-center justify-between gap-2 rounded-2xl px-4 py-3 text-start text-sm', k === key && 'glass-active ring-1 ring-primary/50')}>
                <span className="font-bold">{BLOCK_LABELS[k]}</span>
                {b?.status === 'published' ? <span className={cn('h-2 w-2 rounded-full', b.hasUnpublished ? 'bg-gold' : 'bg-primary')} title={b.hasUnpublished ? 'تغییرات منتشرنشده' : 'منتشرشده'} /> : <span className="h-2 w-2 rounded-full bg-white/20" title="منتشرنشده" />}
              </button>
            );
          })}
        </nav>
        <div className="min-w-0 space-y-4">
          <Glass className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <StatusBadge status={current?.status === 'published' ? 'published' : 'draft'} />
            {current?.hasUnpublished && <span className="rounded-full bg-gold/15 px-3 py-1 text-gold">تغییرات منتشرنشده دارد</span>}
            {!current && <span className="text-muted-foreground">هنوز ذخیره نشده؛ سایت محتوای پیش‌فرض را نشان می‌دهد.</span>}
            {current && <span className="text-muted-foreground">نسخه {current.version.toLocaleString('fa-IR')} · {current.updatedBy} · {fmtDate(current.updatedAt, true)}</span>}
          </Glass>
          <div className="grid gap-4 xl:grid-cols-2">
            <Glass className="p-5"><BlockForm k={key} val={val} onChange={setVal} /></Glass>
            <BlockPreview k={key} val={val} />
          </div>
          {!check.success && <p className="text-sm text-destructive" role="alert">{check.error.issues[0]?.message}</p>}
          <div className="flex flex-wrap gap-2">
            <KButton loading={busy === 'saveDraft'} disabled={!!busy || !check.success} onClick={() => check.success && run('saveDraft', { content: JSON.stringify(check.data) })} variant="outline"><Save className="h-5 w-5" />ذخیره‌ی پیش‌نویس</KButton>
            <KButton loading={busy === 'publish'} disabled={!!busy || !check.success} onClick={saveThenPublish}><Send className="h-5 w-5" />ذخیره و انتشار</KButton>
            {current?.status === 'published' && <KButton variant="outline" disabled={!!busy} onClick={() => setConfirmUnpub(true)}><EyeOff className="h-5 w-5" />لغو انتشار</KButton>}
            <KButton variant="outline" disabled={!!busy} onClick={openVersions}><History className="h-5 w-5" />تاریخچه</KButton>
          </div>
        </div>
      </div>
      <Confirm open={confirmUnpub} onOpenChange={setConfirmUnpub} title="لغو انتشار؟" text="این بلوک از سایت برداشته می‌شود و محتوای پیش‌فرض نمایش داده می‌شود. پیش‌نویس حفظ می‌شود." confirmLabel="لغو انتشار" danger onConfirm={() => { setConfirmUnpub(false); void run('unpublish'); }} />
      <ResponsiveModal open={versions !== null} onOpenChange={(o) => !o && setVersions(null)} title={`تاریخچه‌ی ${BLOCK_LABELS[key]}`}>
        {versions?.length === 0 ? <p className="p-4 text-sm text-muted-foreground"><FileText className="mb-2 h-6 w-6" />هنوز نسخه‌ی منتشرشده‌ای ثبت نشده.</p> : (
          <ul className="space-y-2 p-1">{versions?.map((v) => (
            <li key={v.id} className="glass flex items-center gap-3 rounded-2xl p-3 text-sm">
              <div className="min-w-0 flex-1"><div className="font-bold">نسخه {v.version.toLocaleString('fa-IR')}</div><div className="text-muted-foreground">{v.savedBy} · {fmtDate(v.createdAt, true)}</div></div>
              <KButton size="sm" variant="outline" loading={busy === 'restore'} disabled={!!busy} onClick={() => run('restore', { versionId: v.id })}><RotateCcw className="h-4 w-4" />بازگردانی</KButton>
            </li>
          ))}</ul>
        )}
      </ResponsiveModal>
    </div>
  );
}

