import { z } from 'zod';
import { createEndpoint, ZiteError } from '@/zite/backend';
import { zite } from '@/zite/db';
import { requireStaff } from '../server/rbac';
import { audit } from '../server/audit';
import { tokenField } from '../server/util';
import { blockSchemas, BLOCK_KEYS, type BlockKey } from '../lib/cmsSchema';

const keyEnum = z.enum(BLOCK_KEYS as [BlockKey, ...BlockKey[]]);
const blockOut = z.object({
  key: z.string(), draft: z.string(), published: z.string(), status: z.enum(['draft', 'published']),
  version: z.number(), updatedBy: z.string(), updatedAt: z.string().nullable(), hasUnpublished: z.boolean(),
});
const bad = (m: string) => new ZiteError({ code: 'BAD_REQUEST', message: 'INVALID', userFacingMessage: m });

async function findBlock(key: string) {
  return zite.cmsBlocks.findOne({ filters: { key } });
}
function validate(key: BlockKey, json: string) {
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { throw bad('محتوای ارسالی معتبر نیست.'); }
  const r = blockSchemas[key].safeParse(raw);
  if (!r.success) throw bad(`محتوا نامعتبر است: ${r.error.issues[0]?.message ?? ''}`.trim());
  return JSON.stringify(r.data);
}

export default createEndpoint({
  description: 'Manages landing-page CMS blocks: list, save draft, publish, unpublish, versions, restore',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['list', 'saveDraft', 'publish', 'unpublish', 'versions', 'restore']),
    key: keyEnum.optional(),
    content: z.string().max(50_000).optional(),
    versionId: z.string().max(64).optional(),
  }),
  outputSchema: z.object({
    blocks: z.array(blockOut),
    versions: z.array(z.object({ id: z.string(), version: z.number(), savedBy: z.string(), createdAt: z.string().nullable(), content: z.string() })),
  }),
  execute: async ({ input }) => {
    const { member } = await requireStaff(input.token, 'content.manage');
    const who = member.displayName || member.username || member.id;
    const key = input.key;
    let versions: { id: string; version: number; savedBy: string; createdAt: string | null; content: string }[] = [];

    if (input.action !== 'list') {
      if (!key) throw bad('بلوک مشخص نشده است.');
      const rec = await findBlock(key);
      if (input.action === 'saveDraft') {
        const content = validate(key, input.content ?? '');
        if (rec) await zite.cmsBlocks.update({ id: rec.id, record: { content, updatedBy: who } });
        else await zite.cmsBlocks.create({ record: { key, content, status: 'draft', version: 0, updatedBy: who, publishedContent: '' } });
        await audit(member.id, 'cms.save_draft', 'cmsBlock', key);
      } else if (input.action === 'publish') {
        if (!rec?.content) throw bad('ابتدا پیش‌نویس را ذخیره کن.');
        const content = validate(key, rec.content);
        const version = (rec.version ?? 0) + 1;
        await zite.cmsBlocks.update({ id: rec.id, record: { publishedContent: content, status: 'published', version, updatedBy: who } });
        await zite.cmsBlockVersions.create({ record: { blockKey: key, version, content, savedBy: who } });
        await audit(member.id, 'cms.publish', 'cmsBlock', key, { version });
      } else if (input.action === 'unpublish') {
        if (!rec || rec.status !== 'published') throw bad('این بلوک منتشر نشده است.');
        await zite.cmsBlocks.update({ id: rec.id, record: { publishedContent: '', status: 'draft', updatedBy: who } });
        await audit(member.id, 'cms.unpublish', 'cmsBlock', key);
      } else if (input.action === 'restore') {
        const v = input.versionId ? await zite.cmsBlockVersions.findOne({ id: input.versionId }) : null;
        if (!v || v.blockKey !== key || !v.content) throw bad('نسخه پیدا نشد.');
        const content = validate(key, v.content);
        if (rec) await zite.cmsBlocks.update({ id: rec.id, record: { content, updatedBy: who } });
        else await zite.cmsBlocks.create({ record: { key, content, status: 'draft', version: 0, updatedBy: who, publishedContent: '' } });
        await audit(member.id, 'cms.restore', 'cmsBlock', key, { version: v.version });
      }
      if (input.action === 'versions' || input.action === 'restore') {
        const { records } = await zite.cmsBlockVersions.findAll({ filters: { blockKey: key }, limit: 50 });
        versions = records
          .map((r) => ({ id: r.id, version: r.version ?? 0, savedBy: r.savedBy ?? '', createdAt: r.createdAt ?? null, content: r.content ?? '' }))
          .sort((a, b) => b.version - a.version);
      }
    }

    const { records } = await zite.cmsBlocks.findAll({ limit: 100 });
    const blocks = records
      .filter((r) => BLOCK_KEYS.includes(r.key as BlockKey))
      .map((r) => ({
        key: r.key ?? '', draft: r.content ?? '', published: r.publishedContent ?? '',
        status: (r.status === 'published' ? 'published' : 'draft') as 'draft' | 'published',
        version: r.version ?? 0, updatedBy: r.updatedBy ?? '', updatedAt: r.updatedAt ?? null,
        hasUnpublished: !!r.content && r.content !== (r.publishedContent ?? ''),
      }));
    return { blocks, versions };
  },
});
