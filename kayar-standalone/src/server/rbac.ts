import { ZiteError } from '@/zite/backend';
import { zite, type MembersRecordType } from '@/zite/db';
import { sha256, MEMBER_TTL, STAFF_TTL } from './auth';

export type Role = 'member' | 'coach' | 'support' | 'editor' | 'admin' | 'superadmin';
export type Permission =
  | 'dashboard.read' | 'customers.read' | 'customers.write' | 'customers.reset' | 'customers.suspend'
  | 'staff.manage' | 'content.manage' | 'morshed.manage' | 'announcements.manage'
  | 'settings.manage' | 'audit.read';

export const STAFF_ROLES: Role[] = ['support', 'editor', 'admin', 'superadmin'];
const ALL: Permission[] = ['dashboard.read', 'customers.read', 'customers.write', 'customers.reset', 'customers.suspend', 'staff.manage', 'content.manage', 'morshed.manage', 'announcements.manage', 'settings.manage', 'audit.read'];
export const MATRIX: Record<Role, Permission[]> = {
  superadmin: ALL,
  admin: ['dashboard.read', 'customers.read', 'customers.write', 'customers.reset', 'customers.suspend', 'content.manage', 'morshed.manage', 'announcements.manage', 'audit.read'],
  editor: ['dashboard.read', 'content.manage', 'morshed.manage'],
  support: ['dashboard.read', 'customers.read', 'customers.reset', 'customers.suspend'],
  coach: [],
  member: [],
};
export const can = (role: string | undefined, p: Permission) => !!role && (MATRIX[role as Role] ?? []).includes(p);
export const isStaff = (role?: string) => STAFF_ROLES.includes(role as Role);

const unauth = () => new ZiteError({ code: 'UNAUTHORIZED', message: 'SESSION_INVALID', userFacingMessage: 'نشست شما منقضی شده؛ دوباره وارد شوید.' });

export type Authed = { member: MembersRecordType; sessionId: string };

/** Validates our own session token (not Zite email auth). Sliding TTL. */
export async function requireSession(token: string, opts: { allowPasswordChange?: boolean } = {}): Promise<Authed> {
  if (!token || token.length < 20 || token.length > 100) throw unauth();
  const s = await zite.sessions.findOne({ filters: { tokenHash: await sha256(token) } });
  if (!s || s.revokedAt || !s.expiresAt || new Date(s.expiresAt).getTime() < Date.now() || !s.memberId) throw unauth();
  const member = await zite.members.findOne({ id: s.memberId });
  if (!member || member.status === 'deleted') throw unauth();
  if (member.status === 'suspended') throw new ZiteError({ code: 'FORBIDDEN', message: 'ACCOUNT_SUSPENDED', userFacingMessage: 'حساب شما تعلیق شده است. با پشتیبانی تماس بگیرید.' });
  if (member.mustChangePassword && member.role === 'member' && !opts.allowPasswordChange)
    throw new ZiteError({ code: 'FORBIDDEN', message: 'PASSWORD_CHANGE_REQUIRED', userFacingMessage: 'PASSWORD_CHANGE_REQUIRED: ابتدا رمز خود را تغییر دهید.' });
  // sliding expiry, written at most every 10 minutes
  if (!s.lastSeenAt || Date.now() - new Date(s.lastSeenAt).getTime() > 10 * 60_000) {
    const ttl = isStaff(member.role) ? STAFF_TTL : MEMBER_TTL;
    const maxStaff = isStaff(member.role) && s.createdAt ? new Date(s.createdAt).getTime() + STAFF_TTL : Infinity;
    await zite.sessions.update({ id: s.id, record: { lastSeenAt: new Date().toISOString(), expiresAt: new Date(Math.min(Date.now() + ttl, maxStaff)).toISOString() } });
  }
  return { member, sessionId: s.id };
}
export async function requireMember(token: string) {
  return requireSession(token);
}
export async function requireStaff(token: string, permission: Permission) {
  const a = await requireSession(token);
  if (!isStaff(a.member.role) || !can(a.member.role, permission))
    throw new ZiteError({ code: 'FORBIDDEN', message: 'FORBIDDEN', userFacingMessage: 'به این بخش دسترسی ندارید.' });
  return a;
}
export async function revokeAllSessions(memberId: string, exceptId?: string) {
  const { records } = await zite.sessions.findAll({ filters: { memberId }, limit: 2000 });
  const now = new Date().toISOString();
  await Promise.all(records.filter((r) => !r.revokedAt && r.id !== exceptId).map((r) => zite.sessions.update({ id: r.id, record: { revokedAt: now } })));
}
