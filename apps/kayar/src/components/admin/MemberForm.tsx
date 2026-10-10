import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { RefreshCw } from 'lucide-react';
import { adminMemberCreate, adminMemberAction, type AdminMembersOutputType } from 'zitejs/api';
import { KButton, FloatInput } from '../kit';
import { ResponsiveModal } from './ui';
import { Credentials } from './Credentials';
import { useAdmin, errMsg } from '../../lib/session';
import type { CardData } from '../../lib/printCards';

type Member = AdminMembersOutputType['rows'][0];
const ROLES = [['support', 'پشتیبانی'], ['editor', 'ویراستار'], ['admin', 'مدیر'], ['superadmin', 'مدیر ارشد']] as const;
const latin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
const phoneOk = (s: string) => /^(\+98|0098|98|0)?9\d{9}$/.test(latin(s).replace(/[\s-]/g, ''));

const schema = (staff: boolean) => z.object({
  displayName: z.string().trim().min(2, 'نام را وارد کن.'),
  phone: staff ? z.string().refine((v) => !v || phoneOk(v), 'شماره موبایل نامعتبر است.') : z.string().refine(phoneOk, 'شماره موبایل نامعتبر است (مثل ۰۹۱۲۱۲۳۴۵۶۷).'),
  username: staff ? z.string().regex(/^[a-zA-Z0-9._-]{3,40}$/, 'نام کاربری لاتین ۳ تا ۴۰ نویسه.') : z.string().refine((v) => !v || /^[a-zA-Z0-9._-]{3,40}$/.test(v), 'نام کاربری لاتین ۳ تا ۴۰ نویسه.'),
  password: z.string().refine((v) => !v || v.length >= 8, 'رمز دستی حداقل ۸ نویسه.'),
});

export function MemberForm({ open, onOpenChange, staff, editing, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; staff: boolean; editing?: Member | null; onDone: () => void }) {
  const { token } = useAdmin();
  const [f, setF] = useState({ displayName: editing?.displayName ?? '', phone: editing?.phone ?? '', username: editing?.username ?? '', password: '', orderRef: editing?.orderRef ?? '', note: editing?.note ?? '', role: editing?.role && editing.role !== 'member' ? editing.role : 'support', tags: editing?.tags.join('، ') ?? '' });
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false); const [err, setErr] = useState<string>();
  const [created, setCreated] = useState<CardData | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const parsed = schema(staff).safeParse({ ...f, password: editing ? '' : f.password });
  const fe = (k: string) => (touched && !parsed.success ? parsed.error.issues.find((i) => i.path[0] === k)?.message : undefined);
  const weak = f.password && (f.password === latin(f.phone) || /^\d+$/.test(f.password));
  const tags = f.tags.split(/[,،]/).map((t) => t.trim()).filter(Boolean).slice(0, 10);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setTouched(true);
    if (!parsed.success) return;
    setLoading(true); setErr(undefined);
    try {
      if (editing) {
        await adminMemberAction({ token, id: editing.id, action: 'update', patch: { displayName: f.displayName, phone: f.phone, username: f.username, orderRef: f.orderRef, note: f.note, tags, ...(staff ? { role: f.role as 'support' } : {}) } });
        onDone(); onOpenChange(false);
      } else {
        const r = await adminMemberCreate({ token, displayName: f.displayName, phone: f.phone || undefined, username: f.username || undefined, password: f.password || undefined, orderRef: f.orderRef || undefined, note: f.note || undefined, tags, role: staff ? (f.role as 'support') : 'member' });
        setCreated({ name: r.member.displayName, username: r.member.username, password: r.tempPassword });
        onDone();
      }
    } catch (x) { setErr(errMsg(x)); } finally { setLoading(false); }
  };
  const title = created ? 'حساب ساخته شد' : editing ? 'ویرایش حساب' : staff ? 'افزودن کارمند' : 'ساخت حساب مشتری';
  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} title={title}>
      {created ? <><Credentials card={created} phone={f.phone} /><KButton variant="ghost" className="mt-3 w-full" onClick={() => onOpenChange(false)}>بستن</KButton></> : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <FloatInput id="mf-name" label="نام و نام خانوادگی" value={f.displayName} onChange={set('displayName')} error={fe('displayName')} autoFocus />
          <div className="grid gap-4 sm:grid-cols-2">
            <FloatInput id="mf-phone" label={staff ? 'موبایل (اختیاری)' : 'شماره موبایل'} value={f.phone} onChange={set('phone')} dir="ltr" inputMode="tel" error={fe('phone')} />
            <FloatInput id="mf-user" label={staff ? 'نام کاربری' : 'نام کاربری (پیش‌فرض: موبایل)'} value={f.username} onChange={set('username')} dir="ltr" error={fe('username')} />
          </div>
          {staff ? (
            <label className="block text-sm font-bold">نقش
              <select value={f.role} onChange={(e) => set('role')(e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-bg1 px-3 text-base">{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
          ) : <FloatInput id="mf-order" label="شماره سفارش (اختیاری)" value={f.orderRef} onChange={set('orderRef')} dir="ltr" />}
          {!editing && (
            <div>
              <FloatInput id="mf-pw" label="رمز دستی (خالی = تولید خودکار ۱۰ نویسه‌ای)" value={f.password} onChange={set('password')} dir="ltr" error={fe('password')} trailing={f.password ? <button type="button" onClick={() => set('password')('')} className="tap grid place-items-center" aria-label="تولید خودکار"><RefreshCw className="h-4 w-4" /></button> : undefined} />
              {weak && <p className="mt-1 text-sm text-gold">این رمز ضعیف است یا با شماره یکی است؛ احتمالاً سرور آن را رد می‌کند.</p>}
            </div>
          )}
          <FloatInput id="mf-tags" label="برچسب‌ها (با ، جدا کن)" value={f.tags} onChange={set('tags')} />
          <label className="block text-sm font-bold">یادداشت<textarea value={f.note} onChange={(e) => set('note')(e.target.value)} maxLength={1000} rows={2} className="mt-1 w-full rounded-2xl border border-white/10 bg-white/[.04] p-3 text-base outline-none focus:border-primary" /></label>
          <p className="text-sm text-muted-foreground">کاربر در اولین ورود مجبور به تغییر رمز است.</p>
          {err && <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{err}</div>}
          <div className="sticky bottom-0 -mx-1 bg-bg1/95 px-1 pb-1 pt-2"><KButton type="submit" className="w-full" loading={loading} disabled={touched && !parsed.success}>{editing ? 'ذخیره تغییرات' : 'ساخت حساب'}</KButton></div>
        </form>
      )}
    </ResponsiveModal>
  );
}
