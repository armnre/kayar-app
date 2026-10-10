import { zite } from 'zitejs/db';

/** Never pass passwords, hashes or tokens in meta. */
export async function audit(actorId: string | null, action: string, targetType = '', targetId = '', meta: Record<string, unknown> = {}) {
  await zite.auditLogs.create({ record: { actorId: actorId ?? 'system', action, targetType, targetId, meta: JSON.stringify(meta) } });
}
