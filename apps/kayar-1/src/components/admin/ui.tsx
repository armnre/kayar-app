import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@project/components/ui/dialog';
import { Sheet, SheetContent, SheetTitle } from '@project/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import { Skeleton } from '@project/components/ui/skeleton';
import { KButton } from '../kit';

export function useIsMobile() {
  const [m, setM] = useState(() => window.matchMedia('(max-width: 639px)').matches);
  useEffect(() => { const mq = window.matchMedia('(max-width: 639px)'); const on = () => setM(mq.matches); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on); }, []);
  return m;
}

/** Dialog on ≥640px, bottom sheet on mobile. */
export function ResponsiveModal({ open, onOpenChange, title, children, wide }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; children: ReactNode; wide?: boolean }) {
  const mobile = useIsMobile();
  if (mobile) return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="bottom" dir="rtl" className="max-h-[92dvh] overflow-y-auto rounded-t-[32px] border-white/10 bg-bg1 pb-[calc(24px+var(--safe-b))]"><div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/15" /><SheetTitle className="mb-4 text-xl font-extrabold">{title}</SheetTitle>{children}</SheetContent></Sheet>;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent dir="rtl" className={`max-h-[90vh] overflow-y-auto rounded-[28px] border-white/10 bg-bg1 ${wide ? 'max-w-3xl' : 'max-w-lg'}`}><DialogTitle className="text-xl font-extrabold">{title}</DialogTitle>{children}</DialogContent></Dialog>;
}

export function PageHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div className="min-w-0"><h1 className="text-[clamp(1.5rem,4vw,2rem)] font-black">{title}</h1>{sub && <p className="text-muted-foreground">{sub}</p>}</div>{action}</div>;
}

export function Confirm({ open, onOpenChange, title, text, confirmLabel, danger, onConfirm }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; text: string; confirmLabel: string; danger?: boolean; onConfirm: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl" className="rounded-[28px] border-white/10 bg-bg1">
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription className="leading-7">{text}</AlertDialogDescription>
        <AlertDialogFooter className="gap-2 sm:gap-2"><AlertDialogCancel className="min-h-[44px] rounded-full">انصراف</AlertDialogCancel><AlertDialogAction onClick={onConfirm} className={`min-h-[44px] rounded-full ${danger ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}`}>{confirmLabel}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const ListSkeleton = ({ rows = 5 }: { rows?: number }) => <div className="space-y-2 p-3">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-14 w-full rounded-2xl bg-white/5" />)}</div>;

export const ErrorState = ({ text, onRetry }: { text: string; onRetry: () => void }) => (
  <div className="flex flex-col items-center gap-3 p-10 text-center"><AlertTriangle className="h-8 w-8 text-destructive" /><p className="text-muted-foreground">{text}</p><KButton variant="outline" onClick={onRetry}><RotateCw className="h-4 w-4" />تلاش دوباره</KButton></div>
);

export const fmtDate = (iso: string | null | undefined, withTime = false) =>
  iso ? new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'short', day: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}), timeZone: 'Asia/Tehran' }).format(new Date(iso)) : '—';
