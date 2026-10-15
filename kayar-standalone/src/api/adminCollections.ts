import { z } from 'zod';
import { createEndpoint } from '@/zite/backend';
import { zite } from '@/zite/db';
import { requireStaff } from '../server/rbac';
import { audit } from '../server/audit';
import { tokenField } from '../server/util';
import { bad, SLUG_RE, slugField } from '../server/content';

const colOut = z.object({ id: z.string(), title: z.string(), slug: z.string(), description: z.string(), coverUrl: z.string(), type: z.string(), placement: z.string(), status: z.string(), sortOrder: z.number(), count: z.number() });
const itemOut = z.object({ id: z.string(), trackId: z.string(), title: z.string(), artist: z.string(), coverUrl: z.string(), status: z.string() });

export default createEndpoint({
  description: 'Admin management of Morshed collections/playlists and their ordered tracks',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['list', 'save', 'delete', 'reorder', 'items', 'addItem', 'removeItem', 'reorderItems']),
    id: z.string().max(64).optional(),
    trackId: z.string().max(64).optional(),
    itemId: z.string().max(64).optional(),
    ids: z.array(z.string().max(64)).max(500).optional(),
    data: z.object({
      title: z.string().trim().min(1).max(120), slug: slugField, description: z.string().trim().max(500), coverUrl: z.string().max(600),
      type: z.enum(['row', 'playlist']), placement: z.enum(['home', 'morshed']), status: z.enum(['draft', 'published', 'hidden']),
    }).optional(),
  }),
  outputSchema: z.object({ collections: z.array(colOut), items: z.array(itemOut) }),
  execute: async ({ input }) => {
    const { member } = await requireStaff(input.token, 'morshed.manage');
    const getCol = async () => { const c = input.id ? await zite.collections.findOne({ id: input.id }) : undefined; if (!c || c.status === 'deleted') throw bad('مجموعه پیدا نشد.'); return c; };
    const itemsOf = async (cid: string) => (await zite.collectionItems.findAll({ filters: { collectionId: cid }, limit: 2000 })).records.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    let itemsFor: string | null = null;

    if (input.action === 'save') {
      const d = input.data;
      if (!d) throw bad('اطلاعات مجموعه ارسال نشده است.');
      if (!SLUG_RE.test(d.slug)) throw bad('نامک فقط می‌تواند حروف، عدد و خط تیره داشته باشد.');
      if (d.coverUrl && !/^https:\/\//.test(d.coverUrl)) throw bad('کاور باید از کتابخانه‌ی رسانه انتخاب شود.');
      const dup = await zite.collections.findAll({ filters: { slug: d.slug }, limit: 5 });
      if (dup.records.some((r) => r.id !== input.id && r.status !== 'deleted')) throw bad('این نامک برای مجموعه‌ی دیگری استفاده شده است.');
      if (input.id) {
        const cur = await getCol();
        await zite.collections.update({ id: cur.id, record: d });
        await audit(member.id, 'collection.update', 'collection', cur.id, { from: cur.status, to: d.status });
      } else {
        const max = Math.max(0, ...(await zite.collections.findAll({ limit: 500 })).records.map((r) => r.sortOrder ?? 0));
        const c = await zite.collections.create({ record: { ...d, sortOrder: max + 1 } });
        await audit(member.id, 'collection.create', 'collection', c.id, { slug: d.slug });
      }
    } else if (input.action === 'delete') {
      const cur = await getCol();
      await zite.collections.update({ id: cur.id, record: { status: 'deleted', slug: `${cur.slug}-deleted-${Date.now().toString(36)}` } });
      await audit(member.id, 'collection.delete', 'collection', cur.id);
    } else if (input.action === 'reorder') {
      await Promise.all((input.ids ?? []).map((id, i) => zite.collections.update({ id, record: { sortOrder: i + 1 } })));
      await audit(member.id, 'collection.reorder', 'collection', '');
    } else if (input.action !== 'list') {
      const cur = await getCol();
      itemsFor = cur.id;
      if (input.action === 'addItem') {
        const t = input.trackId ? await zite.tracks.findOne({ id: input.trackId }) : undefined;
        if (!t || t.status === 'deleted') throw bad('آهنگ پیدا نشد.');
        const items = await itemsOf(cur.id);
        if (items.some((i) => i.trackId === t.id)) throw bad('این آهنگ قبلاً در مجموعه هست.');
        await zite.collectionItems.create({ record: { collectionId: cur.id, trackId: t.id, sortOrder: items.length + 1 } });
        await audit(member.id, 'collection.add_track', 'collection', cur.id, { trackId: t.id });
      } else if (input.action === 'removeItem') {
        const it = input.itemId ? await zite.collectionItems.findOne({ id: input.itemId }) : undefined;
        if (!it || it.collectionId !== cur.id) throw bad('آیتم پیدا نشد.');
        await zite.collectionItems.delete({ id: it.id });
        await audit(member.id, 'collection.remove_track', 'collection', cur.id, { trackId: it.trackId });
      } else if (input.action === 'reorderItems') {
        const own = new Set((await itemsOf(cur.id)).map((i) => i.id));
        await Promise.all((input.ids ?? []).filter((id) => own.has(id)).map((id, i) => zite.collectionItems.update({ id, record: { sortOrder: i + 1 } })));
        await audit(member.id, 'collection.reorder_tracks', 'collection', cur.id);
      }
    }

    const cols = (await zite.collections.findAll({ filters: { status: { not: 'deleted' } }, limit: 500 })).records;
    const counts = cols.length ? await zite.sql({ query: `SELECT "collectionId" AS c, COUNT(*) AS n FROM "CollectionItems" GROUP BY 1` }) : { rows: [] };
    const cnt = new Map<string, number>(counts.rows.map((r) => [String(r.c), Number(r.n)] as [string, number]));
    let items: z.infer<typeof itemOut>[] = [];
    if (itemsFor) {
      const its = await itemsOf(itemsFor);
      const ts = its.length ? (await zite.tracks.findAll({ filters: { id: { in: its.map((i) => i.trackId ?? '').filter(Boolean) } }, limit: 2000 })).records : [];
      const tm = new Map(ts.map((t) => [t.id, t]));
      items = its.map((i) => { const t = tm.get(i.trackId ?? ''); return { id: i.id, trackId: i.trackId ?? '', title: t?.title ?? 'آهنگ حذف‌شده', artist: t?.artist ?? '', coverUrl: t?.coverUrl ?? '', status: t?.status ?? 'deleted' }; });
    }
    return {
      collections: cols.map((c) => ({ id: c.id, title: c.title ?? '', slug: c.slug ?? '', description: c.description ?? '', coverUrl: c.coverUrl ?? '', type: c.type ?? 'row', placement: c.placement ?? 'morshed', status: c.status ?? 'draft', sortOrder: c.sortOrder ?? 0, count: cnt.get(c.id) ?? 0 })).sort((a, b) => a.sortOrder - b.sortOrder),
      items,
    };
  },
});
