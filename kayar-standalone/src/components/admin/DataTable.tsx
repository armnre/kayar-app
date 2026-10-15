import { useMemo, useState, type ReactNode } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, type ColumnDef, type SortingState } from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, MoreVertical } from 'lucide-react';
import { Checkbox } from '@/ui/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/ui/ui/dropdown-menu';
import { cn } from '@/ui/lib/utils';
import { fa } from '../../lib/config';

export type RowAction<T> = { label: string; onClick: (row: T) => void; danger?: boolean };

/* Responsive DataTable: table on ≥640px (inner horizontal scroll on tablet), cards on mobile. */
export function DataTable<T extends { id: string }>({ data, columns, searchKeys, mobileCard, actions, toolbar, onBulk }: {
  data: T[]; columns: ColumnDef<T>[]; searchKeys: (keyof T)[]; mobileCard: (row: T) => ReactNode; actions?: RowAction<T>[]; toolbar?: ReactNode; onBulk?: (rows: T[]) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState({});
  const cols = useMemo<ColumnDef<T>[]>(() => [
    { id: 'sel', header: ({ table }) => <Checkbox checked={table.getIsAllPageRowsSelected()} onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)} aria-label="انتخاب همه" />, cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} aria-label="انتخاب" />, enableSorting: false },
    ...columns,
    ...(actions ? [{ id: 'act', header: '', enableSorting: false, cell: ({ row }: { row: { original: T } }) => <Actions row={row.original} actions={actions} /> } as ColumnDef<T>] : []),
  ], [columns, actions]);
  const table = useReactTable({
    data, columns: cols, state: { sorting, globalFilter: q, rowSelection: sel }, onSortingChange: setSorting, onGlobalFilterChange: setQ, onRowSelectionChange: setSel,
    globalFilterFn: (row, _c, v: string) => searchKeys.some((k) => String(row.original[k]).toLowerCase().includes(v.toLowerCase())),
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageSize: 8 } },
  });
  const selected = table.getSelectedRowModel().rows.map((r) => r.original);
  return (
    <div className="glass overflow-hidden rounded-[28px]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 p-3">
        <div className="relative min-w-0 flex-1 basis-56"><Search className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجو…" aria-label="جست‌وجو در جدول" className="h-11 w-full rounded-full border border-white/10 bg-white/[.04] pe-4 ps-12 text-base outline-none focus:border-primary" /></div>
        {toolbar}
      </div>
      {selected.length > 0 && onBulk && <div className="flex items-center justify-between bg-primary/10 px-4 py-2 text-sm"><span className="font-bold text-primary">{fa(selected.length)} مورد انتخاب شد</span><button className="tap font-bold text-destructive" onClick={() => onBulk(selected)}>تعلیق گروهی</button></div>}
      <div className="hidden overflow-x-auto sm:block [mask-image:linear-gradient(to_left,black_92%,transparent)] lg:[mask-image:none]">
        <table className="w-full min-w-[720px] text-start text-[15px]">
          <thead>{table.getHeaderGroups().map((hg) => <tr key={hg.id} className="border-b border-white/5 text-sm text-muted-foreground">{hg.headers.map((h) => <th key={h.id} className="whitespace-nowrap px-4 py-3 text-start font-bold">{h.column.getCanSort() ? <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={h.column.getToggleSortingHandler()}>{flexRender(h.column.columnDef.header, h.getContext())}<ArrowUpDown className="h-3.5 w-3.5" /></button> : flexRender(h.column.columnDef.header, h.getContext())}</th>)}</tr>)}</thead>
          <tbody>{table.getRowModel().rows.map((r) => <tr key={r.id} className={cn('border-b border-white/5 transition-colors hover:bg-white/[.03]', r.getIsSelected() && 'bg-primary/5')}>{r.getVisibleCells().map((c) => <td key={c.id} className="whitespace-nowrap px-4 py-3">{flexRender(c.column.columnDef.cell, c.getContext())}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <ul className="divide-y divide-white/5 sm:hidden">{table.getRowModel().rows.map((r) => <li key={r.id} className="flex items-start gap-3 p-4"><Checkbox className="mt-1" checked={r.getIsSelected()} onCheckedChange={(v) => r.toggleSelected(!!v)} aria-label="انتخاب" /><div className="min-w-0 flex-1">{mobileCard(r.original)}</div>{actions && <Actions row={r.original} actions={actions} />}</li>)}</ul>
      {table.getRowModel().rows.length === 0 && <div className="p-10 text-center text-muted-foreground">نتیجه‌ای پیدا نشد.</div>}
      <div className="flex items-center justify-between gap-2 p-3 text-sm text-muted-foreground">
        <span>صفحه‌ی {fa(table.getState().pagination.pageIndex + 1)} از {fa(Math.max(1, table.getPageCount()))}</span>
        <div className="flex gap-1">
          <button className="tap grid place-items-center rounded-full hover:bg-white/5 disabled:opacity-30" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="صفحه‌ی قبل"><ChevronRight className="h-5 w-5" /></button>
          <button className="tap grid place-items-center rounded-full hover:bg-white/5 disabled:opacity-30" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="صفحه‌ی بعد"><ChevronLeft className="h-5 w-5" /></button>
        </div>
      </div>
    </div>
  );
}

function Actions<T>({ row, actions }: { row: T; actions: RowAction<T>[] }) {
  return (
    <DropdownMenu><DropdownMenuTrigger className="tap grid place-items-center rounded-full hover:bg-white/5" aria-label="عملیات"><MoreVertical className="h-5 w-5" /></DropdownMenuTrigger>
      <DropdownMenuContent align="end">{actions.map((a) => <DropdownMenuItem key={a.label} onClick={() => a.onClick(row)} className={cn('min-h-[44px]', a.danger && 'text-destructive')}>{a.label}</DropdownMenuItem>)}</DropdownMenuContent>
    </DropdownMenu>
  );
}
