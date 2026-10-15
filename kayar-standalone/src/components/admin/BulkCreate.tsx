import { useState } from 'react';
import { FileSpreadsheet, Download, Printer, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { readSheet } from 'read-excel-file/browser';
import { adminMemberBulk, type AdminMemberBulkOutputType } from '@/zite/api';
import { cn } from '@/ui/lib/utils';
import { KButton } from '../kit';
import { ResponsiveModal } from './ui';
import { useAdmin, errMsg } from '../../lib/session';
import { printCards, downloadText } from '../../lib/printCards';
import { fa } from '../../lib/config';

type Row = { name: string; phone: string; orderRef?: string };
type Result = AdminMemberBulkOutputType['results'][0];

function parseCsv(text: string): string[][] {
  const out: string[][] = []; let row: string[] = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); out.push(row); row = []; cell = ''; } else cell += c;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  return out.filter((r) => r.some((x) => x.trim()));
}
/** Maps header row → name/phone/orderRef (English or Persian headers). */
export function toRows(grid: string[][]): Row[] {
  const head = grid[0].map((h) => h.replace(/^\uFEFF/, '').trim().toLowerCase());
  const idx = (keys: string[]) => head.findIndex((h) => keys.includes(h));
  const n = idx(['name', 'نام']), p = idx(['phone', 'mobile', 'موبایل', 'شماره']), o = idx(['orderref', 'order', 'سفارش', 'شماره سفارش']);
  if (n < 0 || p < 0) throw new Error('ستون‌های name و phone پیدا نشد.');
  return grid.slice(1).map((r) => ({ name: (r[n] ?? '').trim().slice(0, 80), phone: (r[p] ?? '').trim().slice(0, 20), orderRef: o >= 0 ? (r[o] ?? '').trim().slice(0, 60) : undefined }));
}
const csvEsc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function BulkCreate({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const { token } = useAdmin();
  const [rows, setRows] = useState<Row[]>([]); const [preview, setPreview] = useState<Result[] | null>(null);
  const [done, setDone] = useState<Result[] | null>(null); const [busy, setBusy] = useState(false);
  const [batchId] = useState(() => crypto.randomUUID());
  const reset = () => { setRows([]); setPreview(null); setDone(null); };
  const onFile = async (file: File) => {
    try {
      setBusy(true); reset();
      const grid = /\.xlsx$/i.test(file.name) ? (await readSheet(file)).map((r) => r.map((c) => (c == null ? '' : String(c)))) : parseCsv(await file.text());
      const parsed = toRows(grid);
      if (!parsed.length) throw new Error('فایل ردیفی ندارد.');
      if (parsed.length > 200) throw new Error('حداکثر ۲۰۰ ردیف در هر بار.');
      setRows(parsed);
      setPreview((await adminMemberBulk({ token, rows: parsed, dryRun: true, batchId })).results);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const create = async () => {
    setBusy(true);
    try { const r = await adminMemberBulk({ token, rows, dryRun: false, batchId }); setDone(r.results); onDone(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const created = (done ?? []).filter((r) => r.status === 'created' && r.tempPassword);
  const okCount = (preview ?? []).filter((r) => r.status === 'ok').length;
  const list = done ?? preview;
  return (
    <ResponsiveModal open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }} title="ساخت گروهی حساب‌ها" wide>
      {!list && (
        <label className={cn('flex cursor-pointer flex-col items-center rounded-3xl border-2 border-dashed border-white/15 p-8 text-center hover:border-primary/50', busy && 'pointer-events-none opacity-60')}>
          <FileSpreadsheet className="h-10 w-10 text-primary" /><span className="mt-3 font-bold">{busy ? 'در حال بررسی…' : 'فایل CSV یا XLSX را انتخاب کن'}</span>
          <span className="text-sm text-muted-foreground">ستون‌ها: <span className="font-latin" dir="ltr">name, phone, orderRef</span> · حداکثر ۲۰۰ ردیف</span>
          <input type="file" accept=".csv,.xlsx" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      )}
      {list && (
        <>
          {done && <p className="mb-3 rounded-2xl bg-gold/10 p-3 text-sm text-gold">{fa(created.length)} حساب ساخته شد. رمزها فقط همین حالا در دسترس‌اند؛ CSV را دانلود یا کارت‌ها را چاپ کن.</p>}
          <ul className="max-h-[45vh] divide-y divide-white/5 overflow-y-auto rounded-2xl border border-white/10">
            {list.map((r) => (
              <li key={r.index} className="flex items-center gap-3 p-3 text-sm">
                {r.status === 'error' ? <XCircle className="h-5 w-5 shrink-0 text-destructive" /> : <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />}
                <div className="min-w-0 flex-1"><div className="truncate font-bold">{r.name || '—'}</div><div className="truncate text-muted-foreground" dir="ltr">{r.phone}</div></div>
                {r.error && <span className="max-w-[45%] text-end text-xs text-destructive">{r.error}</span>}
                {r.tempPassword && <span className="font-latin text-xs" dir="ltr">{r.tempPassword}</span>}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {!done && <><KButton variant="ghost" onClick={reset}>فایل دیگر</KButton><KButton className="flex-1" loading={busy} disabled={!okCount} onClick={create}>ساخت {fa(okCount)} حساب</KButton></>}
            {done && created.length > 0 && <>
              <KButton variant="outline" className="flex-1" onClick={() => downloadText(`kayar-accounts-${new Date().toISOString().slice(0, 10)}.csv`, '\uFEFF' + ['name,username,tempPassword', ...created.map((r) => [r.name, r.username, r.tempPassword!].map(csvEsc).join(','))].join('\n'))}><Download className="h-4 w-4" />دانلود CSV</KButton>
              <KButton className="flex-1" onClick={() => printCards(created.map((r) => ({ name: r.name, username: r.username, password: r.tempPassword! }))).catch((e) => toast.error('چاپ کارت‌ها انجام نشد؛ دوباره تلاش کن.'))}><Printer className="h-4 w-4" />چاپ کارت‌ها</KButton>
            </>}
          </div>
        </>
      )}
    </ResponsiveModal>
  );
}
