/**
 * KAYAR backend — configuration.
 *
 * Reads `server/.env` (or real environment variables) without any dependency.
 * Every value has a safe default so the server always boots.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** Locates the project root whether we run from `server/*.ts` (bundled → server/dist) or ts-node. */
function findRoot(): string {
  const candidates = [
    process.env.KAYAR_ROOT,
    process.cwd(),
    resolve(here, '..'),
    resolve(here, '../..'),
    resolve(here, '../../..'),
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    if (existsSync(resolve(c, 'server/.env')) || (existsSync(resolve(c, 'server')) && existsSync(resolve(c, 'package.json')))) return c;
  }
  return process.cwd();
}

export const rootDir = findRoot();

function parseEnvFile(path: string): Record<string, string> {
  try {
    const out: Record<string, string> = {};
    for (const raw of readFileSync(path, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

/** `server/.env` wins over the process env only for keys it defines. */
export function loadEnv(root = rootDir) {
  const fromFile = parseEnvFile(resolve(root, 'server/.env'));
  const merged: Record<string, string | undefined> = { ...process.env, ...fromFile };
  for (const [k, v] of Object.entries(merged)) if (v !== undefined) process.env[k] = v;
  return merged;
}

export const envFileLoaded = Object.keys(parseEnvFile(resolve(rootDir, 'server/.env'))).length > 0;

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const bool = (v: string | undefined, fallback = false) =>
  v === undefined ? fallback : /^(1|true|yes|on)$/i.test(v);

loadEnv();

export const config = {
  port: num(process.env.PORT, 8787),
  host: process.env.HOST ?? '0.0.0.0',
  /** SQLite database file (created automatically). */
  dbPath: resolve(rootDir, process.env.KAYAR_DB ?? 'server/kayar.db'),
  /** Public base URL of this backend — used for uploads, callbacks and emails. */
  appUrl: (process.env.KAYAR_APP_URL ?? `http://localhost:${num(process.env.PORT, 8787)}`).replace(/\/$/, ''),
  /** Directory serving the built single-file frontend (`dist/`). */
  distDir: resolve(rootDir, process.env.KAYAR_DIST ?? 'dist'),
  uploadsDir: resolve(rootDir, process.env.KAYAR_UPLOADS ?? 'server/uploads'),
  /** CORS origins: comma separated, `*` allows any (default: appUrl + localhost dev servers). */
  corsOrigins: (process.env.KAYAR_CORS ?? '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  auth: {
    pepper: process.env.ZITE_AUTH_PEPPER ?? 'kayar-dev-pepper',
    bootstrapUsername: process.env.ZITE_BOOTSTRAP_ADMIN_USERNAME ?? 'admin',
    bootstrapPassword: process.env.ZITE_BOOTSTRAP_ADMIN_PASSWORD ?? '',
  },

  ai: {
    baseUrl: (process.env.NARAROUTER_BASE_URL ?? 'https://router.bynara.id/v1').replace(/\/$/, ''),
    apiKey: process.env.NARAROUTER_API_KEY ?? process.env.ZITE_AI_API_KEY ?? '',
    /** Paid aliases stay out of the routing table unless this is on. */
    allowPaid: bool(process.env.NARAROUTER_ALLOW_PAID, false),
    requestTimeoutMs: num(process.env.NARAROUTER_TIMEOUT_MS, 60_000),
  },

  jamendo: { clientId: process.env.ZITE_JAMENDO_CLIENT_ID ?? '' },

  pay: {
    provider: (process.env.PAY_PROVIDER ?? 'disabled') as 'disabled' | 'zarinpal' | 'zibal' | 'idpay' | 'payir',
    /** IRR (Rial) or IRT (Toman). Gateways expect Rial; we convert when set to IRT. */
    currency: (process.env.PAY_CURRENCY ?? 'IRT').toUpperCase() as 'IRR' | 'IRT',
    callbackBase: (process.env.PAY_CALLBACK_BASE ?? process.env.KAYAR_APP_URL ?? '').replace(/\/$/, ''),
    sandbox: bool(process.env.PAY_SANDBOX, false),
    mercurial: {
      zarinpal: process.env.ZARINPAL_MERCHANT_ID ?? '',
      zibal: process.env.ZIBAL_MERCHANT ?? '',
      idpay: process.env.IDPAY_API_KEY ?? '',
      payir: process.env.PAYIR_API_KEY ?? '',
    },
    /** Shared secret for shop → KAYAR account provisioning webhooks. */
    kapooshSecret: process.env.KAPOOSH_WEBHOOK_SECRET ?? '',
  },
};

export const isProd = process.env.NODE_ENV === 'production';
