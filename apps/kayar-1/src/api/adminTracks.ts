import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite, type TracksRecordType } from 'zitejs/db';
import { requireStaff } from '../server/rbac';
import { audit } from '../server/audit';
import { tokenField } from '../server/util';
import { bad, splitTags, joinTags } from '../server/content';
import { jamendoTracks, jamendoStatus } from '../server/jamendo';

const trackOut = z.object({
  id: z.string(), title: z.string(), artist: z.string(), album: z.string(), source: z.string(), sourceId: z.string(), coverUrl: z.string(), audioUrl: z.string(),
  duration: z.number(), licenseUrl: z.string(), shareUrl: z.string(), rights: z.string(), categories: z.array(z.string()), tags: z.array(z.string()),
  featured: z.boolean(), status: z.string(), sortOrder: z.number(),
});
const jamOut = z.object({ id: z.string(), title: z.string(), artist: z.string(), album: z.string(), duration: z.number(), image: z.string(), audio: z.string(), shareUrl: z.string(), licenseUrl: z.string(), license: z.string(), added: z.boolean() });
const toOut = (r: TracksRecordType) => ({
  id: r.id, title: r.title ?? '', artist: r.artist ?? '', album: r.album ?? '', source: r.source ?? '', sourceId: r.sourceId ?? '', coverUrl: r.coverUrl ?? '', audioUrl: r.audioUrl ?? '',
  duration: r.durationSeconds ?? 0, licenseUrl: r.licenseUrl ?? '', shareUrl: r.shareUrl ?? '', rights: r.rights ?? '', categories: splitTags(r.categories), tags: splitTags(r.tags),
  featured: !!r.isFeatured, status: r.status ?? 'draft', sortOrder: r.sortOrder ?? 0,
});

export default createEndpoint({
  description: 'Admin management of the Morshed track library and Jamendo search/import',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['list', 'jamendoSearch', 'addJamendo', 'update', 'reorder', 'delete']),
    q: z.string().max(80).optional(),
    tags: z.string().max(80).optional(),
    order: z.enum(['popularity_month', 'popularity_week', 'releasedate_desc', 'relevance']).optional(),
    page: z.number().int().min(1).max(50).default(1),
    id: z.string().max(64).optional(),
    jamendoId: z.string().regex(/^\d{1,20}$/).optional(),
    ids: z.array(z.string().max(64)).max(500).optional(),
    patch: z.object({
      title: z.string().trim().min(1).max(160), artist: z.string().trim().max(120), album: z.string().trim().max(160), rights: z.string().max(1000),
      categories: z.array(z.string().max(40)).max(10), tags: z.array(z.string().max(40)).max(15), featured: z.boolean(), status: z.enum(['draft', 'published', 'hidden']),
    }).optional(),
  }),
  outputSchema: z.object({ tracks: z.array(trackOut), jamendo: z.array(jamOut), hasMore: z.boolean(), status: z.object({ available: z.boolean(), reason: z.string(), configured: z.boolean() }) }),
  execute: async ({ input }) => {
    const { member } = await requireStaff(input.token, 'morshed.manage');
    const st = await jamendoStatus();
    const status = { ...st, configured: !!process.env.ZITE_JAMENDO_CLIENT_ID };
    const all = async () => (await zite.tracks.findAll({ filters: { status: { not: 'deleted' } }, limit: 2000 })).records;

    if (input.action === 'jamendoSearch') {
      if (!status.configured) return { tracks: [], jamendo: [], hasMore: false, status };
      const limit = 20;
      const r = await jamendoTracks({ search: input.q?.trim() || undefined, tags: input.tags?.trim() || undefined, order: input.order, offset: (input.page - 1) * limit, limit });
      const existing = new Set((await all()).filter((t) => t.source === 'jamendo').map((t) => t.sourceId));
      return { tracks: [], jamendo: r.tracks.map((t) => ({ ...t, added: existing.has(t.id) })), hasMore: input.page * limit < r.total, status };
    }
    if (input.action === 'addJamendo') {
      if (!input.jamendoId) throw bad('آهنگ مشخص نشده است.');
      if (!status.configured) throw bad('منبع Jamendo تنظیم نشده است.');
      const dup = await zite.tracks.findAll({ filters: { source: 'jamendo', sourceId: input.jamendoId }, limit: 5 });
      if (dup.records.some((r) => r.status !== 'deleted')) throw bad('این آهنگ قبلاً به کتابخانه اضافه شده است.');
      // Re-fetch from Jamendo on the server: never trust track data sent by the browser.
      const { tracks } = await jamendoTracks({ ids: [input.jamendoId], limit: 1 });
      const t = tracks[0];
      if (!t) throw bad('این آهنگ در Jamendo پیدا نشد یا لینک پخش ندارد.');
      const max = Math.max(0, ...(await all()).map((r) => r.sortOrder ?? 0));
      const c = await zite.tracks.create({ record: {
        title: t.title, artist: t.artist, album: t.album, source: 'jamendo', sourceId: t.id, coverUrl: t.image, audioUrl: t.audio, durationSeconds: t.duration,
        licenseUrl: t.licenseUrl, shareUrl: t.shareUrl, rights: `${t.license || 'Creative Commons'} — منبع: Jamendo. پیش از استفاده‌ی تجاری بررسی شود.`, categories: '', tags: '',
        isFeatured: false, status: 'draft', sortOrder: max + 1,
      } });
      await audit(member.id, 'track.add', 'track', c.id, { source: 'jamendo', sourceId: t.id });
    } else if (input.action === 'update') {
      const cur = input.id ? await zite.tracks.findOne({ id: input.id }) : undefined;
      if (!cur || cur.status === 'deleted' || !input.patch) throw bad('آهنگ پیدا نشد.');
      const p = input.patch;
      if (p.status === 'published' && !cur.audioUrl?.startsWith('https://')) throw bad('این آهنگ لینک پخش معتبر ندارد و قابل انتشار نیست.');
      if (p.status === 'published' && !cur.licenseUrl && !p.rights.trim()) throw bad('برای انتشار، اطلاعات مجوز/حقوق را ثبت کن.');
      await zite.tracks.update({ id: cur.id, record: { title: p.title, artist: p.artist, album: p.album, rights: p.rights, categories: joinTags(p.categories), tags: joinTags(p.tags), isFeatured: p.featured, status: p.status } });
      await audit(member.id, cur.status !== p.status ? `track.${p.status === 'published' ? 'publish' : p.status === 'hidden' ? 'hide' : 'unpublish'}` : 'track.update', 'track', cur.id, { from: cur.status, to: p.status });
    } else if (input.action === 'reorder') {
      const ids = input.ids ?? [];
      const valid = new Set((await all()).map((r) => r.id));
      await Promise.all(ids.filter((id) => valid.has(id)).map((id, i) => zite.tracks.update({ id, record: { sortOrder: i + 1 } })));
      await audit(member.id, 'track.reorder', 'track', '', { count: ids.length });
    } else if (input.action === 'delete') {
      const cur = input.id ? await zite.tracks.findOne({ id: input.id }) : undefined;
      if (!cur || cur.status === 'deleted') throw bad('آهنگ پیدا نشد.');
      await zite.tracks.update({ id: cur.id, record: { status: 'deleted' } });
      const items = await zite.collectionItems.findAll({ filters: { trackId: cur.id }, limit: 500 });
      await Promise.all(items.records.map((i) => zite.collectionItems.delete({ id: i.id })));
      await audit(member.id, 'track.delete', 'track', cur.id, { title: cur.title });
    }

    let tracks = (await all()).map(toOut).sort((a, b) => a.sortOrder - b.sortOrder);
    const q = input.action === 'list' ? input.q?.trim().toLowerCase() : '';
    if (q) tracks = tracks.filter((t) => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(q));
    return { tracks, jamendo: [], hasMore: false, status };
  },
});
