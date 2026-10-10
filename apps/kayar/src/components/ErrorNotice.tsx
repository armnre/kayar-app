import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

/** Shared, animated inline error used across forms in the whole app. */
export default function ErrorNotice({ err, onClose, className = '' }: { err?: string; onClose?: () => void; className?: string }) {
  return (
    <AnimatePresence>
      {err && (
        <motion.div key={err} role="alert" aria-live="assertive"
          initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          className={`overflow-hidden ${className}`}>
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-gradient-to-l from-destructive/15 to-destructive/5 px-4 py-3 text-sm leading-7 text-foreground shadow-[0_10px_30px_-15px_hsl(var(--destructive)/.6)]">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-destructive/20 text-destructive"><AlertCircle className="h-4 w-4" /></span>
            <span className="flex-1">{err}</span>
            {onClose && <button type="button" onClick={onClose} aria-label="بستن" className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
