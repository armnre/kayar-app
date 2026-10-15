/**
 * Browser stand-in for the platform's server environment.
 *
 * The original KAYAR backend reads configuration from `process.env.ZITE_*`
 * (see `.zite/env.d.ts` in the upstream repo). Because this port runs the very same
 * endpoint code inside the browser, we install a small `process.env` shim first.
 *
 * Values can be overridden at runtime from the console or a hosting snippet:
 *   window.__KAYAR_ENV = { ZITE_JAMENDO_CLIENT_ID: '…' }
 */

export const KAYAR_ENV_DEFAULTS: Record<string, string> = {
  /** Demo super-admin created by the auth bootstrap (username / password). */
  ZITE_BOOTSTRAP_ADMIN_USERNAME: 'admin',
  ZITE_BOOTSTRAP_ADMIN_PASSWORD: 'kayar1403',
  /** Optional: enables the live Jamendo music source in «مرشد». */
  ZITE_JAMENDO_CLIENT_ID: '',
  /**
   * AI gateway (NaraRouter). In backend mode the real key lives in `server/.env` and this value
   * stays empty, so the secret is never shipped to browsers. For a quick local demo you may set
   * `window.__KAYAR_ENV.NARAROUTER_API_KEY` yourself — never commit a key into the bundle.
   */
  NARAROUTER_BASE_URL: 'https://router.bynara.id/v1',
  NARAROUTER_API_KEY: '',
  NARAROUTER_ALLOW_PAID: '',
  /** Optional: enables «بدنیار» AI answers (OpenAI-compatible endpoint). */
  ZITE_AI_API_KEY: '',
  ZITE_AI_BASE_URL: '',
  ZITE_AI_MODEL: '',
  /** Salt mixed into PBKDF2 derivations. */
  ZITE_AUTH_PEPPER: 'kayar-local-port',
};

export function installEnv(): Record<string, string | undefined> {
  const g = globalThis as typeof globalThis & {
    process?: { env: Record<string, string | undefined> };
    __KAYAR_ENV?: Record<string, string>;
    location?: Location;
  };
  const overrides = g.__KAYAR_ENV ?? {};
  const defaults: Record<string, string | undefined> = {
    ZITE_APP_URL: typeof g.location !== 'undefined' ? g.location.origin : 'http://localhost:5173',
    ...KAYAR_ENV_DEFAULTS,
  };
  const env: Record<string, string | undefined> = { ...defaults, ...(g.process?.env ?? {}), ...overrides };
  g.process = g.process ?? ({ env } as never);
  g.process.env = env;
  return env;
}

export const env = installEnv();
