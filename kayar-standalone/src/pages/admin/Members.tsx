import { useCallback, useEffect, useState } from 'react';
import { Plus, Upload, Download, ChevronLeft, ChevronRight, MoreVertical, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';
import { adminMembers, adminMemberAction, type AdminMembersOutputType, type AdminMemberActionOutputType } from '@/zite/api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/ui/ui/dropdown-menu';
import { cn } from '@/ui/lib/utils';
import { KButton, Glass, StateView } from '../../components/kit';
import { PageHead, ResponsiveModal, Confirm, ListSkeleton, ErrorState, fmtDate } from '../../components/admin/ui';
import { MemberForm } from '../../components/admin/MemberForm';
import { BulkCreate } from '../../components/admin/BulkCreate';
import { Credentials } from '../../components/admin/Credentials';
import { ROLE_FA } from '../../components/admin/AdminShell';
import { useAdmin, errMsg } from '../../lib/session';
import { downloadText } from '../../lib/printCards';
import { fa } from '../../lib/config';

type M = AdminMembersOutputType['rows'][0];
type Action = 'reset' | 'suspend' | 'unsuspend' | 'logoutAll' | 'delete';
const CONFIRM: Record<Action, [string, string, string, boolean]> = {
  reset: ['بازنشانی رمز', 'یک رمز موقت جدید ساخته می‌شود، همه‌ی نشست‌ها بسته می‌شوند و کاربر باید دوباره رمز را عوض کند.', 'بازنشانی', false],
  suspend: ['تعلیق حساب', 'کاربر از همه‌ی دستگاه‌ها خارج می‌شود و تا رفع تعلیق نمی‌تواند وارد شود.', 'تعلیق', true],
  unsuspend: ['رفع تعلیق', 'کاربر دوباره می‌تواند وارد شود.', 'رفع تعلیق', false],
  logoutAll: ['خروج اجباری', 'همه‌ی نشست‌های فعال این کاربر بسته می‌شود.', 'خروج از همه', true],
  delete: ['حذف حساب', 'حساب غیرفعال و از فهرست حذف می‌شود (حذف نرم؛ گزارش فعالیت می‌ماند).', 'حذف', true],
};

function Status({ m }: { m: M }) {
  const [t, c] = m.status === 'suspended' ? ['تعلیق', 'bg-destructive/15 text-destructive'] : m.mustChangePassword ? [m.lastLoginAt ? 'منتظر تغییر رمز' : 'هنوز وارد نشده', 'bg-gold/15 text-gold'] : ['فعال', 'bg-primary/15 text-primary'];
  return <span className={cn('inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold', c)}>{t}</span>;
}

export function MembersPage({ kind }: { kind: 'customer' | 'staff' }) {
  const { token, can, member: me } = useAdmin();
  const staff = kind === 'staff';
  const [q, setQ] = useState(''); const [dq] = useDebounce(q, 350);
  const [status, setStatus] = useState<'all' | 'active' | 'suspended'>('all');
  const [flag, setFlag] = useState<'none' | 'neverLoggedIn' | 'mustChange'>('none');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'name' | 'lastLogin'>('newest');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminMembersOutputType | null>(null); const [error, setError] = useState<string>();
  const [form, setForm] = useState<{ editing: M | null } | null>(null); const [bulk, setBulk] = useState(false);
  const [confirm, setConfirm] = useState<{ m: M; a: Action } | null>(null);
  const [reveal, setReveal] = useState<{ m: M; pw: string } | null>(null);
  const [sessions, setSessions] = useState<{ m: M; list: NonNullable<AdminMemberActionOutputType['sessions']> } | null>(null);
  const pageSize = 20;

  const load = useCallback(() => {
    setError(undefined);
    adminMembers({ token, kind, q: dq || undefined, status, flag, sort, page, pageSize }).then(setData).catch((e) => setError(errMsg(e)));
  }, [token, kind, dq, status, flag, sort, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [dq, status, flag, sort]);

  const run = async (m: M, a: Action) => {
    try {
      const r = await adminMemberAction({ token, id: m.id, action: a });
      if (r.tempPassword) setReveal({ m: r.member as M, pw: r.tempPassword });
      else toast.success('انجام شد');
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const showSessions = async (m: M) => {
    try { const r = await adminMemberAction({ token, id: m.id, action: 'sessions' }); setSessions({ m, list: r.sessions ?? [] }); } catch (e) { toast.error(errMsg(e)); }
  };
  const exportCsv = async () => {
    try { const r = await adminMembers({ token, kind, q: dq || undefined, status, flag, sort, page: 1, pageSize: 100, csv: true }); downloadText(`kayar-${kind}-${new Date().toISOString().slice(0, 10)}.csv`, r.csv ?? ''); } catch (e) { toast.error(errMsg(e)); }
  };
  const canWrite = staff ? can('staff.manage') : can('customers.write');
  const items = (m: M) => [
    canWrite && { l: 'ویرایش', on: () => setForm({ editing: m }) },
    (staff || can('customers.read')) && { l: 'نشست‌ها و آخرین ورود', on: () => showSessions(m) },
    (staff || can('customers.reset')) && { l: 'بازنشانی رمز', on: () => setConfirm({ m, a: 'reset' }) },
    (staff || can('customers.suspend')) && m.id !== me?.id && { l: m.status === 'suspended' ? 'رفع تعلیق' : 'تعلیق', on: () => setConfirm({ m, a: m.status === 'suspended' ? 'unsuspend' : 'suspend' }), danger: m.status !== 'suspended' },
    (staff || can('customers.suspend')) && { l: 'خروج اجباری از همه', on: () => setConfirm({ m, a: 'logoutAll' }) },
    canWrite && m.id !== me?.id && { l: 'حذف', on: () => setConfirm({ m, a: 'delete' }), danger: true },
  ].filter(Boolean) as { l: string; on: () => void; danger?: boolean }[];
  const Menu = ({ m }: { m: M }) => (
    <DropdownMenu><DropdownMenuTrigger className="tap grid shrink-0 place-items-center rounded-full hover:bg-white/5" aria-label="عملیات"><MoreVertical className="h-5 w-5" /></DropdownMenuTrigger>
      <DropdownMenuContent align="end">{items(m).map((it, i) => <div key={it.l}>{it.danger && i > 0 && <DropdownMenuSeparator />}<DropdownMenuItem onClick={it.on} className={cn('min-h-[44px]', it.danger && 'text-destructive')}>{it.l}</DropdownMenuItem></div>)}</DropdownMenuContent>
    </DropdownMenu>
  );
  const pages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const sel = 'h-11 rounded-full border border-white/10 bg-bg1 px-3 text-sm outline-none focus:border-primary';

  return (
    <div>
      <PageHead title={staff ? 'کارکنان' : 'مشتریان'} sub={data ? `${fa(data.total)} حساب` : staff ? 'نقش‌ها و دسترسی کارکنان' : 'حساب خریداران کاپوش'}
        action={canWrite && <div className="hidden gap-2 sm:flex">{!staff && <KButton variant="outline" onClick={() => setBulk(true)}><Upload className="h-5 w-5" />ساخت گروهی</KButton>}<KButton onClick={() => setForm({ editing: null })}><Plus className="h-5 w-5" />{staff ? 'افزودن کارمند' : 'ساخت حساب'}</KButton></div>} />
      <Glass className="overflow-hidden rounded-[28px] p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/5 p-3">
          <div className="relative min-w-0 flex-1 basis-56"><Search className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام، موبایل، نام کاربری یا سفارش…" aria-label="جست‌وجو" className="h-11 w-full rounded-full border border-white/10 bg-white/[.04] pe-4 ps-12 text-base outline-none focus:border-primary" /></div>
          <select aria-label="وضعیت" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={sel}><option value="all">همه‌ی وضعیت‌ها</option><option value="active">فعال</option><option value="suspended">تعلیق</option></select>
          <select aria-label="فیلتر" value={flag} onChange={(e) => setFlag(e.target.value as typeof flag)} className={sel}><option value="none">بدون فیلتر</option><option value="neverLoggedIn">هنوز وارد نشده</option><option value="mustChange">منتظر تغییر رمز</option></select>
          <select aria-label="مرتب‌سازی" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={sel}><option value="newest">جدیدترین</option><option value="oldest">قدیمی‌ترین</option><option value="name">نام</option><option value="lastLogin">آخرین ورود</option></select>
          <KButton variant="ghost" size="sm" onClick={exportCsv} aria-label="خروجی CSV"><Download className="h-4 w-4" /><span className="hidden md:inline">CSV</span></KButton>
        </div>
        {error ? <ErrorState text={error} onRetry={load} /> : !data ? <ListSkeleton /> : data.rows.length === 0 ? (
          <StateView icon={Users} title={dq || status !== 'all' || flag !== 'none' ? 'نتیجه‌ای پیدا نشد' : staff ? 'هنوز کارمندی اضافه نشده' : 'هنوز حسابی ساخته نشده'} text={canWrite && !dq ? 'اولین حساب را بساز؛ کمتر از یک دقیقه طول می‌کشد.' : undefined} action={canWrite && !dq ? <KButton onClick={() => setForm({ editing: null })}><Plus className="h-5 w-5" />ساخت حساب</KButton> : undefined} />
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[760px] text-[15px]">
                <thead><tr className="border-b border-white/5 text-sm text-muted-foreground">{['نام', 'نام کاربری', 'موبایل', staff ? 'نقش' : 'سفارش', 'وضعیت', 'آخرین ورود', 'ساخت', ''].map((h, i) => <th key={i} className={cn('whitespace-nowrap px-4 py-3 text-start font-bold', h === 'ساخت' && 'hidden min-[1440px]:table-cell')}>{h}</th>)}</tr></thead>
                <tbody>{data.rows.map((m) => (
                  <tr key={m.id} className="border-b border-white/5 hover:bg-white/[.03]">
                    <td className="max-w-[220px] truncate px-4 py-3 font-bold">{m.displayName}</td>
                    <td className="px-4 py-3 font-latin" dir="ltr">{m.username}</td>
                    <td className="px-4 py-3" dir="ltr">{fa(m.phone || '—')}</td>
                    <td className="px-4 py-3">{staff ? ROLE_FA[m.role] : m.orderRef || '—'}</td>
                    <td className="px-4 py-3"><Status m={m} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{fmtDate(m.lastLoginAt)}</td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground min-[1440px]:table-cell">{fmtDate(m.createdAt)}</td>
                    <td className="px-2 py-1"><Menu m={m} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <ul className="divide-y divide-white/5 sm:hidden">{data.rows.map((m) => (
              <li key={m.id} className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate font-bold">{m.displayName}</span><Status m={m} /></div><div className="mt-1 truncate text-sm text-muted-foreground"><span className="font-latin" dir="ltr">{m.username}</span>{staff ? ` · ${ROLE_FA[m.role]}` : m.orderRef ? ` · سفارش ${m.orderRef}` : ''}</div><div className="text-xs text-muted-foreground">آخرین ورود: {fmtDate(m.lastLoginAt)}</div></div>
                <Menu m={m} />
              </li>
            ))}</ul>
            <div className="flex items-center justify-between gap-2 p-3 text-sm text-muted-foreground">
              <span>صفحه‌ی {fa(page)} از {fa(pages)}</span>
              <div className="flex gap-1"><button className="tap grid place-items-center rounded-full hover:bg-white/5 disabled:opacity-30" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="صفحه‌ی قبل"><ChevronRight className="h-5 w-5" /></button><button className="tap grid place-items-center rounded-full hover:bg-white/5 disabled:opacity-30" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="صفحه‌ی بعد"><ChevronLeft className="h-5 w-5" /></button></div>
            </div>
          </>
        )}
      </Glass>
      {canWrite && <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-white/5 bg-background/90 p-3 pb-[calc(12px+var(--safe-b))] backdrop-blur sm:hidden">{!staff && <KButton variant="outline" className="flex-1" onClick={() => setBulk(true)}><Upload className="h-5 w-5" />گروهی</KButton>}<KButton className="flex-1" onClick={() => setForm({ editing: null })}><Plus className="h-5 w-5" />{staff ? 'افزودن' : 'ساخت حساب'}</KButton></div>}
      {form && <MemberForm key={form.editing?.id ?? 'new'} open onOpenChange={(v) => !v && setForm(null)} staff={staff} editing={form.editing} onDone={load} />}
      {!staff && <BulkCreate open={bulk} onOpenChange={setBulk} onDone={load} />}
      {confirm && <Confirm open onOpenChange={(v) => !v && setConfirm(null)} title={`${CONFIRM[confirm.a][0]}: ${confirm.m.displayName}`} text={CONFIRM[confirm.a][1]} confirmLabel={CONFIRM[confirm.a][2]} danger={CONFIRM[confirm.a][3]} onConfirm={() => run(confirm.m, confirm.a)} />}
      <ResponsiveModal open={!!reveal} onOpenChange={(v) => !v && setReveal(null)} title="رمز موقت جدید">{reveal && <Credentials card={{ name: reveal.m.displayName, username: reveal.m.username, password: reveal.pw }} phone={reveal.m.phone} />}</ResponsiveModal>
      <ResponsiveModal open={!!sessions} onOpenChange={(v) => !v && setSessions(null)} title={`نشست‌های ${sessions?.m.displayName ?? ''}`}>
        {sessions && (sessions.list.length === 0 ? <p className="text-muted-foreground">هیچ نشستی ثبت نشده؛ کاربر هنوز وارد نشده است.</p> : (
          <ul className="divide-y divide-white/5">{sessions.list.map((s) => <li key={s.id} className="py-3 text-sm"><div className="flex justify-between gap-2"><span className="truncate" dir="ltr">{s.userAgent.slice(0, 50) || 'نامشخص'}</span><span className={s.active ? 'text-primary' : 'text-muted-foreground'}>{s.active ? 'فعال' : 'بسته'}</span></div><div className="text-xs text-muted-foreground">ورود {fmtDate(s.createdAt, true)} · آخرین فعالیت {fmtDate(s.lastSeenAt, true)}</div></li>)}</ul>
        ))}
      </ResponsiveModal>
    </div>
  );
}
