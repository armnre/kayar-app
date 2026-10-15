import { zite } from '@/zite/db';

const SENSITIVE = /pass|token|secret|hash|pepper|client_?id|authorization|cookie/i;
/** Recursively drops sensitive-looking keys so they never reach the audit log or the browser. */
export function redact(v: unknown, depth = 0): unknown {
  if (depth > 4 || v === null || typeof v !== 'object') return typeof v === 'string' && v.length > 500 ? v.slice(0, 500) + '…' : v;
  if (Array.isArray(v)) return v.slice(0, 50).map((x) => redact(x, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k] = SENSITIVE.test(k) ? '[redacted]' : redact(x, depth + 1);
  return out;
}

/** Append-only. Never pass passwords, hashes or tokens in meta (they are redacted anyway). */
export async function audit(actorId: string | null, action: string, targetType = '', targetId = '', meta: Record<string, unknown> = {}) {
  await zite.auditLogs.create({ record: { actorId: actorId ?? 'system', action, targetType, targetId, meta: JSON.stringify(redact(meta)) } });
}
