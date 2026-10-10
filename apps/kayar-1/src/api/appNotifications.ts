import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireSession } from '../server/rbac';
import { tokenField } from '../server/util';

const valid = (s?: string) => !s || !Number.isNaN(new Date(s).getTime());

export default createEndpoint({
  description: 'Lists published, currently active announcements for the signed-in member',
  inputSchema: z.object({ token: tokenField }),
  outputSchema: z.object({ items: z.array(z.object({ id: z.string(), title: z.string(), body: z.string(), link: z.string(), external: z.boolean(), at: z.string().nullable() })) }),
  execute: async ({ input }) => {
    await requireSession(input.token);
    const { records } = await zite.announcements.findAll({ filters: { status: 'published' }, limit: 200 });
    const now = Date.now();
    return {
      items: records
        // invalid dates hide the item rather than showing it forever
        .filter((r) => valid(r.startsAt) && valid(r.endsAt))
        .filter((r) => (!r.startsAt || new Date(r.startsAt).getTime() <= now) && (!r.endsAt || new Date(r.endsAt).getTime() > now))
        .filter((r) => !r.audience || r.audience === 'all')
        .map((r) => {
          const link = r.link ?? '';
          const safe = /^\/(?!\/)/.test(link) || /^https:\/\//.test(link) ? link : '';
          return { id: r.id, title: r.title ?? '', body: r.body ?? '', link: safe, external: safe.startsWith('https://'), at: r.startsAt ?? (r as { createdAt?: string }).createdAt ?? null };
        })
        .sort((a, b) => String(b.at).localeCompare(String(a.at))),
    };
  },
});
