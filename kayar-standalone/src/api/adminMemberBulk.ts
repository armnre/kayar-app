import { z } from 'zod';
import { createEndpoint } from '@/zite/backend';
import { zite } from '@/zite/db';
import { requireStaff } from '../server/rbac';
import { createMember, validateNew } from '../server/members';
import { audit } from '../server/audit';
import { tokenField } from '../server/util';

const row = z.object({ name: z.string().max(80), phone: z.string().max(20), orderRef: z.string().max(60).optional() });

export default createEndpoint({
  description: 'Validates (dryRun) or creates up to 200 customer accounts from an uploaded sheet, idempotent per batch',
  inputSchema: z.object({ token: tokenField, rows: z.array(row).min(1).max(200), dryRun: z.boolean(), batchId: z.string().min(8).max(64) }),
  outputSchema: z.object({
    results: z.array(z.object({ index: z.number(), name: z.string(), phone: z.string(), username: z.string(), status: z.enum(['ok', 'error', 'created', 'skipped']), error: z.string().optional(), tempPassword: z.string().optional() })),
  }),
  execute: async ({ input }) => {
    const { member: actor } = await requireStaff(input.token, 'customers.write');
    const seen = new Set<string>();
    const results: { index: number; name: string; phone: string; username: string; status: 'ok' | 'error' | 'created' | 'skipped'; error?: string; tempPassword?: string }[] = [];
    for (const [index, r] of input.rows.entries()) {
      const { errors, phone, username } = await validateNew({ displayName: r.name, phone: r.phone, role: 'member' });
      if (phone && seen.has(phone)) errors.push('شماره در همین فایل تکراری است.');
      if (phone) seen.add(phone);
      if (!input.dryRun && errors.length && phone) {
        // idempotency: a row already created by this same batch is reported as skipped, not as a duplicate error
        const prev = await zite.members.findOne({ filters: { phone } });
        if (prev?.createdBy === `${actor.id}:${input.batchId}`) { results.push({ index, name: r.name, phone, username: prev.username ?? '', status: 'skipped' as const, error: 'قبلاً در همین دسته ساخته شده.' }); continue; }
      }
      if (errors.length || input.dryRun) { results.push({ index, name: r.name, phone: phone ?? r.phone, username, status: errors.length ? ('error' as const) : ('ok' as const), error: errors[0] }); continue; }
      const { tempPassword } = await createMember({ displayName: r.name, phone: phone!, orderRef: r.orderRef, role: 'member' }, `${actor.id}:${input.batchId}`);
      results.push({ index, name: r.name, phone: phone!, username, status: 'created' as const, tempPassword });
    }
    if (!input.dryRun) await audit(actor.id, 'customer.bulk_create', 'batch', input.batchId, { created: results.filter((r) => r.status === 'created').length, failed: results.filter((r) => r.status === 'error').length });
    return { results };
  },
});
