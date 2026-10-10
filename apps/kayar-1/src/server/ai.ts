/**
 * AI infrastructure for Kayar (بدن‌یار / دستیار).
 * Provider-agnostic: set ZITE_AI_API_KEY (and optionally ZITE_AI_BASE_URL / ZITE_AI_MODEL)
 * to any OpenAI-compatible API and everything starts working — no code change needed.
 */
import { ZiteError } from 'zitejs/backend';

export type AiMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const env = process.env as Record<string, string | undefined>;

export function aiConfigured() {
  return Boolean(env.ZITE_AI_API_KEY);
}

export async function aiChat(messages: AiMessage[], opts: { json?: boolean; temperature?: number } = {}): Promise<string> {
  if (!aiConfigured()) {
    throw new ZiteError({ code: 'BAD_REQUEST', message: 'AI_NOT_CONFIGURED', userFacingMessage: 'دستیار هوشمند هنوز فعال نشده؛ به‌زودی در دسترسه.' });
  }
  const base = (env.ZITE_AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.ZITE_AI_API_KEY}` },
    body: JSON.stringify({
      model: env.ZITE_AI_MODEL || 'gpt-4o-mini',
      messages,
      temperature: opts.temperature ?? 0.6,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) {
    console.error('AI error', res.status, await res.text());
    throw new ZiteError({ code: 'BAD_REQUEST', message: `AI_HTTP_${res.status}`, userFacingMessage: 'دستیار هوشمند الان در دسترس نیست؛ کمی بعد دوباره امتحان کن.' });
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}

export const BODYYAR_SYSTEM_PROMPT = `تو «بدن‌یار» هستی، مربی ورزش و تغذیه‌ی اپ کایار. به فارسی صمیمی جواب بده.
برنامه‌ها را امن، واقع‌بینانه و متناسب با سطح، هدف، محدودیت‌ها و تجهیزات کاربر بساز. توصیه‌ی پزشکی نده.`;
