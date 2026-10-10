import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireStaff } from '../server/rbac';
import { tokenField, pageInput } from '../server/util';

export default createEndpoint({
  description: 'Lists audit log entries filtered by actor, action and date',
  inputSchema: z.object({ token: tokenField, q: z.string().max(80).optional(), action: z.string().max(60).optional(), from: z.string().max(30).optional(), to: z.string().max(30).optional(), ...pageInput }),
  outputSchema: z.object({ rows: z.array(z.object({ id: z.string(), action: z.string(), actor: z.string(), targetType: z.string(), targetId: z.string(), meta: z.string(), at: z.string() })), total: z.number(), actions: z.array(z.string()) }),
  execute: async ({ input }) => {
    await requireStaff(input.token, 'audit.read');
    const params: unknown[] = [];
    const where = ['TRUE'];
    if (input.action) { params.push(input.action); where.push(`a."action" = $${params.length}`); }
    if (input.from) { params.push(input.from); where.push(`a.created_at >= $${params.length}::timestamptz`); }
    if (input.to) { params.push(input.to); where.push(`a.created_at < ($${params.length}::timestamptz + interval '1 day')`); }
    if (input.q?.trim()) { params.push(`%${input.q.trim().toLowerCase()}%`); where.push(`(LOWER(COALESCE(m."displayName",'')) LIKE $${params.length} OR LOWER(COALESCE(m."username",'')) LIKE $${params.length})`); }
    const from = `FROM "AuditLogs" a LEFT JOIN "Members" m ON m.id::text = a."actorId" WHERE ${where.join(' AND ')}`;
    const [rows, count, actions] = await Promise.all([
      zite.sql({ query: `SELECT a.id, a."action" AS action, COALESCE(m."displayName", m."username", a."actorId") AS actor, a."targetType" AS tt, a."targetId" AS tid, a."meta" AS meta, a.created_at AS at ${from} ORDER BY a.created_at DESC LIMIT ${input.pageSize} OFFSET ${(input.page - 1) * input.pageSize}`, params }),
      zite.sql({ query: `SELECT COUNT(*) AS n ${from}`, params }),
      zite.sql({ query: `SELECT DISTINCT "action" AS action FROM "AuditLogs" ORDER BY 1 LIMIT 200` }),
    ]);
    return {
      rows: rows.rows.map((r) => ({ id: String(r.id), action: String(r.action ?? ''), actor: String(r.actor ?? ''), targetType: String(r.tt ?? ''), targetId: String(r.tid ?? ''), meta: String(r.meta ?? ''), at: String(r.at) })),
      total: Number(count.rows[0]?.n ?? 0),
      actions: actions.rows.map((r) => String(r.action)),
    };
  },
});
