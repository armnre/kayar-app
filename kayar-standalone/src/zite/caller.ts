/**
 * KAYAR client transport.
 *
 * The same callers drive two backends:
 *   • **HTTP**  — when the real KAYAR server (`server/`) answers `GET /api/health`, every call is
 *     a `POST /api/<endpoint>` with the endpoint's input, validated server-side by its own zod
 *     schema. Sessions, uploads, AI keys and payments all live on the server.
 *   • **local** — when no server is reachable (e.g. this file opened straight from disk), the
 *     endpoint module runs in the browser against a `localStorage` database, so the product still
 *     works fully offline.
 *
 * The switch happens automatically on the first request and is re-evaluated if the server goes
 * away, with a single console notice — no UI code has to care.
 */

import { ZiteError } from './backend';

export type LocalEndpoint = {
  description?: string;
  inputSchema?: { safeParse?: (v: unknown) => { success: boolean; data?: any; error?: any } };
  outputSchema?: unknown;
  execute: (args: { input: any; ctx?: any; env?: any }) => any;
};

const registry = new Map<string, LocalEndpoint>();

export function registerEndpoints(map: Record<string, any>) {
  for (const [name, mod] of Object.entries(map)) {
    registry.set(name, (mod && mod.default) || (mod as LocalEndpoint));
  }
}

export const endpointNames = () => [...registry.keys()];

/* ------------------------------------------------------------------ runtime */

const runtime = ((globalThis as any).__KAYAR_ENV ?? {}) as Record<string, string | undefined>;
const resolvedApiUrl = String(
  runtime.KAYAR_API_URL ??
    (import.meta as any).env?.VITE_API_URL ??
    // same-origin by default: the server serves the built frontend itself
    (typeof location !== 'undefined' && location.protocol.startsWith('http') ? '/api' : 'http://localhost:8787/api'),
).replace(/\/$/, '');

export const backendUrl = () => resolvedApiUrl;
let backendMode: boolean | null = null;
let probe: Promise<boolean> | null = null;

/** Detects the backend once; safe to await on every request. */
export function detectBackend(): Promise<boolean> {
  if (backendMode !== null) return Promise.resolve(backendMode);
  probe ??= (async () => {
    if (typeof fetch !== 'function') return (backendMode = false);
    try {
      const res = await fetch(`${resolvedApiUrl}/health`, { signal: AbortSignal.timeout(3000) });
      const data = (await res.json().catch(() => null)) as { mode?: string } | null;
      backendMode = res.ok && data?.mode === 'backend';
    } catch {
      backendMode = false;
    }
    if (backendMode) console.info(`[kayar] ✓ بک‌اند واقعی فعال است → ${resolvedApiUrl}`);
    else console.info('[kayar] بک‌اند در دسترس نیست → حالت محلی (localStorage)');
    return backendMode;
  })();
  return probe;
}

/** `true` once the KAYAR server has been detected (used by the upload client and the UI). */
export const isBackendMode = () => backendMode === true;

/** Forces a fresh detection (e.g. after starting the server). */
export function resetTransport() {
  backendMode = null;
  probe = null;
}

const delay = () => new Promise((r) => setTimeout(r, 70 + Math.random() * 80));

function errorFromEnvelope(envelope: any): ZiteError {
  const err = envelope?.error ?? {};
  return new ZiteError({
    code: String(err.type ?? err.code ?? 'INTERNAL'),
    message: String(err.message ?? 'HTTP_ERROR'),
    userFacingMessage: err.user_facing_message ?? err.userFacingMessage ?? undefined,
  });
}

async function callRemote(name: string, input: any): Promise<unknown> {
  const res = await fetch(`${resolvedApiUrl}/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw errorFromEnvelope(body);
  return (body as { output?: unknown })?.output;
}

async function callLocal(name: string, input: any): Promise<unknown> {
  const endpoint = registry.get(name);
  if (!endpoint) {
    throw new ZiteError({
      code: 'NOT_FOUND',
      message: `LOCAL_ENDPOINT_MISSING:${name}`,
      userFacingMessage: 'این بخش در این نسخه در دسترس نیست.',
    });
  }
  let data: any = input ?? {};
  const schema = endpoint.inputSchema;
  if (schema?.safeParse) {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      const issue = parsed.error?.issues?.[0];
      throw new ZiteError({
        code: 'BAD_REQUEST',
        message: `INVALID_INPUT ${name} ${issue?.path?.join?.('.') ?? ''} ${issue?.message ?? ''}`.trim(),
        userFacingMessage: /[\u0600-\u06FF]/.test(String(issue?.message)) ? String(issue.message) : 'ورودی نامعتبر است؛ مقدارها را بازبینی کن.',
      });
    }
    data = parsed.data;
  }
  await delay();
  try {
    return await endpoint.execute({ input: data, ctx: {}, env: (globalThis as any).process?.env });
  } catch (e) {
    if (e instanceof ZiteError) throw e;
    const err = e as { message?: string; userFacingMessage?: string; name?: string };
    if (err?.name === 'AbortError') throw new ZiteError({ code: 'INTERNAL', message: 'aborted', userFacingMessage: 'درخواست لغو شد.' });
    console.warn(`[kayar] local endpoint "${name}" failed`, e);
    throw new ZiteError({ code: 'INTERNAL', message: err?.message ?? 'LOCAL_ENDPOINT_FAILED', userFacingMessage: err?.userFacingMessage });
  }
}

export function createCaller<TIn = any, TOut = any>(name: string) {
  return async (input?: TIn): Promise<TOut> => {
    if (await detectBackend()) {
      try {
        return (await callRemote(name, input ?? {})) as TOut;
      } catch (e) {
        if (e instanceof ZiteError) throw e;
        // transport failure → fall back to the local engine and remember it
        console.warn(`[kayar] backend unreachable on "${name}" — falling back to local mode`, e);
        backendMode = false;
        probe = Promise.resolve(false);
      }
    }
    return (await callLocal(name, input ?? {})) as TOut;
  };
}
