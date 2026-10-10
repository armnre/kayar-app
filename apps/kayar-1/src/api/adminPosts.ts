import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite, type PostsRecordType } from 'zitejs/db';
import { requireStaff } from '../server/rbac';
import { audit } from '../server/audit';
import { tokenField } from '../server/util';
import { bad, SLUG_RE, slugField, splitTags, joinTags, isoOrNull } from '../server/content';

const status = z.enum(['draft', 'published', 'archived']);
const postIn = z.object({
  title: z.string().trim().max(160),
  slug: slugField,
  excerpt: z.string().trim().max(300).default(''),
  body: z.string().max(100_000).default(''),
  coverMediaId: z.string().max(64).default(''),
  tags: z.array(z.string().max(40)).max(15).default([]),
  status,
  publishedAt: z.string().max(40).nullable().default(null),
  seoTitle: z.string().trim().max(70).default(''),
  seoDescription: z.string().trim().max(170).default(''),
});
const postOut = z.object({
  id: z.string(), title: z.string(), slug: z.string(), excerpt: z.string(), body: z.string(), coverMediaId: z.string(), coverUrl: z.string(),
  tags: z.array(z.string()), status: z.string(), publishedAt: z.string().nullable(), seoTitle: z.string(), seoDescription: z.string(),
  author: z.string(), createdAt: z.string().nullable(), updatedAt: z.string().nullable(),
});

async function toOut(p: PostsRecordType, names: Map<string, string>, covers: Map<string, string>) {
  return {
    id: p.id, title: p.title ?? '', slug: p.slug ?? '', excerpt: p.excerpt ?? '', body: p.body ?? '', coverMediaId: p.coverMediaId ?? '',
    coverUrl: covers.get(p.coverMediaId ?? '') ?? '', tags: splitTags(p.tags), status: p.status ?? 'draft', publishedAt: p.publishedAt ?? null,
    seoTitle: p.seoTitle ?? '', seoDescription: p.seoDescription ?? '', author: names.get(p.authorId ?? '') ?? '—',
    createdAt: p.createdAt ?? null, updatedAt: (p as { updatedAt?: string }).updatedAt ?? null,
  };
}

export default createEndpoint({
  description: 'Admin CRUD for blog posts with slug uniqueness and publish validation',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['list', 'save', 'delete']),
    id: z.string().max(64).optional(),
    post: postIn.optional(),
  }),
  outputSchema: z.object({ posts: z.array(postOut), saved: postOut.nullable() }),
  execute: async ({ input }) => {
    const { member } = await requireStaff(input.token, 'content.manage');
    let savedId: string | null = null;

    if (input.action === 'save') {
      const p = input.post;
      if (!p) throw bad('اطلاعات مطلب ارسال نشده است.');
      if (!p.title) throw bad('عنوان مطلب الزامی است.');
      if (!p.slug || !SLUG_RE.test(p.slug)) throw bad('نامک فقط می‌تواند حروف، عدد و خط تیره داشته باشد.');
      const dup = await zite.posts.findAll({ filters: { slug: p.slug }, limit: 5 });
      if (dup.records.some((r) => r.id !== input.id && r.status !== 'deleted')) throw bad('این نامک قبلاً برای مطلب دیگری استفاده شده است.');
      if (p.coverMediaId && !(await zite.mediaAssets.findOne({ id: p.coverMediaId }))) throw bad('تصویر کاور انتخاب‌شده پیدا نشد.');
      let publishedAt = isoOrNull(p.publishedAt);
      if (p.status === 'published') {
        if (p.body.trim().length < 20) throw bad('برای انتشار، متن مطلب حداقل باید ۲۰ نویسه باشد.');
        if (!p.excerpt) throw bad('برای انتشار، خلاصه‌ی مطلب را بنویس.');
        publishedAt = publishedAt ?? new Date().toISOString();
      }
      const record = {
        title: p.title, slug: p.slug, excerpt: p.excerpt, body: p.body, coverMediaId: p.coverMediaId, tags: joinTags(p.tags),
        status: p.status, publishedAt, seoTitle: p.seoTitle, seoDescription: p.seoDescription,
      };
      if (input.id) {
        const cur = await zite.posts.findOne({ id: input.id });
        if (!cur || cur.status === 'deleted') throw bad('مطلب پیدا نشد.');
        await zite.posts.update({ id: input.id, record });
        savedId = input.id;
        await audit(member.id, cur.status !== p.status ? `post.${p.status === 'published' ? 'publish' : p.status === 'archived' ? 'archive' : 'unpublish'}` : 'post.update', 'post', input.id, { slug: p.slug, from: cur.status, to: p.status });
      } else {
        const c = await zite.posts.create({ record: { ...record, authorId: member.id } });
        savedId = c.id;
        await audit(member.id, 'post.create', 'post', c.id, { slug: p.slug, status: p.status });
      }
    } else if (input.action === 'delete') {
      const cur = input.id ? await zite.posts.findOne({ id: input.id }) : undefined;
      if (!cur || cur.status === 'deleted') throw bad('مطلب پیدا نشد.');
      // Soft delete: frees nothing publicly and keeps the record for audit. Slug is suffixed so it can be reused.
      await zite.posts.update({ id: cur.id, record: { status: 'deleted', slug: `${cur.slug}-deleted-${Date.now().toString(36)}` } });
      await audit(member.id, 'post.delete', 'post', cur.id, { slug: cur.slug });
    }

    const { records } = await zite.posts.findAll({ filters: { status: { not: 'deleted' } }, limit: 2000 });
    const [members, media] = await Promise.all([
      zite.members.findAll({ filters: { id: { in: Array.from(new Set(records.map((r) => r.authorId).filter((x): x is string => !!x))) } }, fields: ['displayName', 'username'], limit: 500 }),
      zite.mediaAssets.findAll({ filters: { id: { in: Array.from(new Set(records.map((r) => r.coverMediaId).filter((x): x is string => !!x))) } }, fields: ['fileUrl'], limit: 2000 }),
    ]);
    const names = new Map(members.records.map((m) => [m.id, m.displayName || m.username || '—']));
    const covers = new Map(media.records.map((m) => [m.id, m.fileUrl ?? '']));
    const posts = await Promise.all(records.map((r) => toOut(r, names, covers)));
    posts.sort((a, b) => String(b.updatedAt ?? b.createdAt).localeCompare(String(a.updatedAt ?? a.createdAt)));
    return { posts, saved: posts.find((p) => p.id === savedId) ?? null };
  },
});
