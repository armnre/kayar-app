import { Mic2 } from 'lucide-react';
import { StateView } from '../kit';

/** Podcasts stay off until a real, supportable source is chosen (see docs/DECISIONS.md). */
export function Podcasts() {
  return <div className="mt-6"><StateView icon={Mic2} tone="violet" title="پادکست‌ها به‌زودی" text="داریم منبع معتبر و قابل‌پشتیبانی برای پادکست‌های ورزشی فارسی انتخاب می‌کنیم. فعلاً از موزیک‌های مرشد لذت ببر." /></div>;
}
