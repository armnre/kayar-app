import { z } from 'zod';
import { createEndpoint, ZiteError } from '@/zite/backend';
import { zite } from '@/zite/db';
import { requireStaff, revokeAllSessions, isStaff, type Permission } from '../server/rbac';
import { generateTempPassword, hashPassword, normalizePhone, normalizeUsername } from '../server/auth';
import { audit } from '../server/audit';
import { publicMember, toPublic, tokenField } from '../server/util';

const perm: Record<string, Permission> = { reset: 'customers.reset', suspend: 'customers.suspend', unsuspend: 'customers.suspend', logoutAll: 'customers.suspend', delete: 'customers.write', update: 'customers.write', sessions: 'customers.read' };
const nf = () => new ZiteError({ code: 'NOT_FOUND', message: 'nf', userFacingMessage: 'حساب پیدا نشد.' });

export default createEndpoint({
  description: 'Runs an admin action on one account: edit, reset password, suspend, unsuspend, force logout, soft delete, list sessions',
  inputSchema: z.object({
    token: tokenField,
    id: z.string().min(1).max(64),
    action: z.enum(['update', 'reset', 'suspend', 'unsuspend', 'logoutAll', 'delete', 'sessions']),
    patch: z.object({ displayName: z.string().min(1).max(80), phone: z.string().max(20), username: z.string().max(40), orderRef: z.string().max(60), note: z.string().max(1000), tags: z.array(z.string().max(30)).max(10), role: z.enum(['member', 'support', 'editor', 'admin', 'superadmin']) }).partial().optional(),
  }),
  outputSchema: z.object({
    member: publicMember, tempPassword: z.string().optional(),
    sessions: z.array(z.object({ id: z.string(), userAgent: z.string(), createdAt: z.string().nullable(), lastSeenAt: z.string().nullable(), active: z.boolean() })).optional(),
  }),
  execute: async ({ input }) => {
    const target = await zite.members.findOne({ id: input.id });
    if (!target || target.status === 'deleted') throw nf();
    // acting on staff accounts (or granting a staff role) requires staff.manage (superadmin)
    const staffTarget = isStaff(target.role) || (input.patch?.role && input.patch.role !== 'member');
    const { member: actor } = await requireStaff(input.token, staffTarget ? 'staff.manage' : perm[input.action]);
    if (target.id === actor.id && ['suspend', 'delete'].includes(input.action)) throw new ZiteError({ code: 'BAD_REQUEST', message: 'self', userFacingMessage: 'نمی‌توانید حساب خودتان را تعلیق یا حذف کنید.' });
    let tempPassword: string | undefined;
    const now = new Date().toISOString();
    switch (input.action) {
      case 'sessions': {
        const { records } = await zite.sessions.findAll({ filters: { memberId: target.id }, limit: 100 });
        return { member: toPublic(target), sessions: records.map((s) => ({ id: s.id, userAgent: s.userAgent ?? '', createdAt: s.createdAt ?? null, lastSeenAt: s.lastSeenAt ?? null, active: !s.revokedAt && !!s.expiresAt && new Date(s.expiresAt).getTime() > Date.now() })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))) };
      }
      case 'reset':
        tempPassword = generateTempPassword();
        await zite.members.update({ id: target.id, record: { passwordHash: await hashPassword(tempPassword), mustChangePassword: true } });
        await revokeAllSessions(target.id);
        break;
      case 'suspend': await zite.members.update({ id: target.id, record: { status: 'suspended' } }); await revokeAllSessions(target.id); break;
      case 'unsuspend': await zite.members.update({ id: target.id, record: { status: 'active' } }); break;
      case 'logoutAll': await revokeAllSessions(target.id); break;
      case 'delete': await zite.members.update({ id: target.id, record: { status: 'deleted', phone: null, username: `deleted-${target.id.slice(0, 8)}` } }); await revokeAllSessions(target.id); break;
      case 'update': {
        const p = input.patch ?? {};
        const record: Record<string, unknown> = {};
        if (p.displayName) record.displayName = p.displayName.trim();
        if (p.orderRef !== undefined) record.orderRef = p.orderRef;
        if (p.note !== undefined) record.note = p.note;
        if (p.tags) record.tags = p.tags;
        if (p.role) record.role = p.role;
        if (p.phone !== undefined && p.phone !== target.phone) {
          const ph = normalizePhone(p.phone);
          if (!ph) throw new ZiteError({ code: 'BAD_REQUEST', message: 'phone', userFacingMessage: 'شماره موبایل نامعتبر است.' });
          const dup = await zite.members.findOne({ filters: { phone: ph } });
          if (dup && dup.id !== target.id) throw new ZiteError({ code: 'CONFLICT', message: 'dup', userFacingMessage: 'این شماره قبلاً ثبت شده است.' });
          record.phone = ph;
        }
        if (p.username && normalizeUsername(p.username) !== target.username) {
          const u = normalizeUsername(p.username);
          const dup = await zite.members.findOne({ filters: { username: u } });
          if (dup) throw new ZiteError({ code: 'CONFLICT', message: 'dup', userFacingMessage: 'این نام کاربری قبلاً ثبت شده است.' });
          record.username = u;
        }
        await zite.members.update({ id: target.id, record });
        await audit(actor.id, p.role && p.role !== target.role ? 'member.role_change' : 'member.update', 'member', target.id, { fields: Object.keys(record), from: p.role ? target.role : undefined, to: p.role });
        break;
      }
    }
    if (input.action !== 'update') await audit(actor.id, `member.${input.action}`, 'member', target.id);
    const fresh = await zite.members.findOne({ id: target.id });
    return { member: toPublic(fresh ?? target), tempPassword };
  },
});
