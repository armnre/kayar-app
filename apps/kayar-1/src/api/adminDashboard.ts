import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireStaff } from '../server/rbac';
import { tokenField } from '../server/util';

const n = (v: unknown) => Number(v ?? 0);

export default createEndpoint({
  description: 'Real dashboard stats: customers, logins and plays over the last 7 days, top tracks, recent activity',
  inputSchema: z.object({ token: tokenField }),
  outputSchema: z.object({
    customers: z.object({ total: z.number(), active: z.number(), neverLoggedIn: z.number(), mustChange: z.number() }),
    posts: z.number(), publishedTracks: z.number(),
    days: z.array(z.object({ date: z.string(), logins: z.number(), plays: z.number() })),
    topTracks: z.array(z.object({ title: z.string(), artist: z.string(), plays: z.number() })),
    recent: z.array(z.object({ action: z.string(), actor: z.string(), at: z.string() })),
  }),
  execute: async ({ input }) => {
    await requireStaff(input.token, 'dashboard.read');
    const [c, p, t, logins, plays, top, recent] = await Promise.all([
      zite.sql({ query: `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE "status"='active') AS active, COUNT(*) FILTER (WHERE "lastLoginAt" IS NULL) AS never, COUNT(*) FILTER (WHERE "mustChangePassword" = true) AS must FROM "Members" WHERE "role"='member' AND "status" <> 'deleted'` }),
      zite.sql({ query: `SELECT COUNT(*) AS n FROM "Posts" WHERE "status"='published'` }),
      zite.sql({ query: `SELECT COUNT(*) AS n FROM "Tracks" WHERE "status"='published'` }),
      zite.sql({ query: `SELECT to_char(created_at AT TIME ZONE 'Asia/Tehran','YYYY-MM-DD') AS d, COUNT(*) AS n FROM "AuditLogs" WHERE "action"='auth.login' AND created_at >= now() - interval '7 days' GROUP BY 1` }),
      zite.sql({ query: `SELECT to_char("playedAt" AT TIME ZONE 'Asia/Tehran','YYYY-MM-DD') AS d, COUNT(*) AS n FROM "ListeningHistory" WHERE "playedAt" >= now() - interval '7 days' GROUP BY 1` }),
      zite.sql({ query: `SELECT tr."title" AS title, tr."artist" AS artist, COUNT(*) AS n FROM "ListeningHistory" h JOIN "Tracks" tr ON ('lib:' || tr.id::text) = h."trackId" WHERE h."playedAt" >= now() - interval '30 days' GROUP BY tr.id ORDER BY n DESC LIMIT 5` }),
      zite.sql({ query: `SELECT a."action" AS action, COALESCE(m."displayName", m."username", 'سیستم') AS actor, a.created_at AS at FROM "AuditLogs" a LEFT JOIN "Members" m ON m.id::text = a."actorId" WHERE a."action" NOT IN ('auth.login','auth.login_failed') ORDER BY a.created_at DESC LIMIT 8` }),
    ]);
    const lm = new Map(logins.rows.map((r) => [String(r.d), n(r.n)]));
    const pm = new Map(plays.rows.map((r) => [String(r.d), n(r.n)]));
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 86400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });
      return { date: d, logins: lm.get(d) ?? 0, plays: pm.get(d) ?? 0 };
    });
    const r0 = c.rows[0] ?? {};
    return {
      customers: { total: n(r0.total), active: n(r0.active), neverLoggedIn: n(r0.never), mustChange: n(r0.must) },
      posts: n(p.rows[0]?.n), publishedTracks: n(t.rows[0]?.n), days,
      topTracks: top.rows.map((r) => ({ title: String(r.title ?? ''), artist: String(r.artist ?? ''), plays: n(r.n) })),
      recent: recent.rows.map((r) => ({ action: String(r.action), actor: String(r.actor), at: String(r.at) })),
    };
  },
});
