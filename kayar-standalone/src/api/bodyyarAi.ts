import { z } from 'zod';
import { createEndpoint } from '@/zite/backend';
import { aiChat, aiConfigured, systemOne, BODYYAR_SYSTEM_PROMPT, PLAN_JSON_PROMPT, panelFor } from '../server/ai';

const profile = z.object({
  goal: z.string(),
  level: z.string(),
  daysPerWeek: z.number(),
  equipment: z.string().optional(),
  limitations: z.string().optional(),
  age: z.number().optional(),
  weightKg: z.number().optional(),
  heightCm: z.number().optional(),
  gender: z.string().optional(),
  diet: z.string().optional(),
});

/** Extracts the first JSON object from a model answer (tolerates ```json fences and prose). */
function parsePlan(raw: string) {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const candidate = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    return { title: 'برنامه‌ی پیشنهادی', summary: cleaned.slice(0, 900), days: [], nutrition: { tips: [] }, warnings: [] };
  }
}

/**
 * بدن‌یار — the member-facing AI. Positions map to NaraRouter model panels (`plan` for structured
 * programme building, `chat` for coaching, `classify` = System One for structured state reads).
 */
export default createEndpoint({
  description: 'Personal workout/nutrition plan, coaching chat and structured readiness analysis (NaraRouter)',
  inputSchema: z.object({
    mode: z.enum(['status', 'plan', 'chat', 'analyze']),
    profile: profile.optional(),
    messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).optional(),
    state: z.string().optional(),
  }),
  outputSchema: z.object({
    enabled: z.boolean(),
    text: z.string().optional(),
    plan: z.any().optional(),
    analysis: z.any().optional(),
    position: z.string().optional(),
    attempts: z.array(z.object({ model: z.string(), ok: z.boolean(), status: z.number().optional(), reason: z.string().optional() })).optional(),
  }),
  execute: async ({ input }) => {
    if (input.mode === 'status' || !aiConfigured()) {
      return { enabled: aiConfigured(), position: input.mode, attempts: [] };
    }

    if (input.mode === 'plan' && input.profile) {
      const attempts: { model: string; ok: boolean; status?: number; reason?: string }[] = [];
      const raw = await aiChat(
        [
          { role: 'system', content: PLAN_JSON_PROMPT },
          { role: 'user', content: `پروفایل کاربر: ${JSON.stringify(input.profile)}\nیک برنامه‌ی هفتگی واقع‌بینانه بساز.` },
        ],
        { position: 'plan', json: true, temperature: 0.5, maxTokens: 4096 },
        attempts,
      );
      return { enabled: true, plan: parsePlan(raw), position: 'plan', attempts };
    }

    if (input.mode === 'analyze') {
      // System One (jev): typed answers with confidence — cheap, fast and deterministic-ish.
      const analysis = await systemOne(
        input.state ?? JSON.stringify(input.profile ?? {}),
        {
          goal: {
            type: 'choice',
            instructions: 'هدف اصلی ورزشی کاربر را انتخاب کن.',
            criteria: { fat_loss: 'کاهش وزن/چربی', muscle_gain: 'افزایش عضله', endurance: 'استقامت و آمادگی', general: 'تناسب عمومی' },
          },
          readiness: {
            type: 'score',
            instructions: 'آمادگی کاربر برای شروع برنامه‌ی جدید را برآورد کن.',
            criteria: ['خیلی کم', 'کم', 'متوسط', 'خوب', 'عالی'],
          },
          needs_doctor: { type: 'noul', instructions: 'آیا با توجه به محدودیت‌ها نیاز به ارجاع به پزشک هست؟' },
        },
      );
      return { enabled: true, analysis, position: 'classify' };
    }

    const attempts: { model: string; ok: boolean; status?: number; reason?: string }[] = [];
    const system = input.profile
      ? `${BODYYAR_SYSTEM_PROMPT}\nپروفایل کاربر: ${JSON.stringify(input.profile)}`
      : BODYYAR_SYSTEM_PROMPT;
    const text = await aiChat(
      [{ role: 'system', content: system }, ...(input.messages ?? []).slice(-10)],
      { position: 'chat', temperature: 0.65 },
      attempts,
    );
    return { enabled: true, text, position: 'chat', attempts };
  },
  // `panels` documents which models serve each position (read by the admin AI card)
  panels: () => panelFor('chat'),
});
