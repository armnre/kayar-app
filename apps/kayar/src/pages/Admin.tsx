import { useState, type ReactNode } from 'react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Upload, GripVertical, ImagePlus, Save, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { MarkdownEditor } from '@project/components/markdown-editor';
import { cn } from '@project/components/lib/utils';
import { KButton, Glass, SampleBadge, StatusBadge, FloatInput, Cover, StateView, KayarLogo } from '../components/kit';
import { tracks, posts } from '../data/sample';
import { faDate } from '../lib/config';
export { ResponsiveModal } from '../components/admin/ui';
export { AdminDashboard, AdminSettings, AdminAudit } from './admin/System';
import { MembersPage } from './admin/Members';
export const AdminCustomers = () => <MembersPage kind="customer" />;
export const AdminStaff = () => <MembersPage kind="staff" />;

function PageHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="flex items-center gap-2 text-[clamp(1.5rem,4vw,2rem)] font-black">{title}<SampleBadge /></h1>{sub && <p className="text-muted-foreground">{sub}</p>}</div>{action}</div>;
}

export function AdminContent() {
  const [title, setTitle] = useState('تیشرتت رو پوشیدی؟ حالا همراهت رو داری');
  const [sub, setSub] = useState('موزیک مخصوص ورزش و برنامه‌ی تمرین و تغذیه‌ی هوشمند، فقط برای خریداران کاپوش.');
  const [cta, setCta] = useState('ورود به کایار');
  return (
    <div>
      <PageHead title="محتوای سایت" sub="ویرایش بخش هیرو با پیش‌نمایش زنده" action={<KButton onClick={() => toast('ذخیره در فاز ۱')}><Save className="h-5 w-5" />ذخیره</KButton>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Glass className="space-y-4 p-5"><div className="font-bold">هیرو</div><FloatInput id="t" label="تیتر" value={title} onChange={setTitle} /><FloatInput id="s" label="زیرتیتر" value={sub} onChange={setSub} /><FloatInput id="c" label="متن دکمه" value={cta} onChange={setCta} /></Glass>
        <div className="noise relative overflow-hidden rounded-[28px] border border-white/10 p-6 depth-bg"><div className="mb-3 text-xs text-muted-foreground">پیش‌نمایش زنده</div><KayarLogo className="text-sm" /><h2 className="mt-6 text-3xl font-black leading-snug">{title}</h2><p className="mt-3 text-muted-foreground">{sub}</p><span className="mt-5 inline-flex h-12 items-center rounded-full bg-primary px-6 font-bold text-primary-foreground">{cta}</span></div>
      </div>
    </div>
  );
}

export function AdminPosts() {
  const [editing, setEditing] = useState<string | null>(null);
  const [body, setBody] = useState('## عنوان بخش\n\nمتن مطلب را این‌جا بنویس…');
  if (editing !== null) return (
    <div>
      <PageHead title={editing ? 'ویرایش مطلب' : 'مطلب جدید'} action={<div className="flex gap-2"><KButton variant="outline" onClick={() => setEditing(null)}>بازگشت</KButton><KButton onClick={() => toast('انتشار در فاز ۱')}>انتشار</KButton></div>} />
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Glass className="p-4"><input defaultValue={posts.find((p) => p.slug === editing)?.title} placeholder="عنوان مطلب" aria-label="عنوان" className="mb-4 h-14 w-full bg-transparent text-2xl font-black outline-none" /><MarkdownEditor content={body} onChange={setBody} className="min-h-[320px] rounded-2xl border border-white/10" /></Glass>
        <Glass className="space-y-4 p-4"><div className="font-bold">تنظیمات</div><FloatInput id="slug" label="نامک (slug)" value={editing || ''} onChange={() => {}} dir="ltr" /><label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-white/15 p-6 text-sm text-muted-foreground"><ImagePlus className="mb-2 h-8 w-8 text-primary" />تصویر شاخص<input type="file" accept="image/*" className="sr-only" /></label></Glass>
      </div>
    </div>
  );
  return (
    <div>
      <PageHead title="مطالب" action={<KButton onClick={() => setEditing('')}><Plus className="h-5 w-5" />مطلب جدید</KButton>} />
      <div className="grid gap-3">{posts.map((p, i) => <button key={p.slug} onClick={() => setEditing(p.slug)} className="glass press flex items-center gap-4 rounded-3xl p-4 text-start"><div className="min-w-0 flex-1"><div className="truncate font-bold">{p.title}</div><div className="text-sm text-muted-foreground">{p.tag} · {faDate(p.date)}</div></div><StatusBadge status={i === 3 ? 'draft' : 'published'} /></button>)}</div>
    </div>
  );
}

export function AdminMedia() {
  return (
    <div>
      <PageHead title="کتابخانه‌ی رسانه" action={<label className="press tap inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground"><Upload className="h-5 w-5" />آپلود<input type="file" className="sr-only" onChange={() => toast('آپلود در فاز ۱')} /></label>} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 min-[1440px]:grid-cols-6">
        <img src="https://images.fillout.com/888622/bvjezbu9kd/generated-images/m7CVfYZ1XxoDXoHHPmRnjU/img_6hSskSlC6BwCKZ21.jpg" alt="hero-athlete-male" loading="lazy" className="aspect-square w-full rounded-3xl object-cover" />
        <img src="https://images.fillout.com/888622/bvjezbu9kd/generated-images/oxqDevwEubgV7SsJVPNB4N/img_n1JeLq9Rzgrcbrl3.jpg" alt="hero-athlete-female" loading="lazy" className="aspect-square w-full rounded-3xl object-cover" />
        <img src="https://images.fillout.com/888622/bvjezbu9kd/generated-images/afjACL6i7DDEtnZvwFmFHK/img_oPmkOrwF9MOWO-W_.jpg" alt="morshed-hero" loading="lazy" className="aspect-square w-full rounded-3xl object-cover" />
        <img src="https://images.fillout.com/888622/bvjezbu9kd/generated-images/jiupv5n9JM5Wv8yQ6PGx9P/img_0dCMOm1WQh9f_X8K.jpg" alt="lifestyle-run-dawn" loading="lazy" className="aspect-square w-full rounded-3xl object-cover" />
      </div>
    </div>
  );
}

function SortTrack({ t }: { t: (typeof tracks)[0] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  return <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn('glass flex items-center gap-3 rounded-2xl p-2', isDragging && 'glass-active z-10')}><button {...attributes} {...listeners} className="tap grid cursor-grab touch-none place-items-center text-muted-foreground" aria-label="جابه‌جایی"><GripVertical className="h-5 w-5" /></button><Cover hue={t.hue} className="h-11 w-11 shrink-0 rounded-xl" /><div className="min-w-0 flex-1"><div className="truncate font-bold">{t.title}</div><div className="truncate text-sm text-muted-foreground">{t.artist} · {t.cat}</div></div><span className="hidden rounded-full bg-white/5 px-2 py-1 text-xs sm:inline">{t.license}</span></li>;
}
export function AdminMorshed() {
  const [items, setItems] = useState(tracks);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const end = (e: DragEndEvent) => { if (e.over && e.active.id !== e.over.id) setItems((s) => arrayMove(s, s.findIndex((x) => x.id === e.active.id), s.findIndex((x) => x.id === e.over!.id))); };
  return (
    <div>
      <PageHead title="مرشد" sub="ترتیب آهنگ‌های مجموعه‌ی «پیشنهاد برای تو» را با کشیدن تغییر بده" action={<KButton onClick={() => toast('افزودن آهنگ در فاز ۱')}><Plus className="h-5 w-5" />آهنگ</KButton>} />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}><SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}><ul className="space-y-2">{items.map((t) => <SortTrack key={t.id} t={t} />)}</ul></SortableContext></DndContext>
    </div>
  );
}

export function AdminPlaceholder({ kind }: { kind: 'announcements' }) {
  const m = { announcements: { t: 'اعلان‌ها', icon: Megaphone, d: 'اعلان‌های مدیر که در خانه‌ی اپ نمایش داده می‌شوند.' } }[kind];
  return <div><PageHead title={m.t} /><Glass><StateView icon={m.icon} title={'هنوز اعلانی نیست'} text={m.d} action={<KButton onClick={() => toast('در فاز ۱ فعال می‌شود')}><Plus className="h-5 w-5" />افزودن</KButton>} /></Glass></div>;
}


