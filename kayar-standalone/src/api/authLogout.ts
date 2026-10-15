import { z } from 'zod';
import { createEndpoint } from '@/zite/backend';
import { zite } from '@/zite/db';
import { requireSession, revokeAllSessions } from '../server/rbac';
import { audit } from '../server/audit';
import { tokenField } from '../server/util';

export default createEndpoint({
  description: 'Signs out the current session, or all sessions',
  inputSchema: z.object({ token: tokenField, all: z.boolean().optional() }),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ input }) => {
    const { member, sessionId } = await requireSession(input.token, { allowPasswordChange: true });
    if (input.all) await revokeAllSessions(member.id);
    else await zite.sessions.update({ id: sessionId, record: { revokedAt: new Date().toISOString() } });
    await audit(member.id, input.all ? 'auth.logout_all' : 'auth.logout', 'member', member.id);
    return { ok: true };
  },
});
