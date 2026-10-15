import { Plus, Trash2 } from 'lucide-react';
import { KButton, Glass, KayarLogo } from '../kit';
import type { BlockKey } from '../../lib/cmsSchema';

type Val = Record<string, unknown>;
type Sub = { k: string; label: string; area?: boolean };
type F = { k: string; label: string; kind: 'text' | 'area' | 'strings' | 'objects'; sub?: Sub[]; dir?: 'ltr' };

const FIELDS: Record<BlockKey, F[]> = {
  hero: [{ k: 'eyebrow', label: 'برچسب بالای تیتر', kind: 'text' }, { k: 'title1', label: 'تیتر خط اول', kind: 'text' }, { k: 'title2', label: 'تیتر خط دوم (رنگی)', kind: 'text' }, { k: 'subtitle', label: 'زیرتیتر', kind: 'area' }, { k: 'cta', label: 'متن دکمه', kind: 'text' }],
  steps: [{ k: 'title', label: 'عنوان', kind: 'text' }, { k: 'accent', label: 'بخش رنگی عنوان', kind: 'text' }, { k: 'text', label: 'توضیح', kind: 'area' }, { k: 'items', label: 'مراحل', kind: 'objects', sub: [{ k: 't', label: 'عنوان مرحله' }, { k: 'd', label: 'توضیح', area: true }] }],
  morshed: [{ k: 'title', label: 'عنوان', kind: 'text' }, { k: 'accent', label: 'بخش رنگی', kind: 'text' }, { k: 'text', label: 'توضیح', kind: 'area' }, { k: 'chips', label: 'برچسب‌ها', kind: 'strings' }],
  bodyyar: [{ k: 'title', label: 'عنوان', kind: 'text' }, { k: 'accent', label: 'بخش رنگی', kind: 'text' }, { k: 'text', label: 'توضیح', kind: 'area' }, { k: 'steps', label: 'مراحل', kind: 'strings' }],
  faq: [{ k: 'items', label: 'سؤال‌ها (اگر خالی باشد، سؤال‌های پیش‌فرض نمایش داده می‌شوند)', kind: 'objects', sub: [{ k: 'q', label: 'سؤال' }, { k: 'a', label: 'پاسخ', area: true }] }],
  cta: [{ k: 'title', label: 'عنوان', kind: 'text' }, { k: 'text', label: 'توضیح', kind: 'area' }],
  footer: [{ k: 'tagline', label: 'شعار', kind: 'area' }, { k: 'copyright', label: 'متن کپی‌رایت', kind: 'text' }],
  seo: [{ k: 'title', label: 'عنوان صفحه (حداکثر ۷۰)', kind: 'text' }, { k: 'description', label: 'توضیحات متا (حداکثر ۱۷۰)', kind: 'area' }],
};

const inputCls = 'w-full rounded-2xl border border-white/10 bg-white/[.03] px-4 py-3 text-[15px] outline-none focus:border-primary/60';
function Txt({ label, value, onChange, area }: { label: string; value: string; onChange: (v: string) => void; area?: boolean }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-bold text-muted-foreground">{label}</span>
      {area ? <textarea rows={3} className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} /> : <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}

export function BlockForm({ k, val, onChange }: { k: BlockKey; val: Val; onChange: (v: Val) => void }) {
  const set = (f: string, v: unknown) => onChange({ ...val, [f]: v });
  return (
    <div className="space-y-4">
      {FIELDS[k].map((f) => {
        if (f.kind === 'text' || f.kind === 'area') return <Txt key={f.k} label={f.label} area={f.kind === 'area'} value={String(val[f.k] ?? '')} onChange={(v) => set(f.k, v)} />;
        if (f.kind === 'strings') {
          const arr = (val[f.k] as string[] | undefined) ?? [];
          return (
            <div key={f.k} className="space-y-2">
              <div className="text-sm font-bold text-muted-foreground">{f.label}</div>
              {arr.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input className={inputCls} value={s} aria-label={`${f.label} ${i + 1}`} onChange={(e) => set(f.k, arr.map((x, j) => (j === i ? e.target.value : x)))} />
                  <KButton size="sm" variant="ghost" aria-label="حذف" onClick={() => set(f.k, arr.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></KButton>
                </div>
              ))}
              <KButton size="sm" variant="outline" onClick={() => set(f.k, [...arr, ''])}><Plus className="h-4 w-4" />افزودن</KButton>
            </div>
          );
        }
        const arr = (val[f.k] as Record<string, string>[] | undefined) ?? [];
        return (
          <div key={f.k} className="space-y-3">
            <div className="text-sm font-bold text-muted-foreground">{f.label}</div>
            {arr.map((o, i) => (
              <div key={i} className="space-y-2 rounded-2xl border border-white/10 p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">#{(i + 1).toLocaleString('fa-IR')}<KButton size="sm" variant="ghost" aria-label="حذف" onClick={() => set(f.k, arr.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></KButton></div>
                {f.sub!.map((s) => <Txt key={s.k} label={s.label} area={s.area} value={o[s.k] ?? ''} onChange={(v) => set(f.k, arr.map((x, j) => (j === i ? { ...x, [s.k]: v } : x)))} />)}
              </div>
            ))}
            <KButton size="sm" variant="outline" onClick={() => set(f.k, [...arr, Object.fromEntries(f.sub!.map((s) => [s.k, '']))])}><Plus className="h-4 w-4" />افزودن</KButton>
          </div>
        );
      })}
    </div>
  );
}

export function BlockPreview({ k, val }: { k: BlockKey; val: Val }) {
  const str = (f: string) => String(val[f] ?? '');
  const list = (f: string) => (val[f] as unknown[] | undefined) ?? [];
  return (
    <div className="noise depth-bg relative overflow-hidden rounded-[28px] border border-white/10 p-6">
      <div className="mb-3 text-xs text-muted-foreground">پیش‌نمایش زنده (منتشرنشده)</div>
      {k === 'hero' && <><KayarLogo className="text-sm" /><div className="mt-5 text-xs font-bold text-primary">{str('eyebrow')}</div><h2 className="mt-2 text-3xl font-black leading-snug">{str('title1')}<br />حالا <span className="text-primary">{str('title2')}</span></h2><p className="mt-3 text-muted-foreground">{str('subtitle')}</p><span className="mt-5 inline-flex h-12 items-center rounded-full bg-primary px-6 font-bold text-primary-foreground">{str('cta')}</span></>}
      {(k === 'steps' || k === 'morshed' || k === 'bodyyar') && <><h2 className="text-2xl font-black">{str('title')} <span className="text-primary">{str('accent')}</span></h2><p className="mt-2 text-muted-foreground">{str('text')}</p></>}
      {k === 'steps' && <div className="mt-4 space-y-2">{(list('items') as { t: string; d: string }[]).map((x, i) => <Glass key={i} className="p-3"><div className="font-bold">{x.t}</div><div className="text-sm text-muted-foreground">{x.d}</div></Glass>)}</div>}
      {(k === 'morshed' || k === 'bodyyar') && <div className="mt-4 flex flex-wrap gap-2">{(list(k === 'morshed' ? 'chips' : 'steps') as string[]).map((c, i) => <span key={i} className="rounded-full border border-white/15 px-3 py-1 text-sm">{c}</span>)}</div>}
      {k === 'faq' && (list('items').length === 0 ? <p className="text-sm text-muted-foreground">سؤالی ثبت نشده؛ سؤال‌های پیش‌فرض سایت نمایش داده می‌شوند.</p> : <div className="space-y-2">{(list('items') as { q: string; a: string }[]).map((x, i) => <Glass key={i} className="p-3"><div className="font-bold">{x.q}</div><div className="mt-1 text-sm text-muted-foreground">{x.a}</div></Glass>)}</div>)}
      {k === 'cta' && <div className="rounded-3xl bg-primary p-6 text-primary-foreground"><h2 className="text-2xl font-black">{str('title')}</h2><p className="mt-2 opacity-80">{str('text')}</p></div>}
      {k === 'footer' && <><KayarLogo className="text-lg" /><p className="mt-3 text-muted-foreground">{str('tagline')}</p><p className="mt-6 text-xs text-muted-foreground">{str('copyright')}</p></>}
      {k === 'seo' && <div className="rounded-2xl bg-white p-4 text-start" dir="rtl"><div className="truncate text-lg text-[#1a0dab]">{str('title')} | کایار</div><div className="mt-1 line-clamp-2 text-sm text-[#4d5156]">{str('description')}</div></div>}
    </div>
  );
}
