import { z } from 'zod';
import { createEndpoint } from '@/zite/backend';
import { zite } from '@/zite/db';
import { requireStaff } from '../server/rbac';
import { audit } from '../server/audit';
import { tokenField } from '../server/util';
import { bad, ALLOWED_UPLOAD_HOSTS } from '../server/content';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Detects the real image type from magic bytes — the file extension is never trusted. */
function sniff(b: Uint8Array): { mime: string; w?: number; h?: number } | null {
  const u16 = (i: number) => (b[i] << 8) | b[i + 1];
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: 'image/png', w: (b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) >>> 0, h: (b[20] << 24 | b[21] << 16 | b[22] << 8 | b[23]) >>> 0 };
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return { mime: 'image/gif', w: b[6] | (b[7] << 8), h: b[8] | (b[9] << 8) };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { mime: 'image/webp' };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { mime: 'image/jpeg', h: u16(i + 5), w: u16(i + 7) };
      i += 2 + u16(i + 2);
    }
    return { mime: 'image/jpeg' };
  }
  return null;
}
const cleanName = (s: string) => s.normalize('NFKC').replace(/[/\\?%*:|"<>\u0000-\u001f]/g, '').replace(/\.{2,}/g, '.').replace(/\s+/g, ' ').trim().slice(0, 120) || 'image';

const asset = z.object({ id: z.string(), url: z.string(), alt: z.string(), fileName: z.string(), mime: z.string(), kind: z.string(), width: z.number(), height: z.number(), size: z.number(), uploadedBy: z.string(), createdAt: z.string().nullable() });
const usage = z.object({ type: z.string(), id: z.string(), title: z.string(), live: z.boolean() });

async function findUsage(id: string, url: string) {
  const like = `%${url}%`;
  const [posts, blocks, cols, tracks] = await Promise.all([
    zite.sql({ query: `SELECT id, "title" AS t, "status" AS s FROM "Posts" WHERE "status" <> 'deleted' AND ("coverMediaId" = $1 OR "body" LIKE $2) LIMIT 50`, params: [id, like] }),
    zite.sql({ query: `SELECT id, "key" AS t, ("publishedContent" LIKE $1) AS live FROM "CmsBlocks" WHERE "content" LIKE $1 OR "publishedContent" LIKE $1 LIMIT 50`, params: [like] }),
    zite.sql({ query: `SELECT id, "title" AS t, "status" AS s FROM "Collections" WHERE "status" <> 'deleted' AND "coverUrl" = $1 LIMIT 50`, params: [url] }),
    zite.sql({ query: `SELECT id, "title" AS t, "status" AS s FROM "Tracks" WHERE "status" <> 'deleted' AND "coverUrl" = $1 LIMIT 50`, params: [url] }),
  ]);
  return [
    ...posts.rows.map((r) => ({ type: 'post', id: String(r.id), title: String(r.t ?? ''), live: r.s === 'published' })),
    ...blocks.rows.map((r) => ({ type: 'cms', id: String(r.id), title: String(r.t ?? ''), live: !!r.live })),
    ...cols.rows.map((r) => ({ type: 'collection', id: String(r.id), title: String(r.t ?? ''), live: r.s === 'published' })),
    ...tracks.rows.map((r) => ({ type: 'track', id: String(r.id), title: String(r.t ?? ''), live: r.s === 'published' })),
  ];
}

export default createEndpoint({
  description: 'Media library: list, register a verified upload, edit alt text, check usage, delete safely',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['list', 'register', 'update', 'usage', 'delete']),
    id: z.string().max(64).optional(),
    url: z.string().max(600).optional(),
    alt: z.string().trim().max(200).optional(),
    fileName: z.string().max(200).optional(),
    width: z.number().int().min(0).max(20000).optional(),
    height: z.number().int().min(0).max(20000).optional(),
    force: z.boolean().optional(),
  }),
  outputSchema: z.object({ assets: z.array(asset), usage: z.array(usage), saved: asset.nullable() }),
  execute: async ({ input }) => {
    const { member } = await requireStaff(input.token, 'content.manage');
    let usageOut: z.infer<typeof usage>[] = [];
    let savedId: string | null = null;

    if (input.action === 'register') {
      let u: URL;
      try { u = new URL(input.url ?? ''); } catch { throw bad('آدرس فایل معتبر نیست.'); }
      // Local port: the standalone build stores uploads as `data:` URLs, which the
      // browser can still fetch (and the magic-byte check below still applies).
      const appHost = (() => { try { return new URL(process.env.ZITE_APP_URL ?? '').hostname; } catch { return ''; } })();
      const localUpload =
        u.protocol === 'data:' ||
        (!!appHost && u.hostname === appHost) ||
        u.hostname === 'localhost' ||
        u.hostname === '127.0.0.1';
      if (!localUpload && (u.protocol !== 'https:' || !ALLOWED_UPLOAD_HOSTS.includes(u.hostname))) throw bad('فقط فایل‌های آپلودشده در کایار قابل ثبت هستند.');
      if (!input.alt) throw bad('متن جایگزین (alt) الزامی است.');
      const res = await fetch(u.toString());
      if (!res.ok) throw bad('فایل آپلودشده قابل بازیابی نیست؛ دوباره آپلود کن.');
      const len = Number(res.headers.get('content-length') ?? 0);
      if (len > MAX_IMAGE_BYTES) throw bad('حجم تصویر بیشتر از ۵ مگابایت است.');
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength > MAX_IMAGE_BYTES) throw bad('حجم تصویر بیشتر از ۵ مگابایت است.');
      if (buf.byteLength < 32) throw bad('فایل خالی یا ناقص است.');
      const s = sniff(buf);
      if (!s) throw bad('فقط تصاویر JPG، PNG، WebP یا GIF مجاز هستند (نوع واقعی فایل بررسی شد).');
      const exists = await zite.mediaAssets.findOne({ filters: { fileUrl: u.toString() } });
      if (exists) throw bad('این فایل قبلاً در کتابخانه ثبت شده است.');
      const c = await zite.mediaAssets.create({ record: {
        alt: input.alt, fileUrl: u.toString(), kind: 'image', fileName: cleanName(input.fileName ?? ''), mimeType: s.mime,
        width: s.w || input.width || 0, height: s.h || input.height || 0, size: buf.byteLength, uploadedBy: member.id,
      } as never });
      savedId = c.id;
      await audit(member.id, 'media.upload', 'media', c.id, { mime: s.mime, size: buf.byteLength });
    } else if (input.action !== 'list') {
      const a = input.id ? await zite.mediaAssets.findOne({ id: input.id }) : undefined;
      if (!a) throw bad('رسانه پیدا نشد.');
      if (input.action === 'update') {
        if (!input.alt) throw bad('متن جایگزین (alt) الزامی است.');
        await zite.mediaAssets.update({ id: a.id, record: { alt: input.alt } });
        savedId = a.id;
        await audit(member.id, 'media.update', 'media', a.id);
      } else {
        usageOut = await findUsage(a.id, a.fileUrl ?? '');
        if (input.action === 'delete') {
          if (usageOut.some((x) => x.live)) throw bad('این تصویر در محتوای منتشرشده استفاده شده؛ اول آن را از محتوا جدا کن.');
          if (usageOut.length && !input.force) throw bad('این تصویر در پیش‌نویس‌ها استفاده شده؛ برای حذف تأیید کن.');
          await Promise.all(usageOut.filter((x) => x.type === 'post').map((x) => zite.posts.findOne({ id: x.id }).then((p) => p?.coverMediaId === a.id ? zite.posts.update({ id: x.id, record: { coverMediaId: '' } }) : null)));
          await zite.mediaAssets.delete({ id: a.id });
          await audit(member.id, 'media.delete', 'media', a.id, { usedInDrafts: usageOut.length });
          usageOut = [];
        }
      }
    }

    const { records } = await zite.mediaAssets.findAll({ limit: 2000 });
    const ids = Array.from(new Set(records.map((r) => r.uploadedBy).filter((x): x is string => !!x)));
    const ms = ids.length ? await zite.members.findAll({ filters: { id: { in: ids } }, fields: ['displayName', 'username'], limit: 500 }) : { records: [] };
    const names = new Map<string, string>(ms.records.map((m) => [m.id, m.displayName || m.username || '—'] as [string, string]));
    const assets = records.map((r) => {
      const x = r as typeof r & { fileName?: string; mimeType?: string };
      return { id: r.id, url: r.fileUrl ?? '', alt: r.alt ?? '', fileName: x.fileName ?? '', mime: x.mimeType ?? '', kind: r.kind ?? 'image', width: r.width ?? 0, height: r.height ?? 0, size: r.size ?? 0, uploadedBy: names.get(r.uploadedBy ?? '') ?? '—', createdAt: r.createdAt ?? null };
    }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return { assets, usage: usageOut, saved: assets.find((a) => a.id === savedId) ?? null };
  },
});
