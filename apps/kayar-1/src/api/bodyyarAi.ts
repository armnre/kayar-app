import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { aiChat, aiConfigured, BODYYAR_SYSTEM_PROMPT } from '../server/ai';

export default createEndpoint({
  description: 'Generates a personal workout/nutrition plan or answers a coaching question with AI (when configured)',
  inputSchema: z.object({
    mode: z.enum(['status', 'plan', 'chat']),
    profile: z.object({
      goal: z.string(), level: z.string(), daysPerWeek: z.number(),
      equipment: z.string().optional(), limitations: z.string().optional(),
      age: z.number().optional(), weightKg: z.number().optional(), heightCm: z.number().optional(),
    }).optional(),
    messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).optional(),
  }),
  outputSchema: z.object({ enabled: z.boolean(), text: z.string().optional(), plan: z.any().optional() }),
  execute: async ({ input }) => {
    if (input.mode === 'status' || !aiConfigured()) return { enabled: aiConfigured() };
    if (input.mode === 'plan' && input.profile) {
      const raw = await aiChat([
        { role: 'system', content: BODYYAR_SYSTEM_PROMPT + '\nفقط JSON برگردان با کلیدهای title, days[{name, exercises[{name, sets, reps}]}], nutrition{calories, tips[]}.' },
        { role: 'user', content: JSON.stringify(input.profile) },
      ], { json: true });
      return { enabled: true, plan: JSON.parse(raw) };
    }
    const text = await aiChat([{ role: 'system', content: BODYYAR_SYSTEM_PROMPT }, ...(input.messages ?? []).slice(-12)]);
    return { enabled: true, text };
  },
});
