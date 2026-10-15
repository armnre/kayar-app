import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, ImagePlus, Eye, Trash2, ExternalLink, ArrowRight, Search, Newspaper, X } from 'lucide-react';
import { toast } from 'sonner';
import { adminPosts, type AdminPostsOutputType } from '@/zite/api';
import { MarkdownEditor } from '@/ui/markdown-editor';
import { Markdown } from '@/ui/markdown';
import { DateTimePicker } from '@/ui/ui/date-picker';
import { cn } from '@/ui/lib/utils';
import { KButton, Glass, StateView } from '../../components/kit';
import { PageHead, ListSkeleton, ErrorState, fmtDate, ResponsiveModal, Confirm } from '../../components/admin/ui';
import { MediaPicker } from './Media';
import { useAdmin, errMsg } from '../../lib/session';
import { fa } from '../../lib/config';

type Post = AdminPostsOutputType['posts'][0];
type Status = 'draft' | 'published' | 'archived';
const ST: Record<string, { l: string; c: string }> = { draft: { l: 'پیش‌نویس', c: 'bg-white/10 text-muted-foreground' }, published: { l: 'منتشرشده', c: 'bg-primary/15 text-primary' }, archived: { l: 'بایگانی', c: 'bg-gold/15 text-gold' }, scheduled: { l: 'زمان‌بندی‌شده', c: 'bg-violet/15 text-[hsl(254_100%_78%)]' } };
const stateOf = (p: Post) => (p.status === 'published' && p.publishedAt && new Date(p.publishedAt).getTime() > Date.now() ? 'scheduled' : p.status);
export const Pill = ({ s }: { s: string }) => <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', ST[s]?.c ?? ST.draft.c)}>{ST[s]?.l ?? s}</span>;
export const slugify = (s: string) => s.trim().toLowerCase().replace(/[\u200c\s_]+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
const SLUG_RE = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

type Draft = { title: string; slug: string; slugTouched: boolean; excerpt: string; body: string; coverMediaId: string; coverUrl: string; tags: string; status: Status; publishedAt: Date | undefined; seoTitle: string; seoDescription: string };
const fromPost = (p?: Post): Draft => ({ title: p?.title ?? '', slug: p?.slug ?? '', slugTouched: !!p, excerpt: p?.excerpt ?? '', body: p?.body ?? '', coverMediaId: p?.coverMediaId ?? '', coverUrl: p?.coverUrl ?? '', tags: p?.tags.join('، ') ?? '', status: (p?.status as Status) ?? 'draft', publishedAt: p?.publishedAt ? new Date(p.publishedAt) : undefined, seoTitle: p?.seoTitle ?? '', seoDescription: p?.seoDescription ?? '' });

function problems(d: Draft) {
  const e: string[] = [];
  if (!d.title.trim()) e.push('عنوان الزامی است.');
  if (!SLUG_RE.test(d.slug)) e.push('نامک فقط حروف، عدد و خط تیره.');
  if (d.status === 'published') { if (d.body.trim().length < 20) e.push('متن حداقل ۲۰ نویسه.'); if (!d.excerpt.trim()) e.push('خلاصه برای انتشار لازم است.'); }
  return e;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block text-sm font-bold">{label}{children}{hint && <span className="mt-1 block text-xs font-normal text-muted-foreground">{hint}</span>}</label>;
}
const inp = 'mt-1 h-11 w-full rounded-2xl border border-white/10 bg-bg1 px-3 text-sm font-normal outline-none focus:border-primary';

function Editor({ post, onBack, onSaved, onDelete }: { post?: Post; onBack: () => void; onSaved: (p: Post, all: Post[]) => void; onDelete: () => void }) {
  const { token } = useAdmin();
  const [d, setD] = useState<Draft>(() => fromPost(post));
  const [busy, setBusy] = useState(false); const [pick, setPick] = useState(false); const [preview, setPreview] = useState(false); const [del, setDel] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v, ...(k === 'title' && !x.slugTouched ? { slug: slugify(String(v)) } : {}) }));
  const errs = problems(d);
  const save = async (status: Status) => {
    const next = { ...d, status }; const e = problems(next);
    if (e.length) { toast.error(e[0]); return; }
    setBusy(true);
    try {
      const r = await adminPosts({ token, action: 'save', id: post?.id, post: { title: next.title, slug: next.slug, excerpt: next.excerpt, body: next.body, coverMediaId: next.coverMediaId, tags: next.tags.split(/[,،]/).map((t) => t.trim()).filter(Boolean), status, publishedAt: next.publishedAt?.toISOString() ?? null, seoTitle: next.seoTitle, seoDescription: next.seoDescription } });
      if (r.saved) { onSaved(r.saved, r.posts); setD(fromPost(r.saved)); }
      toast.success(status === 'published' ? 'منتشر شد' : status === 'archived' ? 'بایگانی شد' : 'ذخیره شد');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const live = post && stateOf(post) === 'published';
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <button onClick={onBack} className="tap inline-flex items-center gap-1 text-muted-foreground"><ArrowRight className="h-4 w-4" />مطالب</button>
        <div className="flex flex-wrap gap-2">
          {live && <a href={`/blog/${post.slug}`} target="_blank" rel="noopener" className="tap inline-flex items-center gap-1 rounded-full border border-white/10 px-4 text-sm"><ExternalLink className="h-4 w-4" />مشاهده</a>}
          <KButton variant="outline" onClick={() => setPreview(true)}><Eye className="h-4 w-4" />پیش‌نمایش</KButton>
          <KButton variant="outline" loading={busy} onClick={() => save(d.status === 'archived' ? 'archived' : 'draft')}>{d.status === 'published' ? 'لغو انتشار و ذخیره' : 'ذخیره پیش‌نویس'}</KButton>
          <KButton loading={busy} onClick={() => save('published')}>{post?.status === 'published' ? 'به‌روزرسانی' : 'انتشار'}</KButton>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Glass className="space-y-4 p-4">
          <input value={d.title} onChange={(e) => set('title', e.target.value)} maxLength={160} placeholder="عنوان مطلب" aria-label="عنوان" className="h-14 w-full bg-transparent text-2xl font-black outline-none" />
          <Field label="خلاصه" hint={`${fa(d.excerpt.length)}/۳۰۰`}><textarea value={d.excerpt} onChange={(e) => set('excerpt', e.target.value.slice(0, 300))} rows={2} className={cn(inp, 'h-auto py-2')} /></Field>
          <MarkdownEditor content={d.body} onChange={(v) => set('body', v)} className="min-h-[360px] rounded-2xl border border-white/10" />
        </Glass>
        <div className="space-y-4">
          <Glass className="space-y-3 p-4">
            <div className="flex items-center justify-between font-bold">وضعیت {post ? <Pill s={stateOf(post)} /> : <Pill s="draft" />}</div>
            <Field label="نامک (slug)" hint={`/blog/${d.slug || '…'}`}><input value={d.slug} onChange={(e) => setD((x) => ({ ...x, slug: slugify(e.target.value), slugTouched: true }))} className={inp} dir="ltr" /></Field>
            <Field label="زمان انتشار" hint="خالی = همین الان. زمان آینده = زمان‌بندی."><div className="mt-1"><DateTimePicker value={d.publishedAt} onChange={(v) => set('publishedAt', v)} /></div></Field>
            <Field label="تگ‌ها" hint="با کاما جدا کن"><input value={d.tags} onChange={(e) => set('tags', e.target.value)} className={inp} /></Field>
            {post && <div className="text-xs text-muted-foreground">نویسنده: {post.author} · ساخت {fmtDate(post.createdAt)} · ویرایش {fmtDate(post.updatedAt, true)}</div>}
          </Glass>
          <Glass className="space-y-3 p-4">
            <div className="font-bold">تصویر کاور</div>
            {d.coverUrl ? <div className="relative"><img src={d.coverUrl} alt="" className="aspect-video w-full rounded-2xl object-cover" /><button onClick={() => setD((x) => ({ ...x, coverMediaId: '', coverUrl: '' }))} className="absolute end-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60" aria-label="حذف کاور"><X className="h-4 w-4" /></button></div> : null}
            <KButton variant="outline" className="w-full" onClick={() => setPick(true)}><ImagePlus className="h-4 w-4" />{d.coverUrl ? 'تغییر' : 'انتخاب از رسانه'}</KButton>
          </Glass>
          <Glass className="space-y-3 p-4">
            <div className="font-bold">سئو</div>
            <Field label="عنوان SEO" hint={`${fa(d.seoTitle.length)}/۷۰`}><input value={d.seoTitle} onChange={(e) => set('seoTitle', e.target.value.slice(0, 70))} className={inp} placeholder={d.title} /></Field>
            <Field label="توضیح SEO" hint={`${fa(d.seoDescription.length)}/۱۷۰`}><textarea value={d.seoDescription} onChange={(e) => set('seoDescription', e.target.value.slice(0, 170))} rows={3} className={cn(inp, 'h-auto py-2')} placeholder={d.excerpt} /></Field>
          </Glass>
          {errs.length > 0 && <Glass className="p-4 text-sm text-gold"><ul className="list-disc ps-4">{errs.map((e) => <li key={e}>{e}</li>)}</ul></Glass>}
          {post && <KButton variant="outline" className="w-full text-destructive" onClick={() => setDel(true)}><Trash2 className="h-4 w-4" />حذف</KButton>}
          {post && post.status !== 'archived' && <KButton variant="outline" className="w-full" loading={busy} onClick={() => save('archived')}>بایگانی</KButton>}
        </div>
      </div>
      <MediaPicker open={pick} onOpenChange={setPick} selected={d.coverMediaId} onSelect={(a) => setD((x) => ({ ...x, coverMediaId: a.id, coverUrl: a.url }))} />
      <ResponsiveModal open={preview} onOpenChange={setPreview} title="پیش‌نمایش" wide>
        {d.coverUrl && <img src={d.coverUrl} alt="" className="mb-4 aspect-video w-full rounded-2xl object-cover" />}
        <h1 className="text-2xl font-black">{d.title || 'بدون عنوان'}</h1><p className="mt-2 text-muted-foreground">{d.excerpt}</p>
        <Markdown className="prose-invert mt-4 leading-8">{d.body}</Markdown>
      </ResponsiveModal>
      <Confirm open={del} onOpenChange={setDel} danger title="حذف مطلب؟" confirmLabel="حذف" text="مطلب از سایت و پنل حذف می‌شود (حذف نرم؛ سابقه در گزارش فعالیت می‌ماند)." onConfirm={onDelete} />
    </div>
  );
}

export function AdminPosts() {
  const { token } = useAdmin();
  const [posts, setPosts] = useState<Post[] | null>(null); const [err, setErr] = useState<string>();
  const [editing, setEditing] = useState<Post | 'new' | null>(null);
  const [q, setQ] = useState(''); const [st, setSt] = useState(''); const [tag, setTag] = useState(''); const [page, setPage] = useState(1);
  const load = useCallback(() => { setErr(undefined); adminPosts({ token, action: 'list' }).then((r) => setPosts(r.posts)).catch((e) => setErr(errMsg(e))); }, [token]);
  useEffect(load, [load]);
  const tags = useMemo(() => Array.from(new Set((posts ?? []).flatMap((p) => p.tags))), [posts]);
  const list = useMemo(() => (posts ?? []).filter((p) => (!st || stateOf(p) === st) && (!tag || p.tags.includes(tag)) && `${p.title} ${p.slug}`.toLowerCase().includes(q.toLowerCase())), [posts, q, st, tag]);
  const PS = 15; const pages = Math.max(1, Math.ceil(list.length / PS));
  if (editing) return <Editor key={editing === 'new' ? 'new' : editing.id} post={editing === 'new' ? undefined : editing} onBack={() => setEditing(null)}
    onSaved={(p, all) => { setPosts(all); setEditing(p); }}
    onDelete={async () => { try { const r = await adminPosts({ token, action: 'delete', id: (editing as Post).id }); setPosts(r.posts); setEditing(null); toast.success('حذف شد'); } catch (e) { toast.error(errMsg(e)); } }} />;
  const sel = 'h-11 rounded-full border border-white/10 bg-bg1 px-3 text-sm';
  return (
    <div>
      <PageHead title="مطالب" sub={posts ? `${fa(posts.length)} مطلب` : undefined} action={<KButton onClick={() => setEditing('new')}><Plus className="h-5 w-5" />مطلب جدید</KButton>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1 basis-48"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="جست‌وجوی عنوان یا نامک…" className="h-11 w-full rounded-full border border-white/10 bg-bg1 pe-3 ps-9 text-sm outline-none focus:border-primary" /></div>
        <select value={st} onChange={(e) => { setSt(e.target.value); setPage(1); }} aria-label="وضعیت" className={sel}><option value="">همه‌ی وضعیت‌ها</option>{Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}</select>
        {tags.length > 0 && <select value={tag} onChange={(e) => { setTag(e.target.value); setPage(1); }} aria-label="تگ" className={sel}><option value="">همه‌ی تگ‌ها</option>{tags.map((t) => <option key={t}>{t}</option>)}</select>}
      </div>
      {err ? <Glass><ErrorState text={err} onRetry={load} /></Glass> : !posts ? <ListSkeleton /> : !list.length ? <Glass><StateView icon={Newspaper} title={posts.length ? 'مطلبی پیدا نشد' : 'هنوز مطلبی ننوشتی'} action={!posts.length && <KButton onClick={() => setEditing('new')}><Plus className="h-5 w-5" />اولین مطلب</KButton>} /></Glass> : (
        <div className="grid gap-2">{list.slice((page - 1) * PS, page * PS).map((p) => (
          <button key={p.id} onClick={() => setEditing(p)} className="glass press flex items-center gap-3 rounded-3xl p-3 text-start">
            {p.coverUrl ? <img src={p.coverUrl} alt="" className="h-14 w-20 shrink-0 rounded-xl object-cover" /> : <span className="grid h-14 w-20 shrink-0 place-items-center rounded-xl bg-white/5"><Newspaper className="h-5 w-5 text-muted-foreground" /></span>}
            <div className="min-w-0 flex-1"><div className="truncate font-bold">{p.title}</div><div className="truncate text-xs text-muted-foreground" dir="auto">/blog/{p.slug} · {p.publishedAt ? fmtDate(p.publishedAt, true) : `ویرایش ${fmtDate(p.updatedAt)}`}</div></div>
            <Pill s={stateOf(p)} />
          </button>
        ))}</div>
      )}
      {pages > 1 && <div className="mt-4 flex items-center justify-center gap-2 text-sm"><KButton variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>قبلی</KButton><span>{fa(page)} از {fa(pages)}</span><KButton variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>بعدی</KButton></div>}
    </div>
  );
}
