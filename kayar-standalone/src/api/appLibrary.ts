import { z } from 'zod';
import { createEndpoint } from '@/zite/backend';
import { zite } from '@/zite/db';
import { requireSession } from '../server/rbac';
import { tokenField } from '../server/util';
import { bad } from '../server/content';
import { trackDto, resolveKeys } from '../server/tracks';

const keyField = z.string().regex(/^(lib:[\w-]{1,64}|jam:\d{1,20})$/);

export default createEndpoint({
  description: "Signed-in member's favorites, listening history and resume position (owner-scoped)",
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['favKeys', 'favorites', 'toggleFav', 'history', 'progress', 'resume']),
    key: keyField.optional(),
    position: z.number().min(0).max(24 * 3600).optional(),
    completed: z.boolean().optional(),
  }),
  outputSchema: z.object({
    favKeys: z.array(z.string()),
    favorites: z.array(z.object({ key: z.string(), track: trackDto.nullable() })),
    history: z.array(z.object({ key: z.string(), track: trackDto.nullable(), positionSec: z.number(), completed: z.boolean(), playedAt: z.string().nullable() })),
    position: z.number(),
  }),
  execute: async ({ input }) => {
    // memberId always comes from the session, never from input — no writing into someone else's data.
    const { member } = await requireSession(input.token);
    const memberId = member.id;
    const out = { favKeys: [] as string[], favorites: [] as { key: string; track: z.infer<typeof trackDto> | null }[], history: [] as { key: string; track: z.infer<typeof trackDto> | null; positionSec: number; completed: boolean; playedAt: string | null }[], position: 0 };
    const needKey = () => { if (!input.key) throw bad('آهنگ مشخص نشده است.'); return input.key; };

    if (input.action === 'toggleFav') {
      const key = needKey();
      const ex = await zite.favorites.findOne({ filters: { memberId, trackId: key } });
      if (ex) await zite.favorites.delete({ id: ex.id });
      else await zite.favorites.create({ record: { memberId, trackId: key } });
    }
    if (input.action === 'progress') {
      const key = needKey();
      const { records } = await zite.listeningHistory.findAll({ filters: { memberId, trackId: key }, limit: 50 });
      const last = records.sort((a, b) => String(b.playedAt).localeCompare(String(a.playedAt)))[0];
      const now = new Date().toISOString();
      const rec = { positionSec: Math.round(input.position ?? 0), completed: !!input.completed, playedAt: now };
      // one row per listening session (same track within 6h continues the row)
      if (last && last.playedAt && Date.now() - new Date(last.playedAt).getTime() < 6 * 3600_000) await zite.listeningHistory.update({ id: last.id, record: rec });
      else await zite.listeningHistory.create({ record: { memberId, trackId: key, ...rec } });
      return out;
    }
    if (input.action === 'resume') {
      const { records } = await zite.listeningHistory.findAll({ filters: { memberId, trackId: needKey() }, limit: 50 });
      const last = records.sort((a, b) => String(b.playedAt).localeCompare(String(a.playedAt)))[0];
      out.position = last && !last.completed ? last.positionSec ?? 0 : 0;
      return out;
    }
    if (input.action === 'history') {
      const r = await zite.sql({ query: `SELECT DISTINCT ON ("trackId") "trackId" AS k, "positionSec" AS p, "completed" AS c, "playedAt" AS at FROM "ListeningHistory" WHERE "memberId" = $1 ORDER BY "trackId", "playedAt" DESC LIMIT 200`, params: [memberId] });
      const rows = r.rows.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 30);
      const map = await resolveKeys(rows.map((x) => String(x.k)));
      out.history = rows.map((x) => ({ key: String(x.k), track: map.get(String(x.k)) ?? null, positionSec: Number(x.p ?? 0), completed: !!x.c, playedAt: x.at ? new Date(String(x.at)).toISOString() : null }));
      return out;
    }
    const { records } = await zite.favorites.findAll({ filters: { memberId }, limit: 1000 });
    out.favKeys = records.map((r) => r.trackId ?? '').filter(Boolean);
    if (input.action === 'favorites') {
      const map = await resolveKeys(out.favKeys);
      out.favorites = out.favKeys.map((k) => ({ key: k, track: map.get(k) ?? null }));
    }
    return out;
  },
});
