import { z } from 'zod';
import type { MembersRecordType } from '@/zite/db';

export const tokenField = z.string().min(20).max(100);
export const pageInput = { page: z.number().int().min(1).max(10_000).default(1), pageSize: z.number().int().min(5).max(100).default(20) };

export const publicMember = z.object({
  id: z.string(), username: z.string(), phone: z.string(), displayName: z.string(), role: z.string(), status: z.string(),
  mustChangePassword: z.boolean(), lastLoginAt: z.string().nullable(), createdAt: z.string().nullable(),
  orderRef: z.string(), note: z.string(), tags: z.array(z.string()),
});
export type PublicMember = z.infer<typeof publicMember>;
/** Strips the password hash — never send it to the client. */
export function toPublic(m: MembersRecordType): PublicMember {
  return {
    id: m.id, username: m.username ?? '', phone: m.phone ?? '', displayName: m.displayName ?? '', role: m.role ?? 'member', status: m.status ?? 'active',
    mustChangePassword: !!m.mustChangePassword, lastLoginAt: m.lastLoginAt ?? null, createdAt: m.createdAt ?? null,
    orderRef: m.orderRef ?? '', note: m.note ?? '', tags: m.tags ?? [],
  };
}
export const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // CSV injection guard
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
export const toCsv = (rows: unknown[][]) => '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\n');
