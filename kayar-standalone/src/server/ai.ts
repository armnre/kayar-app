/**
 * بدن‌یار AI client — NaraRouter (OpenAI-compatible gateway).
 *
 * Runs in BOTH environments with one implementation:
 *   • backend  → the key lives in `server/.env` (`NARAROUTER_API_KEY`) and never leaves the server;
 *   • browser  → only usable when the user supplies a key at runtime (`window.__KAYAR_ENV`),
 *                otherwise the assistant reports itself as not configured.
 *
 * "Best model for each position": every task (chat, plan, vision, fast, code, classify) has its
 * own ordered model panel. Requests walk the panel, failing over on
 * 402/403/404/408/429/5xx/timeouts, and pay-as-you-go aliases are skipped unless credits exist
 * (`NARAROUTER_ALLOW_PAID=1`). Structured tasks can use NaraRouter's System One (`jev`).
 */
import { ZiteError } from '@/zite/backend';

const env = process.env as Record<string, string | undefined>;

/* --------------------------------------------------------------- model panels */

/** Free-plan aliases (no credits required). */
export const FREE_MODELS = [
  'nemotron-3-ultra-free',       // 1M ctx, strongest free reasoning
  'nemotron-3.5-lightning-free', // fastest free
  'agnes-2.5-flash',             // free, vision capable
  'laguna-s-2.1',                // free
  'jev',                         // System One (structured answers)
];
/** Bonus aliases — free while a qualifying balance is held. */
export const BONUS_MODELS = [
  'deepseek-v4.1-flash-free',
  'mimo-v2.6-flash-free',
  'muse-spark-1.3-contributor-free',
  'agnes-3-flash',
  'stepfun-3.7-flash',
  'step-5-preview',
];
/** Paid aliases — activated once PAYG is on / credited. */
export const PAID_MODELS = [
  'gpt-5.6-sol', 'gpt-5.6-luna', 'gpt-6-astra', 'claude-sonnet-5.5', 'claude-opus-5.5',
  'gemini-3.8-flash-high', 'qwen3.8-max', 'deepseek-v4-pro', 'kimi-k2.7-code', 'glm-5.3', 'minimax-m3',
];

/** Task positions, best-first. Each panel degrades to always-available free models. */
export const PANELS: Record<string, string[]> = {
  /** گفتگوی بدنیار: مربی ورزشی و تغذیه */
  chat: ['gpt-5.6-sol', 'claude-sonnet-5.5', 'nemotron-3-ultra-free', 'agnes-2.5-flash', 'deepseek-v4.1-flash-free', 'mimo-v2.6-flash-free'],
  /** ساخت برنامه‌ی تمرین/تغذیه (JSON ساخت‌یافته، دقت بالا) */
  plan: ['gpt-6-astra', 'gpt-5.6-sol', 'claude-opus-5.5', 'nemotron-3-ultra-free', 'agnes-3-flash', 'agnes-2.5-flash'],
  /** تحلیل تصویر (عکس بدن، عکس غذا، اسکرین‌شات برنامه) */
  vision: ['gpt-5.6-luna', 'gemini-3.8-flash-high', 'agnes-2.5-flash', 'mimo-v2.6-flash-free', 'nemotron-3-ultra-free'],
  /** کارهای سبک و سریع (برچسب، عنوان، خلاصه) */
  fast: ['nemotron-3.5-lightning-free', 'laguna-s-2.1', 'agnes-2.5-flash', 'mimo-v2.6-flash-free'],
  /** کد و متن‌های فنی (اسکریپت، پیکربندی) */
  code: ['kimi-k2.7-code', 'gpt-6-astra', 'deepseek-v4-pro', 'nemotron-3-ultra-free'],
  /** تحلیل ساخت‌یافته‌ی وضعیت کاربر (System One: choice / score / noul) */
  classify: ['jev'],
};

export type AiPosition = keyof typeof PANELS;

/** Models that reason before answering — they get a bigger output budget. */
const REASONING = new Set(['nemotron-3-ultra-free', 'gpt-5.6-sol', 'gpt-6-astra', 'claude-opus-5.5', 'claude-sonnet-5.5', 'deepseek-v4-pro', 'qwen3.8-max', 'kimi-k2.7-code', 'glm-5.3']);

/* -------------------------------------------------------------------- config */

export type AiConfig = {
  baseUrl: string;
  apiKey: string;
  allowPaid: boolean;
  timeoutMs: number;
};

function readConfig(): AiConfig {
  return {
    baseUrl: (env.NARAROUTER_BASE_URL ?? env.ZITE_AI_BASE_URL ?? 'https://router.bynara.id/v1').replace(/\/$/, ''),
    apiKey: env.NARAROUTER_API_KEY ?? env.ZITE_AI_API_KEY ?? '',
    allowPaid: /^(1|true|yes|on)$/i.test(env.NARAROUTER_ALLOW_PAID ?? ''),
    timeoutMs: Number(env.NARAROUTER_TIMEOUT_MS ?? 60_000),
  };
}

export const aiConfigured = () => Boolean(readConfig().apiKey);

/** Panel for a position, filtered by plan entitlements. */
export function panelFor(position: AiPosition | string): string[] {
  const cfg = readConfig();
  const panel = PANELS[position] ?? PANELS.chat!;
  const free = new Set([...FREE_MODELS, ...BONUS_MODELS]);
  return panel.filter((m) => cfg.allowPaid || free.has(m) || grantedModels().has(m));
}

/* ------------------------------------------------------- entitlement discovery */

let granted: Set<string> | null = null;
let grantedAt = 0;
export const grantedModels = () => granted ?? new Set<string>();

/** `GET /v1/models` — cached for 10 minutes; never throws. */
export async function refreshModels(force = false): Promise<{ ok: boolean; models: string[]; reason?: string }> {
  const cfg = readConfig();
  if (!cfg.apiKey) return { ok: false, models: [], reason: 'no_key' };
  if (!force && granted && Date.now() - grantedAt < 10 * 60_000) return { ok: true, models: [...granted] };
  try {
    const res = await fetch(`${cfg.baseUrl}/models`, {
      headers: { authorization: `Bearer ${cfg.apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    if (!res.ok) {
      const reason = /telegram_required/.test(text) ? 'telegram_required' : `http_${res.status}`;
      granted = new Set();
      grantedAt = Date.now();
      return { ok: false, models: [], reason };
    }
    const data = JSON.parse(text) as { data?: { id?: string }[]; models?: { id?: string }[] };
    const ids = (data.data ?? data.models ?? []).map((m) => String(m.id ?? '')).filter(Boolean);
    granted = new Set(ids);
    grantedAt = Date.now();
    return { ok: true, models: ids };
  } catch (e) {
    return { ok: false, models: [], reason: (e as Error).name === 'TimeoutError' ? 'timeout' : 'unreachable' };
  }
}

/** Live status for the admin dashboard / health endpoint. Never throws. */
export async function aiStatus(force = false) {
  const cfg = readConfig();
  if (!cfg.apiKey) {
    return { configured: false, reachable: false, reason: 'not_configured' as const, baseUrl: cfg.baseUrl, allowPaid: cfg.allowPaid, panels: PANELS, models: [] as string[] };
  }
  const probe = await refreshModels(force);
  return {
    configured: true,
    reachable: probe.ok,
    reason: probe.ok ? ('ok' as const) : ((probe.reason ?? 'unreachable') as 'ok' | 'no_key' | 'telegram_required' | 'timeout' | 'unreachable' | string),
    baseUrl: cfg.baseUrl,
    allowPaid: cfg.allowPaid,
    panels: PANELS,
    models: probe.models,
  };
}

export const AI_REASON_FA: Record<string, string> = {
  not_configured: 'کلید هوش مصنوعی روی سرور تنظیم نشده است (NARAROUTER_API_KEY).',
  telegram_required: 'حساب NaraRouter قفل است: باید در گروه/کانال تلگرام عضو شوی و از Settings دوباره لینک کنی.',
  unreachable: 'ارتباط با درگاه هوش مصنوعی برقرار نشد؛ اتصال شبکه‌ی سرور را بررسی کن.',
  timeout: 'پاسخ درگاه هوش مصنوعی طول کشید؛ دوباره تلاش کن.',
  no_key: 'کلید هوش مصنوعی تنظیم نشده است.',
};

/* ---------------------------------------------------------------- chat calls */

export type AiMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string }
  | { role: 'user'; content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> };

export type ChatOpts = {
  position?: AiPosition | string;
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max' | 'ultra';
  model?: string;
};

type Attempt = { model: string; ok: boolean; status?: number; reason?: string };

const RETRYABLE = new Set([402, 403, 404, 408, 409, 425, 429, 500, 502, 503, 504]);

async function post(path: string, body: unknown, timeoutMs: number) {
  const cfg = readConfig();
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  return { res, text };
}

const noAi = () =>
  new ZiteError({
    code: 'BAD_REQUEST',
    message: 'AI_NOT_CONFIGURED',
    userFacingMessage: 'دستیار هوشمند روی این نصب فعال نشده؛ کلید NaraRouter را در تنظیمات سرور قرار بده.',
  });

function extractContent(text: string) {
  try {
    const data = JSON.parse(text) as {
      choices?: { message?: { content?: string; reasoning_content?: string } }[];
      error?: { message?: string; type?: string };
    };
    const msg = data.choices?.[0]?.message;
    return { content: msg?.content ?? '', error: data.error?.message ?? '' };
  } catch {
    return { content: '', error: text.slice(0, 200) };
  }
}

/**
 * Chat completion with panel fail-over. `attempts` (when passed) records every model tried,
 * which the admin panel surfaces so failures are never silent.
 */
export async function aiChat(messages: AiMessage[], opts: ChatOpts = {}, attempts: Attempt[] = []): Promise<string> {
  if (!aiConfigured()) throw noAi();
  const cfg = readConfig();
  const panel = opts.model ? [opts.model] : panelFor(opts.position ?? 'chat');
  if (!panel.length) {
    throw new ZiteError({
      code: 'BAD_REQUEST',
      message: 'AI_NO_ENTITLED_MODEL',
      userFacingMessage: 'هیچ مدلی برای این درخواست در دسترس نیست؛ وضعیت حساب NaraRouter را بررسی کن.',
    });
  }
  let lastError = '';
  for (const model of panel) {
    try {
      const { res, text } = await post(
        '/chat/completions',
        {
          model,
          messages,
          temperature: opts.temperature ?? 0.6,
          max_tokens: opts.maxTokens ?? (REASONING.has(model) ? 3072 : 1500),
          ...(opts.effort && REASONING.has(model) ? { reasoning_effort: opts.effort } : {}),
          ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
        },
        cfg.timeoutMs,
      );
      if (!res.ok) {
        const parsed = extractContent(text);
        attempts.push({ model, ok: false, status: res.status, reason: parsed.error.slice(0, 180) });
        lastError = `AI_HTTP_${res.status}`;
        if (RETRYABLE.has(res.status)) continue;
        break;
      }
      let { content } = extractContent(text);
      if (!content.trim()) {
        // Reasoning models can spend the whole budget on thinking: retry once with more room.
        const retry = await post(
          '/chat/completions',
          {
            model,
            messages,
            temperature: opts.temperature ?? 0.6,
            max_tokens: Math.max(4096, (opts.maxTokens ?? 1200) * 3),
            ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
          },
          cfg.timeoutMs,
        );
        content = extractContent(retry.text).content;
      }
      if (!content.trim()) {
        attempts.push({ model, ok: false, status: res.status, reason: 'empty content' });
        continue;
      }
      attempts.push({ model, ok: true, status: 200 });
      return content;
    } catch (e) {
      const isTimeout = (e as Error).name === 'TimeoutError';
      attempts.push({ model, ok: false, reason: isTimeout ? 'timeout' : 'network error' });
      lastError = isTimeout ? 'AI_TIMEOUT' : 'AI_NETWORK';
      continue;
    }
  }
  console.error('[kayar] AI panels exhausted:', JSON.stringify(attempts));
  throw new ZiteError({
    code: 'BAD_REQUEST',
    message: lastError || 'AI_FAILED',
    userFacingMessage: 'دستیار هوشمند الان در دسترس نیست؛ کمی بعد دوباره امتحان کن.',
  });
}

/** Streaming chat — used by the SSE bridge in the backend (`/api/ai/stream`). */
export async function aiChatStream(
  messages: AiMessage[],
  opts: ChatOpts = {},
  onDelta: (chunk: string) => void,
): Promise<{ model: string; full: string }> {
  if (!aiConfigured()) throw noAi();
  const cfg = readConfig();
  const panel = opts.model ? [opts.model] : panelFor(opts.position ?? 'chat');
  let lastError = '';
  for (const model of panel) {
    try {
      const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature: opts.temperature ?? 0.6,
          max_tokens: opts.maxTokens ?? 1500,
          ...(opts.effort && REASONING.has(model) ? { reasoning_effort: opts.effort } : {}),
        }),
        signal: AbortSignal.timeout(cfg.timeoutMs),
      });
      if (!res.ok || !res.body) {
        lastError = `AI_HTTP_${res.status}`;
        if (RETRYABLE.has(res.status)) continue;
        break;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) { full += delta; onDelta(delta); }
          } catch { /* ignore malformed keep-alives */ }
        }
      }
      if (!full.trim()) continue;
      return { model, full };
    } catch (e) {
      lastError = (e as Error).name === 'TimeoutError' ? 'AI_TIMEOUT' : 'AI_NETWORK';
      continue;
    }
  }
  throw new ZiteError({ code: 'BAD_REQUEST', message: lastError || 'AI_FAILED', userFacingMessage: 'دستیار هوشمند الان در دسترس نیست؛ کمی بعد دوباره امتحان کن.' });
}

/* ------------------------------------------------------------- System One (jev) */

export type SystemOneQuestion =
  | { type: 'choice'; instructions: string; criteria: Record<string, string> }
  | { type: 'score'; instructions: string; criteria: string[] }
  | { type: 'noul'; instructions: string };

export async function systemOne(state: string, questions: Record<string, SystemOneQuestion>, model = 'jev') {
  if (!aiConfigured()) throw noAi();
  const cfg = readConfig();
  const { res, text } = await post('/systemone', { model, state, questions }, cfg.timeoutMs);
  if (!res.ok) {
    throw new ZiteError({ code: 'BAD_REQUEST', message: `SYSTEMONE_${res.status}`, userFacingMessage: 'تحلیل هوشمند وضعیت الان در دسترس نیست.' });
  }
  return JSON.parse(text) as { answers: Record<string, { type: string; choice?: string; score?: number; noul?: number; confidence?: number }> };
}

/* -------------------------------------------------------------------- prompts */

export const BODYYAR_SYSTEM_PROMPT = `تو «بدن‌یار» هستی، مربی ورزش و تغذیه‌ی اپ کایار (برند کاپوش). فارسی، صمیمی و کوتاه جواب بده.
قواعد:
- برنامه‌ها امن، واقع‌بینانه و متناسب با سطح، هدف، تجهیزات و محدودیت‌های کاربر بساز.
- هیچ‌وقت توصیه‌ی پزشکی نده؛ در درد، بارداری یا بیماری، ارجاع به پزشک بده.
- واحدها را فارسی بنویس (کیلوگرم، سانتی‌متر، دقیقه) و اعداد را واضح بگو.
- اگر اطلاعات کافی نیست، حداکثر ۲ سؤال کوتاه بپرس.`;

export const PLAN_JSON_PROMPT = `${BODYYAR_SYSTEM_PROMPT}
فقط JSON برگردان با این ساختار:
{"title": string, "summary": string, "days":[{"name": string, "focus": string, "exercises":[{"name": string, "sets": number, "reps": string, "rest": string, "note": string}]}], "nutrition":{"calories": number, "proteinGrams": number, "tips": string[]}, "warnings": string[]}`;
