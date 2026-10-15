/**
 * KAYAR backend — HTTP router.
 *
 * Every endpoint of the product (26 of them, defined in `src/api/*.ts`) is exposed as
 * `POST /api/<name>` with a `{ input }` body. Input is validated by the endpoint's own zod
 * schema, errors use the platform's envelope, and the responses are the endpoint outputs —
 * so the browser app can talk to this server without any change to its business logic.
 */
import type { Express, Request } from 'express';
import { endpoints } from '@/zite/api';
import { ZiteError } from '@/zite/backend';

type Ctx = { ip: string; userAgent: string; origin: string };

/** Small in-memory rate limiter (per IP + bucket). Good enough for one node, no Redis needed. */
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }
  b.count++;
  return { ok: b.count <= max, remaining: Math.max(0, max - b.count) };
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
}, 60_000).unref?.();

const ctxOf = (req: Request): Ctx => ({
  ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown',
  userAgent: String(req.headers['user-agent'] ?? '').slice(0, 300),
  origin: String(req.headers.origin ?? ''),
});

function errorEnvelope(e: unknown) {
  if (e instanceof ZiteError) {
    return { status: e.status || 400, body: { error: { type: e.code, message: e.message, user_facing_message: e.userFacingMessage ?? null } } };
  }
  const err = e as { message?: string; name?: string };
  if (err?.name === 'AbortError') {
    return { status: 504, body: { error: { type: 'timeout', message: 'upstream timeout', user_facing_message: 'پاسخ سرویس بیرونی طول کشید؛ دوباره تلاش کن.' } } };
  }
  const message = err?.message ?? 'unknown error';
  const friendly = /[\u0600-\u06FF]/.test(message) ? message : null;
  return { status: 500, body: { error: { type: 'internal_error', message, user_facing_message: friendly } } };
}

export function endpointNames() {
  return Object.keys(endpoints);
}

export function mountApi(app: Express) {
  for (const [name, endpoint] of Object.entries(endpoints) as [string, any][]) {
    app.post(`/api/${name}`, async (req, res) => {
      // Login attempts and audit reads get an extra bucket; everything gets a coarse cap.
      const ctx = ctxOf(req);
      const limit =
        name === 'authLogin'
          ? rateLimit(`login:${ctx.ip}`, 20, 60_000)
          : rateLimit(`api:${ctx.ip}`, 300, 60_000);
      if (!limit.ok) {
        res.status(429).json({
          error: {
            type: 'rate_limited',
            message: 'too many requests',
            user_facing_message: 'تعداد درخواست‌ها زیاد بود؛ یک دقیقه صبر کن و دوباره تلاش کن.',
          },
        });
        return;
      }

      const body = (req.body ?? {}) as { input?: unknown };
      const rawInput = body.input ?? body ?? {};
      try {
        let input: any = rawInput;
        const schema = endpoint.inputSchema;
        if (schema?.safeParse) {
          const parsed = schema.safeParse(rawInput);
          if (!parsed.success) {
            const issue = parsed.error?.issues?.[0];
            res.status(400).json({
              error: {
                type: 'validation_error',
                message: `INVALID_INPUT ${name} ${Array.isArray(issue?.path) ? issue.path.join('.') : ''} ${issue?.message ?? ''}`.trim(),
                user_facing_message: /[\u0600-\u06FF]/.test(String(issue?.message))
                  ? String(issue.message)
                  : 'ورودی نامعتبر است؛ مقدارها را بازبینی کن.',
              },
            });
            return;
          }
          input = parsed.data;
        }
        const output = await endpoint.execute({
          input,
          ctx: { ...ctx, env: process.env },
          env: process.env,
          req,
        });
        // Endpoints may return a bare value; the browser client unwraps `{ output }`.
        res.json({ output, ok: true });
      } catch (e) {
        const { status, body: errBody } = errorEnvelope(e);
        if (status >= 500) console.error(`[kayar] ${name} failed:`, (e as Error)?.stack ?? (e as Error)?.message);
        res.status(status).json(errBody);
      }
    });
  }
}
