/**
 * Bundles the backend (and the shared product code it reuses) into `server/dist/server.mjs`.
 * `@/zite/db` is redirected to the SQLite adapter; everything else keeps the app's own code.
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';

await build({
  entryPoints: [path.join(root, 'server/index.ts')],
  outfile: path.join(root, 'server/dist/server.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: false,
  minify: false,
  logLevel: 'info',
  external: ['better-sqlite3', 'express', 'cors', 'multer'],
  alias: {
    '@/zite/db': path.join(root, 'server/zite-db.ts'),
    '@/zite/backend': path.join(root, 'src/zite/backend.ts'),
    '@': path.join(root, 'src'),
  },
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);",
  },
});
console.log('✓ server bundled → server/dist/server.mjs');
