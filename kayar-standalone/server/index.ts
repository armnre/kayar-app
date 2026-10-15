/**
 * KAYAR backend — HTTP entry point.
 *
 * One Node process serves:
 *   • the 26 product endpoints        POST /api/<endpoint>
 *   • uploads                          POST /api/upload   ·   GET /api/file/:name
 *   • AI bridge (NaraRouter)           GET  /api/ai/status ·  POST /api/ai/chat · POST /api/ai/stream
 *   • payments                         /api/pay/*   (see server/payments.ts)
 *   • the built frontend               GET  /*  (dist/index.html, single file)
 */
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from './config';
import { db, ensureSchema, registerSqlHelpers } from './db';
import { mountApi, endpointNames } from './router';
import { mountPayments, payStatus } from './payments';
import { bootstrap } from './seed';
import { aiStatus, aiChat, aiChatStream, aiConfigured, panelFor, AI_REASON_FA } from '@/server/ai';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

app.use(
  cors({
    origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
    credentials: false,
    exposedHeaders: ['x-request-id'],
  }),
);
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true, limit: '3mb' }));

/* --------------------------------------------------------------- uploads */

const UPLOAD_DIR = resolve(config.uploadsDir);
mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

/** Real image type from magic bytes — the extension is never trusted. */
function sniff(b: Uint8Array): { mime: string; ext: string; w?: number; h?: number } | null {
  const u16 = (i: number) => (b[i]! << 8) | b[i + 1]!;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return { mime: 'image/png', ext: 'png', w: ((b[16]! << 24) | (b[17]! << 16) | (b[18]! << 8) | b[19]!) >>> 0, h: ((b[20]! << 24) | (b[21]! << 16) | (b[22]! << 8) | b[23]!) >>> 0 };
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return { mime: 'image/gif', ext: 'gif', w: b[6]! | (b[7]! << 8), h: b[8]! | (b[9]! << 8) };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { mime: 'image/webp', ext: 'webp' };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1]!;
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { mime: 'image/jpeg', ext: 'jpg', h: u16(i + 5), w: u16(i + 7) };
      i += 2 + u16(i + 2);
    }
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  // audio (mp3/m4a/ogg/wav) is accepted for the Morshed library
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return { mime: 'audio/mpeg', ext: 'mp3' };
  if (b[0] === 0xff && (b[1]! & 0xe0) === 0xe0) return { mime: 'audio/mpeg', ext: 'mp3' };
  if (b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53) return { mime: 'audio/ogg', ext: 'ogg' };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x41 && b[10] === 0x56 && b[11] === 0x45) return { mime: 'audio/wav', ext: 'wav' };
  return null;
}

app.post('/api/upload', upload.single('file'), (req, res) => {
  const file = (req as express.Request & { file?: Express.Multer.File }).file;
  if (!file?.buffer?.length) {
    res.status(400).json({ error: { type: 'validation_error', message: 'no file', user_facing_message: 'فایلی ارسال نشد.' } });
    return;
  }
  const kind = sniff(new Uint8Array(file.buffer));
  if (!kind) {
    res.status(400).json({ error: { type: 'validation_error', message: 'unsupported type', user_facing_message: 'فقط تصویر (JPG/PNG/WebP/GIF) یا صدا (MP3/OGG/WAV) مجاز است.' } });
    return;
  }
  const name = `${randomUUID()}.${kind.ext}`;
  writeFileSync(join(UPLOAD_DIR, name), file.buffer);
  res.json({
    ok: true,
    url: `${config.appUrl}/api/file/${name}`,
    path: `/api/file/${name}`,
    name: String(file.originalname ?? name).slice(0, 120),
    mime: kind.mime,
    size: file.buffer.byteLength,
    width: kind.w ?? 0,
    height: kind.h ?? 0,
  });
});

app.get('/api/file/:name', (req, res) => {
  const name = String(req.params.name).replace(/[^\w.-]/g, '');
  const path = join(UPLOAD_DIR, name);
  if (!existsSync(path)) { res.status(404).json({ error: { type: 'not_found', message: 'file missing' } }); return; }
  const type = { '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' }[extname(name).toLowerCase()] ?? 'application/octet-stream';
  res.type(type).set('cache-control', 'public, max-age=31536000, immutable').send(readFileSync(path));
});

/* -------------------------------------------------------------------- AI */

app.get('/api/ai/status', async (req, res) => {
  const force = req.query.force === '1';
  const status = await aiStatus(force);
  res.json({ ok: true, ...status, message: AI_REASON_FA[String(status.reason)] ?? null, panels: Object.fromEntries(Object.keys(status.panels).map((p) => [p, panelFor(p)])) });
});

app.post('/api/ai/chat', async (req, res) => {
  try {
    if (!aiConfigured()) { res.status(503).json({ error: { type: 'ai_not_configured', message: 'AI_NOT_CONFIGURED', user_facing_message: AI_REASON_FA.not_configured } }); return; }
    const attempts: { model: string; ok: boolean; status?: number; reason?: string }[] = [];
    const position = String(req.body?.position ?? 'chat');
    const text = await aiChat(req.body?.messages ?? [], { position, json: Boolean(req.body?.json), temperature: Number(req.body?.temperature ?? 0.6) }, attempts);
    res.json({ ok: true, text, position, attempts });
  } catch (e) {
    res.status(502).json({ error: { type: 'ai_error', message: (e as Error).message, user_facing_message: (e as any).userFacingMessage ?? 'دستیار هوشمند در دسترس نیست.' } });
  }
});

app.post('/api/ai/stream', async (req, res) => {
  if (!aiConfigured()) { res.status(503).json({ error: { type: 'ai_not_configured', message: 'AI_NOT_CONFIGURED' } }); return; }
  res.set({ 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  res.flushHeaders?.();
  try {
    const { model, full } = await aiChatStream(req.body?.messages ?? [], { position: String(req.body?.position ?? 'chat') }, (delta) => {
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    });
    res.write(`data: ${JSON.stringify({ done: true, model, length: full.length })}\n\n`);
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: (e as any).userFacingMessage ?? 'AI error' })}\n\n`);
  }
  res.write('data: [DONE]\n\n');
  res.end();
});

/* --------------------------------------------------------------- health */

app.get('/api/health', async (_req, res) => {
  const counts = {
    members: await db.prepare('SELECT COUNT(*) AS n FROM "Members"').get(),
    posts: await db.prepare('SELECT COUNT(*) AS n FROM "Posts"').get(),
    tracks: await db.prepare('SELECT COUNT(*) AS n FROM "Tracks"').get(),
    orders: await db.prepare('SELECT COUNT(*) AS n FROM "Orders"').get(),
  } as Record<string, { n: number }>;
  res.json({
    ok: true,
    mode: 'backend',
    platform: 'kayar-server',
    version: '2.0.0',
    time: new Date().toISOString(),
    db: { file: config.dbPath, counts: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, Number(v.n)])) },
    endpoints: endpointNames().length,
    ai: { configured: aiConfigured(), ...(await aiStatus()) },
    payments: payStatus(),
  });
});

/* ---------------------------------------------------------- 26 endpoints */

mountApi(app);
mountPayments(app);

/* ------------------------------------------------------------- frontend */

const DIST = resolve(config.distDir);
if (existsSync(DIST)) {
  app.use(express.static(DIST, { index: false, maxAge: '1h' }));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    const index = join(DIST, 'index.html');
    if (!existsSync(index)) { res.status(500).send('dist/index.html missing — run `npm run build`'); return; }
    res.type('html').send(readFileSync(index, 'utf8'));
  });
}

app.use('/api', (_req, res) => res.status(404).json({ error: { type: 'not_found', message: 'unknown endpoint' } }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[kayar] unhandled:', err?.message);
  res.status(500).json({ error: { type: 'internal_error', message: err?.message ?? 'error' } });
});

/* ------------------------------------------------------------------ boot */

async function main() {
  ensureSchema();
  registerSqlHelpers();
  const boot = await bootstrap();
  app.listen(config.port, config.host, () => {
    const base = config.appUrl;
    console.log(`\n  کایار — بک‌اند فعال شد ✅`);
    console.log(`  API      : ${base}/api/health   (${endpointNames().length} endpoints)`);
    console.log(`  Admin    : ${base}/#/admin        اپ: ${base}/#/app`);
    console.log(`  Database : ${resolve(config.dbPath)}`);
    console.log(`  AI       : ${aiConfigured() ? 'NaraRouter configured' : 'not configured (NARAROUTER_API_KEY)'}`);
    console.log(`  Payments : ${payStatus().enabled ? payStatus().provider : 'disabled'}`);
    if (boot.createdSuperadmin) console.log(`  Superadmin created → ${boot.createdSuperadmin} / ${config.auth.bootstrapPassword}`);
    if (boot.seeded) console.log(`  Demo data seeded (${boot.seeded} records)`);
  });
}

main().catch((e) => {
  console.error('[kayar] boot failed:', e);
  process.exit(1);
});

export { app };
