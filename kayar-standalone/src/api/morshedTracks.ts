import { z } from 'zod';
import { createEndpoint } from '@/zite/backend';
import { zite } from '@/zite/db';
import { requireSession } from '../server/rbac';
import { tokenField } from '../server/util';
import { jamendoTracks, jamendoStatus } from '../server/jamendo';
import { trackDto, libToDto, jamToDto, playable } from '../server/tracks';
import { splitTags } from '../server/content';

const CAT_TAGS: Record<string, string> = { 'شروع قدرتی': 'rock+electronic', 'کاردیو': 'electronic+dance', 'ریکاوری': 'ambient+chillout', 'تمرکز': 'lounge+ambient', 'انرژی': 'hiphop+electronic' };
const collection = z.object({ id: z.string(), title: z.string(), slug: z.string(), description: z.string(), coverUrl: z.string(), type: z.string(), tracks: z.array(trackDto) });

export default createEndpoint({
  description: 'Morshed music for signed-in members: managed library, home collections, or live Jamendo search',
  inputSchema: z.object({
    token: tokenField,
    mode: z.enum(['library', 'home', 'jamendo']),
    q: z.string().max(80).optional(),
    cat: z.string().max(40).optional(),
    page: z.number().int().min(1).max(50).default(1),
  }),
  outputSchema: z.object({
    tracks: z.array(trackDto), collections: z.array(collection), hasMore: z.boolean(),
    jamendo: z.object({ available: z.boolean(), reason: z.enum(['ok', 'disabled', 'blocked']) }),
  }),
  execute: async ({ input }) => {
    await requireSession(input.token);
    const jamendo = await jamendoStatus();

    if (input.mode === 'jamendo') {
      if (!jamendo.available) return { tracks: [], collections: [], hasMore: false, jamendo };
      const q = input.q?.trim();
      const cat = input.cat && CAT_TAGS[input.cat] ? input.cat : 'انرژی';
      const limit = 24;
      const r = await jamendoTracks(q ? { search: q, offset: (input.page - 1) * limit, limit } : { tags: CAT_TAGS[cat], offset: (input.page - 1) * limit, limit });
      return { tracks: r.tracks.map((t) => jamToDto(t, q ? '' : cat)), collections: [], hasMore: input.page * limit < r.total, jamendo };
    }

    const { records } = await zite.tracks.findAll({ filters: { status: 'published' }, limit: 2000 });
    const pub = records.filter(playable).sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const byId = new Map(pub.map((r) => [r.id, r]));
    const placement = input.mode === 'home' ? 'home' : 'morshed';
    const cols = (await zite.collections.findAll({ filters: { status: 'published', placement }, limit: 100 })).records.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const items = cols.length ? (await zite.collectionItems.findAll({ filters: { collectionId: { in: cols.map((c) => c.id) } }, limit: 2000 })).records : [];
    const collections = cols.map((c) => ({
      id: c.id, title: c.title ?? '', slug: c.slug ?? '', description: c.description ?? '', coverUrl: c.coverUrl ?? '', type: c.type ?? 'row',
      tracks: items.filter((i) => i.collectionId === c.id).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((i) => byId.get(i.trackId ?? '')).filter((r): r is NonNullable<typeof r> => !!r).map(libToDto),
    })).filter((c) => c.tracks.length > 0);

    let list = pub;
    const q = input.q?.trim().toLowerCase();
    if (q) list = list.filter((r) => `${r.title} ${r.artist} ${r.album} ${r.tags}`.toLowerCase().includes(q));
    if (input.cat) list = list.filter((r) => splitTags(r.categories).includes(input.cat!) || splitTags(r.tags).includes(input.cat!));
    return { tracks: list.slice(0, input.mode === 'home' ? 12 : 200).map(libToDto), collections, hasMore: false, jamendo };
  },
});
