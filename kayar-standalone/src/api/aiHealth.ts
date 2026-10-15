import { z } from 'zod';
import { createEndpoint } from '@/zite/backend';
import { requireStaff } from '../server/rbac';
import { tokenField } from '../server/util';
import { aiStatus, aiConfigured, panelFor, AI_REASON_FA } from '../server/ai';

/**
 * AI connectivity report for the admin panel: which gateway is wired up, which models are
 * entitled, and the exact reason when the assistant is unavailable (e.g. an account that
 * still has to be relinked after the Telegram requirement).
 */
export default createEndpoint({
  description: 'Reports NaraRouter/AI connectivity, entitled models and the per-position routing panels',
  inputSchema: z.object({ token: tokenField, force: z.boolean().optional() }),
  outputSchema: z.object({
    configured: z.boolean(),
    reachable: z.boolean(),
    reason: z.string(),
    message: z.string().nullable(),
    baseUrl: z.string(),
    allowPaid: z.boolean(),
    models: z.array(z.string()),
    panels: z.array(z.object({ position: z.string(), models: z.array(z.string()) })),
  }),
  execute: async ({ input }) => {
    await requireStaff(input.token, 'dashboard.read');
    const status = await aiStatus(input.force);
    return {
      configured: aiConfigured(),
      reachable: status.reachable,
      reason: String(status.reason),
      message: AI_REASON_FA[String(status.reason)] ?? null,
      baseUrl: status.baseUrl,
      allowPaid: status.allowPaid,
      models: status.models,
      panels: Object.keys(status.panels).map((position) => ({ position, models: panelFor(position) })),
    };
  },
});
