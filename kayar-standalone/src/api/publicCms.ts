import { z } from 'zod';
import { createEndpoint } from '@/zite/backend';
import { zite } from '@/zite/db';
import { BLOCK_KEYS, type BlockKey } from '../lib/cmsSchema';

export default createEndpoint({
  description: 'Returns only published landing-page CMS blocks (drafts are never exposed)',
  inputSchema: z.object({}),
  outputSchema: z.object({ blocks: z.array(z.object({ key: z.string(), content: z.string() })) }),
  execute: async () => {
    const { records } = await zite.cmsBlocks.findAll({ filters: { status: 'published' }, limit: 100 });
    return {
      blocks: records
        .filter((r) => BLOCK_KEYS.includes(r.key as BlockKey) && !!r.publishedContent)
        .map((r) => ({ key: r.key ?? '', content: r.publishedContent ?? '' })),
    };
  },
});
