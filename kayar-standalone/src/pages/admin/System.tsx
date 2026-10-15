import { useCallback, useEffect, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { Users, UserCheck, UserX, KeyRound, Newspaper, Music, Save, History, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Sparkles, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { adminDashboard, adminSettings, adminAudit, aiHealth, type AdminDashboardOutputType, type AdminSettingsOutputType, type AdminAuditOutputType, type AiHealthOutputType } from '@/zite/api';
import { Switch } from '@/ui/ui/switch';
import { KButton, Glass, IconBox, FloatInput, StateView } from '../../components/kit';
import { PageHead, ListSkeleton, ErrorState, fmtDate, ResponsiveModal } from '../../components/admin/ui';
import { useAdmin, errMsg } from '../../lib/session';
import { backendUrl } from '@/zite/caller';
import { fa, faNum } from '../../lib/config';

const PANEL_FA: Record<string, string> = { chat: 'گفتگو', plan: 'برنامه‌ساز', vision: 'تحلیل تصویر', fast: 'سریع', code: 'کد', classify: 'تحلیل وضعیت' };

export const ACTION_FA: Record<string, string> = {
  'auth.login': 'ورود', 'auth.login_failed': 'ورود ناموفق', 'auth.logout': 'خروج', 'auth.logout_all': 'خروج از همه', 'auth.password_changed': 'تغییر رمز',
  'customer.create': 'ساخت مشتری', 'customer.bulk_create': 'ساخت گروهی', 'staff.create': 'افزودن کارمند', 'member.update': 'ویرایش حساب', 'member.role_change': 'تغییر نقش',
  'member.reset': 'بازنشانی رمز', 'member.suspend': 'تعلیق', 'member.unsuspend': 'رفع تعلیق', 'member.logoutAll': 'خروج اجباری', 'member.delete': 'حذف حساب',
  'settings.update': 'تغییر تنظیمات', 'cms.save_draft': 'ذخیره‌ی پیش‌نویس محتوا', 'cms.publish': 'انتشار محتوا', 'cms.unpublish': 'لغو انتشار محتوا', 'cms.restore': 'بازگردانی نسخه‌ی محتوا', 'bootstrap.superadmin': 'ساخت مدیر ارشد اولیه',
  'post.create': 'ساخت مطلب', 'post.update': 'ویرایش مطلب', 'post.publish': 'انتشار مطلب', 'post.unpublish': 'لغو انتشار مطلب', 'post.archive': 'بایگانی مطلب', 'post.delete': 'حذف مطلب',
  'media.upload': 'آپلود رسانه', 'media.update': 'ویرایش رسانه', 'media.delete': 'حذف رسانه',
  'announcement.create': 'ساخت اعلان', 'announcement.update': 'ویرایش اعلان', 'announcement.activate': 'فعال‌سازی اعلان', 'announcement.deactivate': 'غیرفعال‌سازی اعلان', 'announcement.delete': 'حذف اعلان',
  'track.add': 'افزودن آهنگ', 'track.update': 'ویرایش آهنگ', 'track.publish': 'انتشار آهنگ', 'track.unpublish': 'لغو انتشار آهنگ', 'track.hide': 'مخفی‌سازی آهنگ', 'track.reorder': 'ترتیب آهنگ‌ها', 'track.delete': 'حذف آهنگ',
  'collection.create': 'ساخت مجموعه', 'collection.update': 'ویرایش مجموعه', 'collection.delete': 'حذف مجموعه', 'collection.reorder': 'ترتیب مجموعه‌ها', 'collection.add_track': 'افزودن به مجموعه', 'collection.remove_track': 'حذف از مجموعه', 'collection.reorder_tracks': 'ترتیب آهنگ‌های مجموعه',
};

export function AdminDashboard() {
  const { token } = useAdmin();
  const [d, setD] = useState<AdminDashboardOutputType | null>(null); const [err, setErr] = useState<string>();
  const load = useCallback(() => { setErr(undefined); adminDashboard({ token }).then(setD).catch((e) => setErr(errMsg(e))); }, [token]);
  useEffect(load, [load]);
  if (err) return <><PageHead title="داشبورد" /><Glass><ErrorState text={err} onRetry={load} /></Glass></>;
  if (!d) return <><PageHead title="داشبورد" /><ListSkeleton rows={6} /></>;
  const stats = [
    { l: 'کل مشتریان', v: d.customers.total, icon: Users, tone: 'lime' as const },
    { l: 'فعال', v: d.customers.active, icon: UserCheck, tone: 'cyan' as const },
    { l: 'هنوز وارد نشده', v: d.customers.neverLoggedIn, icon: UserX, tone: 'gold' as const },
    { l: 'منتظر تغییر رمز', v: d.customers.mustChange, icon: KeyRound, tone: 'violet' as const },
  ];
  const chart = d.days.map((x) => ({ ...x, d: new Intl.DateTimeFormat('fa-IR', { weekday: 'short' }).format(new Date(x.date)) }));
  return (
    <div>
      <PageHead title="داشبورد" sub="آمار واقعی، ۷ روز اخیر" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s, i) => <Glass key={s.l} active={i === 0} className="p-4 sm:p-5"><IconBox icon={s.icon} tone={s.tone} /><div className="mt-3 text-2xl font-black sm:text-3xl">{faNum(s.v)}</div><div className="text-sm text-muted-foreground">{s.l}</div></Glass>)}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Glass className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 font-bold"><span>ورود و پخش روزانه</span><span className="flex gap-3 text-xs font-normal text-muted-foreground"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-primary" />ورود</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-violet" />پخش</span></span></div>
          <div className="h-60" dir="ltr"><ResponsiveContainer><AreaChart data={chart}><XAxis dataKey="d" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} reversed /><Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16 }} /><Area dataKey="logins" name="ورود" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / .15)" strokeWidth={2} /><Area dataKey="plays" name="پخش" stroke="hsl(var(--violet))" fill="hsl(var(--violet) / .15)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
        </Glass>
        <Glass className="p-5">
          <div className="mb-3 font-bold">آخرین فعالیت‌ها</div>
          {d.recent.length === 0 ? <p className="text-sm text-muted-foreground">هنوز فعالیتی ثبت نشده.</p> : <ul className="space-y-3">{d.recent.map((a, i) => <li key={i} className="flex gap-3 text-sm"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" /><div className="min-w-0"><div className="font-bold">{ACTION_FA[a.action] ?? a.action}</div><div className="truncate text-muted-foreground">{a.actor} · {fmtDate(a.at, true)}</div></div></li>)}</ul>}
        </Glass>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Glass className="p-5"><div className="mb-3 font-bold">پرپخش‌ترین آهنگ‌ها (۳۰ روز)</div>{d.topTracks.length === 0 ? <p className="text-sm text-muted-foreground">هنوز پخشی ثبت نشده.</p> : <ol className="space-y-2">{d.topTracks.map((t, i) => <li key={i} className="flex items-center gap-3"><span className="w-5 text-muted-foreground">{fa(i + 1)}</span><div className="min-w-0 flex-1"><div className="truncate font-bold">{t.title}</div><div className="truncate text-xs text-muted-foreground">{t.artist}</div></div><span className="text-sm">{faNum(t.plays)}</span></li>)}</ol>}</Glass>
        <div className="grid grid-cols-2 gap-3"><Glass className="p-5"><IconBox icon={Newspaper} tone="gold" /><div className="mt-3 text-2xl font-black">{faNum(d.posts)}</div><div className="text-sm text-muted-foreground">مطلب منتشرشده</div></Glass><Glass className="p-5"><IconBox icon={Music} tone="violet" /><div className="mt-3 text-2xl font-black">{faNum(d.publishedTracks)}</div><div className="text-sm text-muted-foreground">آهنگ منتشرشده</div></Glass></div>
      </div>
    </div>
  );
}

type S = AdminSettingsOutputType['settings'];
/** NaraRouter (AI) + payment gateway health, straight from the backend. */
function AiGatewayCard({ token }: { token: string }) {
  const [ai, setAi] = useState<AiHealthOutputType | null>(null);
  const [pay, setPay] = useState<{ provider: string; enabled: boolean; missing: string[]; plans: { id: string; title: string }[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback((force?: boolean) => {
    setBusy(true);
    aiHealth({ token, force }).then(setAi).catch(() => setAi(null)).finally(() => setBusy(false));
    fetch(`${backendUrl()}/pay/health`).then((r) => r.json()).then(setPay).catch(() => setPay(null));
  }, [token]);
  useEffect(() => { load(); }, [load]);
  const ok = ai?.reachable === true;
  return (
    <Glass className="space-y-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-primary" />هوش مصنوعی (NaraRouter)</div>
        <KButton size="sm" variant="outline" loading={busy} onClick={() => load(true)}>بررسی دوباره</KButton>
      </div>
      {!ai ? <p className="text-sm text-muted-foreground">وضعیت در دسترس نیست.</p> : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={ok ? 'text-primary' : 'text-[hsl(var(--gold))]'}>{ok ? 'متصل' : 'غیرفعال'}</span>
            <span className="text-muted-foreground">· {fa(ai.models.length)} مدل در دسترس · {ai.baseUrl}</span>
            {ai.allowPaid ? null : <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">مدل‌های پرداختی خاموش (NARAROUTER_ALLOW_PAID=0)</span>}
          </div>
          {ai.message && <p className="rounded-2xl border border-[hsl(var(--gold))]/30 bg-[hsl(var(--gold))]/10 p-3 text-sm">{ai.message}</p>}
          <div className="space-y-1">
            {ai.panels.slice(0, 6).map((p) => (
              <div key={p.position} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 w-20 shrink-0 font-bold text-muted-foreground">{PANEL_FA[p.position] ?? p.position}</span>
                <span className="font-latin" dir="ltr">{p.models.join(' → ')}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="border-t border-white/5 pt-3">
        <div className="mb-1 flex items-center gap-2 font-bold"><Bot className="h-4 w-4 text-primary" />درگاه پرداخت</div>
        {!pay ? <p className="text-sm text-muted-foreground">وضعیت درگاه در دسترس نیست (بک‌اند اجرا نشده).</p> : (
          <div className="text-sm">
            <span className={pay.enabled ? 'text-primary' : 'text-muted-foreground'}>{pay.enabled ? `${pay.provider} فعال` : 'فعال نشده'}</span>
            {pay.missing.length ? <span className="block text-xs text-muted-foreground">کلیدهای لازم: <span className="font-latin" dir="ltr">{pay.missing.join(', ')}</span></span> : null}
            <span className="block text-xs text-muted-foreground">{fa(pay.plans.length)} پلن آماده‌ی فروش</span>
          </div>
        )}
      </div>
    </Glass>
  );
}

export function AdminSettings() {
  const { token } = useAdmin();
  const [d, setD] = useState<AdminSettingsOutputType | null>(null); const [s, setS] = useState<S | null>(null);
  const [err, setErr] = useState<string>(); const [saving, setSaving] = useState(false);
  const load = useCallback(() => { setErr(undefined); adminSettings({ token }).then((r) => { setD(r); setS(r.settings); }).catch((e) => setErr(errMsg(e))); }, [token]);
  useEffect(load, [load]);
  const save = async () => { if (!s) return; setSaving(true); try { const r = await adminSettings({ token, save: s }); setD(r); setS(r.settings); toast.success('تنظیمات ذخیره شد'); } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); } };
  if (err) return <><PageHead title="تنظیمات" /><Glass><ErrorState text={err} onRetry={load} /></Glass></>;
  if (!s || !d) return <><PageHead title="تنظیمات" /><ListSkeleton /></>;
  const t = (k: keyof S) => (v: string) => setS({ ...s, [k]: v });
  const dirty = JSON.stringify(s) !== JSON.stringify(d.settings);
  return (
    <div className="pb-20 sm:pb-0">
      <PageHead title="تنظیمات" action={<KButton className="hidden sm:inline-flex" onClick={save} loading={saving} disabled={!dirty}><Save className="h-5 w-5" />ذخیره</KButton>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Glass className="space-y-4 p-5"><div className="font-bold">عمومی و لینک‌ها</div><FloatInput id="sn" label="نام سایت" value={s.siteName} onChange={t('siteName')} /><FloatInput id="su" label="لینک فروشگاه" value={s.shopUrl} onChange={t('shopUrl')} dir="ltr" /><div className="grid gap-4 sm:grid-cols-2"><FloatInput id="ig" label="اینستاگرام" value={s.instagram} onChange={t('instagram')} dir="ltr" /><FloatInput id="tg" label="تلگرام" value={s.telegram} onChange={t('telegram')} dir="ltr" /></div></Glass>
        <Glass className="space-y-4 p-5"><div className="font-bold">پشتیبانی <span className="text-sm font-normal text-muted-foreground">(در «رمز را فراموش کردی؟» نمایش داده می‌شود)</span></div><div className="grid gap-4 sm:grid-cols-2"><FloatInput id="sp" label="شماره تماس" value={s.supportPhone} onChange={t('supportPhone')} dir="ltr" inputMode="tel" /><FloatInput id="sw" label="لینک واتس‌اپ (https://wa.me/…)" value={s.supportWhatsapp} onChange={t('supportWhatsapp')} dir="ltr" /></div><FloatInput id="se" label="ایمیل پشتیبانی" value={s.supportEmail} onChange={t('supportEmail')} dir="ltr" /></Glass>
        <Glass className="space-y-3 p-5"><div className="font-bold">متن‌های سیستمی</div><label className="block text-sm">راهنمای صفحه‌ی ورود<textarea value={s.loginHelpText} onChange={(e) => setS({ ...s, loginHelpText: e.target.value.slice(0, 300) })} rows={2} className="mt-1 w-full rounded-2xl border border-white/10 bg-bg1 p-3 text-sm outline-none focus:border-primary" /></label></Glass>
        <Glass className="space-y-3 p-5"><div className="font-bold">سوئیچ‌ها</div>
          <label className="flex min-h-[48px] items-center justify-between gap-3"><span>منبع Jamendo فعال باشد</span><Switch checked={s.jamendoEnabled} onCheckedChange={(v) => setS({ ...s, jamendoEnabled: v })} /></label>
          <label className="flex min-h-[48px] items-center justify-between gap-3"><span>حالت تعمیر</span><Switch checked={s.maintenance} onCheckedChange={(v) => setS({ ...s, maintenance: v })} /></label>
          {s.maintenance && <FloatInput id="mm" label="پیام حالت تعمیر" value={s.maintenanceMessage} onChange={t('maintenanceMessage')} />}
        </Glass>
        <AiGatewayCard token={token} />
        <Glass className="space-y-2 p-5"><div className="font-bold">وضعیت رازها</div><p className="text-sm text-muted-foreground">مقادیر هرگز نمایش داده نمی‌شوند؛ از تنظیمات Zite → Secrets ثبت کنید.</p>
          {d.secrets.map((x) => <div key={x.key} className="flex min-h-[44px] items-center justify-between gap-2"><span className="truncate font-latin text-sm" dir="ltr">{x.key}</span>{x.set ? <span className="flex items-center gap-1 text-sm text-primary"><CheckCircle2 className="h-4 w-4" />تنظیم شده</span> : <span className="flex items-center gap-1 text-sm text-muted-foreground"><XCircle className="h-4 w-4" />تنظیم نشده</span>}</div>)}
        </Glass>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-background/90 p-3 pb-[calc(12px+var(--safe-b))] backdrop-blur sm:hidden"><KButton className="w-full" onClick={save} loading={saving} disabled={!dirty}><Save className="h-5 w-5" />ذخیره</KButton></div>
    </div>
  );
}

export function AdminAudit() {
  const { token } = useAdmin();
  const [action, setAction] = useState(''); const [q, setQ] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [d, setD] = useState<AdminAuditOutputType | null>(null); const [err, setErr] = useState<string>();
  const [detail, setDetail] = useState<AdminAuditOutputType['rows'][0] | null>(null);
  const load = useCallback(() => { setErr(undefined); adminAudit({ token, action: action || undefined, q: q || undefined, from: from || undefined, to: to || undefined, page, pageSize: 25 }).then(setD).catch((e) => setErr(errMsg(e))); }, [token, action, q, from, to, page]);
  useEffect(load, [load]);
  const pages = d ? Math.max(1, Math.ceil(d.total / 25)) : 1;
  const inp = 'h-11 rounded-full border border-white/10 bg-bg1 px-3 text-sm outline-none focus:border-primary';
  let meta: string = '';
  try { meta = detail ? JSON.stringify(JSON.parse(detail.meta || '{}'), null, 2) : ''; } catch { meta = detail?.meta ?? ''; }
  return (
    <div>
      <PageHead title="گزارش فعالیت" sub={d ? `${fa(d.total)} رویداد` : undefined} />
      <Glass className="overflow-hidden rounded-[28px] p-0">
        <div className="flex flex-wrap gap-2 border-b border-white/5 p-3">
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="نام انجام‌دهنده…" aria-label="کاربر" className={`${inp} min-w-0 flex-1 basis-40`} />
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} aria-label="اقدام" className={inp}><option value="">همه‌ی اقدام‌ها</option>{d?.actions.map((a) => <option key={a} value={a}>{ACTION_FA[a] ?? a}</option>)}</select>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label="از تاریخ" className={inp} />
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label="تا تاریخ" className={inp} />
        </div>
        {err ? <ErrorState text={err} onRetry={load} /> : !d ? <ListSkeleton /> : d.rows.length === 0 ? <StateView icon={History} title="رویدادی پیدا نشد" /> : (
          <ul className="divide-y divide-white/5">{d.rows.map((a) => (
            <li key={a.id}><button onClick={() => setDetail(a)} className="flex min-h-[60px] w-full items-center gap-3 p-3 text-start hover:bg-white/[.03]"><IconBox icon={History} tone={a.action.includes('failed') || a.action.includes('suspend') || a.action.includes('delete') ? 'gold' : 'cyan'} className="h-10 w-10 shrink-0" /><div className="min-w-0 flex-1"><div className="truncate font-bold">{ACTION_FA[a.action] ?? a.action}</div><div className="truncate text-sm text-muted-foreground">{a.actor}</div></div><span className="shrink-0 text-xs text-muted-foreground sm:text-sm">{fmtDate(a.at, true)}</span></button></li>
          ))}</ul>
        )}
        <div className="flex items-center justify-between p-3 text-sm text-muted-foreground"><span>صفحه‌ی {fa(page)} از {fa(pages)}</span><div className="flex gap-1"><button className="tap grid place-items-center rounded-full disabled:opacity-30" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="قبلی"><ChevronRight className="h-5 w-5" /></button><button className="tap grid place-items-center rounded-full disabled:opacity-30" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="بعدی"><ChevronLeft className="h-5 w-5" /></button></div></div>
      </Glass>
      <ResponsiveModal open={!!detail} onOpenChange={(v) => !v && setDetail(null)} title={detail ? ACTION_FA[detail.action] ?? detail.action : ''}>
        {detail && <div className="space-y-2 text-sm"><div>انجام‌دهنده: <b>{detail.actor}</b></div><div>زمان: {fmtDate(detail.at, true)}</div><div>هدف: <span dir="ltr" className="font-latin">{detail.targetType} {detail.targetId}</span></div><pre className="max-h-60 overflow-auto rounded-2xl bg-white/5 p-3 text-xs" dir="ltr">{meta}</pre></div>}
      </ResponsiveModal>
    </div>
  );
}
