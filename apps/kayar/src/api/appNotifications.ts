import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireSession } from '../server/rbac';
import { tokenField } from '../server/util';

export default createEndpoint({
  description: 'Lists published announcements for the signed-in member',
  inputSchema: z.object({ token: tokenField }),
  outputSchema: z.object({ items: z.array(z.object({ id: z.string(), title: z.string(), body: z.string(), link: z.string(), at: z.string().nullable() })) }),
  execute: async ({ input }) => {
    await requireSession(input.token);
    const { records } = await zite.announcements.findAll({ filters: { status: 'published' }, limit: 100 });
    const now = Date.now();
    return {
      items: records
        .filter((r) => (!r.startsAt || new Date(r.startsAt).getTime() <= now) && (!r.endsAt || new Date(r.endsAt).getTime() > now))
        .map((r) => ({ id: r.id, title: r.title ?? '', body: r.body ?? '', link: r.link ?? '', at: r.startsAt ?? null }))
        .sort((a, b) => String(b.at).localeCompare(String(a.at))),
    };
  },
});
