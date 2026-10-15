import { z } from 'zod';
import { createEndpoint, ZiteError } from '@/zite/backend';
import { zite } from '@/zite/db';
import { requireSession } from '../server/rbac';
import { tokenField } from '../server/util';

export default createEndpoint({
  description: 'Lists or revokes the signed-in member active sessions',
  inputSchema: z.object({ token: tokenField, revokeId: z.string().max(64).optional() }),
  outputSchema: z.object({ sessions: z.array(z.object({ id: z.string(), userAgent: z.string(), createdAt: z.string().nullable(), lastSeenAt: z.string().nullable(), current: z.boolean() })) }),
  execute: async ({ input }) => {
    const { member, sessionId } = await requireSession(input.token);
    const { records } = await zite.sessions.findAll({ filters: { memberId: member.id }, limit: 200 });
    if (input.revokeId) {
      const target = records.find((r) => r.id === input.revokeId);
      if (!target) throw new ZiteError({ code: 'NOT_FOUND', message: 'nf', userFacingMessage: 'نشست پیدا نشد.' });
      await zite.sessions.update({ id: target.id, record: { revokedAt: new Date().toISOString() } });
      target.revokedAt = 'now';
    }
    const now = Date.now();
    return {
      sessions: records
        .filter((r) => !r.revokedAt && r.expiresAt && new Date(r.expiresAt).getTime() > now)
        .map((r) => ({ id: r.id, userAgent: r.userAgent ?? '', createdAt: r.createdAt ?? null, lastSeenAt: r.lastSeenAt ?? null, current: r.id === sessionId }))
        .sort((a, b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt))),
    };
  },
});
