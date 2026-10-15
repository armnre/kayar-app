import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/ui/lib/utils';

/** Vertical sortable list: drag (mouse/touch/keyboard) plus explicit up/down buttons as an accessible alternative. */
function Row({ id, children, onUp, onDown }: { id: string; children: ReactNode; onUp?: () => void; onDown?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn('glass flex items-center gap-2 rounded-2xl p-2', isDragging && 'z-10 ring-1 ring-primary')}>
      <button {...attributes} {...listeners} className="tap grid cursor-grab touch-none place-items-center text-muted-foreground" aria-label="جابه‌جایی با کشیدن"><GripVertical className="h-5 w-5" /></button>
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex flex-col"><button disabled={!onUp} onClick={onUp} className="grid h-6 w-8 place-items-center text-muted-foreground disabled:opacity-20" aria-label="بالا"><ChevronUp className="h-4 w-4" /></button><button disabled={!onDown} onClick={onDown} className="grid h-6 w-8 place-items-center text-muted-foreground disabled:opacity-20" aria-label="پایین"><ChevronDown className="h-4 w-4" /></button></div>
    </li>
  );
}

export function SortableList<T extends { id: string }>({ items, onReorder, render }: { items: T[]; onReorder: (next: T[]) => void; render: (t: T) => ReactNode }) {
  const [list, setList] = useState(items);
  useEffect(() => setList(items), [items]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const commit = useCallback((next: T[]) => { setList(next); onReorder(next); }, [onReorder]);
  const end = (e: DragEndEvent) => { if (e.over && e.active.id !== e.over.id) commit(arrayMove(list, list.findIndex((x) => x.id === e.active.id), list.findIndex((x) => x.id === e.over!.id))); };
  const move = (i: number, d: number) => commit(arrayMove(list, i, i + d));
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
      <SortableContext items={list.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">{list.map((t, i) => <Row key={t.id} id={t.id} onUp={i > 0 ? () => move(i, -1) : undefined} onDown={i < list.length - 1 ? () => move(i, 1) : undefined}>{render(t)}</Row>)}</ul>
      </SortableContext>
    </DndContext>
  );
}
