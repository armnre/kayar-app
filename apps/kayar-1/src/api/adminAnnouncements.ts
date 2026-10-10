import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireStaff } from '../server/rbac';
import { audit } from '../server/audit';
import { tokenField } from '../server/util';
import { bad, safeLink, isoOrNull } from '../server/content';

const item = z.object({ id: z.string(), title: z.string(), body: z.string(), link: z.string(), startsAt: z.string().nullable(), endsAt: z.string().nullable(), status: z.string(), audience: z.string(), createdBy: z.string(), updatedAt: z.string().nullable() });

export default createEndpoint({
  description: 'Admin CRUD for in-app announcements with scheduling and validation',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['list', 'save', 'setStatus', 'delete']),
    id: z.string().max(64).optional(),
    data: z.object({
      title: z.string().trim().min(1).max(120), body: z.string().trim().max(1000).default(''), link: z.string().max(400).default(''),
      startsAt: z.string().max(40).nullable().default(null), endsAt: z.string().max(40).nullable().default(null),
      status: z.enum(['draft', 'published']), audience: z.enum(['all']).default('all'),
    }).optional(),
    status: z.enum(['draft', 'published']).optional(),
  }),
  outputSchema: z.object({ items: z.array(item) }),
  execute: async ({ input }) => {
    const { member } = await requireStaff(input.token, 'announcements.manage');
    if (input.action === 'save') {
      const d = input.data;
      if (!d) throw bad('اطلاعات اعلان ارسال نشده است.');
      const startsAt = isoOrNull(d.startsAt); const endsAt = isoOrNull(d.endsAt);
      if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) throw bad('زمان پایان باید بعد از زمان شروع باشد.');
      if (d.status === 'published' && endsAt && new Date(endsAt).getTime() < Date.now()) throw bad('زمان پایان گذشته است؛ اعلان منقضی را نمی‌شود منتشر کرد.');
      const record = { title: d.title, body: d.body, link: safeLink(d.link), startsAt, endsAt, status: d.status, audience: d.audience };
      if (input.id) {
        const cur = await zite.announcements.findOne({ id: input.id });
        if (!cur || cur.status === 'deleted') throw bad('اعلان پیدا نشد.');
        await zite.announcements.update({ id: input.id, record });
        await audit(member.id, 'announcement.update', 'announcement', input.id, { status: d.status });
      } else {
        const c = await zite.announcements.create({ record: { ...record, createdBy: member.displayName || member.username || member.id } as never });
        await audit(member.id, 'announcement.create', 'announcement', c.id, { status: d.status });
      }
    } else if (input.action !== 'list') {
      const cur = input.id ? await zite.announcements.findOne({ id: input.id }) : undefined;
      if (!cur || cur.status === 'deleted') throw bad('اعلان پیدا نشد.');
      if (input.action === 'setStatus') {
        if (!input.status) throw bad('وضعیت مشخص نشده است.');
        if (input.status === 'published' && cur.endsAt && new Date(cur.endsAt).getTime() < Date.now()) throw bad('این اعلان منقضی شده؛ اول زمان پایان را اصلاح کن.');
        await zite.announcements.update({ id: cur.id, record: { status: input.status } });
        await audit(member.id, input.status === 'published' ? 'announcement.activate' : 'announcement.deactivate', 'announcement', cur.id);
      } else {
        await zite.announcements.update({ id: cur.id, record: { status: 'deleted' } });
        await audit(member.id, 'announcement.delete', 'announcement', cur.id);
      }
    }
    const { records } = await zite.announcements.findAll({ filters: { status: { not: 'deleted' } }, limit: 1000 });
    return {
      items: records.map((r) => {
        const x = r as typeof r & { createdBy?: string; updatedAt?: string };
        return { id: r.id, title: r.title ?? '', body: r.body ?? '', link: r.link ?? '', startsAt: r.startsAt ?? null, endsAt: r.endsAt ?? null, status: r.status ?? 'draft', audience: r.audience ?? 'all', createdBy: x.createdBy ?? '', updatedAt: x.updatedAt ?? null };
      }).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))),
    };
  },
});
