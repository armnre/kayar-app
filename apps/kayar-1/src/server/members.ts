import { ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { normalizePhone, normalizeUsername, hashPassword, generateTempPassword, passwordPolicyError } from './auth';

export type NewMember = { displayName: string; phone?: string; username?: string; password?: string; orderRef?: string; note?: string; role: string; tags?: string[] };
const bad = (m: string) => new ZiteError({ code: 'BAD_REQUEST', message: 'validation', userFacingMessage: m });

/** Validates & normalises; returns errors as Persian strings (used by bulk preview too). */
export async function validateNew(d: NewMember) {
  const errors: string[] = [];
  const phone = d.phone ? normalizePhone(d.phone) : null;
  if (d.phone && !phone) errors.push('شماره موبایل نامعتبر است.');
  if (d.role === 'member' && !phone) errors.push('شماره موبایل برای مشتری لازم است.');
  const username = normalizeUsername(d.username || phone || '');
  if (!username || !/^[a-z0-9._-]{3,40}$/.test(username)) errors.push('نام کاربری باید ۳ تا ۴۰ نویسه‌ی لاتین، عدد، نقطه یا خط تیره باشد.');
  if (!d.displayName.trim()) errors.push('نام لازم است.');
  if (username && (await zite.members.findOne({ filters: { username } }))) errors.push('این نام کاربری قبلاً ثبت شده است.');
  if (phone && (await zite.members.findOne({ filters: { phone } }))) errors.push('این شماره قبلاً ثبت شده است.');
  return { errors, phone, username };
}

export async function createMember(d: NewMember, actorId: string) {
  const { errors, phone, username } = await validateNew(d);
  if (errors.length) throw bad(errors[0]);
  let password = d.password;
  if (password) {
    const e = passwordPolicyError(password, { username, phone: phone ?? undefined, name: d.displayName });
    if (e) throw bad(e);
  } else password = generateTempPassword();
  const member = await zite.members.create({
    record: { displayName: d.displayName.trim(), phone, username, role: d.role, status: 'active', passwordHash: await hashPassword(password), mustChangePassword: true, orderRef: d.orderRef ?? '', note: d.note ?? '', tags: d.tags ?? [], createdBy: actorId },
  });
  return { member, tempPassword: password };
}
