import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';

const cats: Record<string, string> = { 'شروع قدرتی': 'rock+electronic', 'کاردیو': 'electronic+dance', 'ریکاوری': 'ambient+chillout', 'تمرکز': 'lounge+ambient', 'انرژی': 'hiphop+electronic' };

const track = z.object({ id: z.string(), title: z.string(), artist: z.string(), duration: z.number(), cat: z.string(), hue: z.number(), license: z.string(), audio: z.string(), image: z.string() });

export default createEndpoint({
  description: 'Fetches royalty-free workout music from Jamendo for Morshed',
  inputSchema: z.object({ cat: z.string().optional(), q: z.string().optional(), limit: z.number().optional() }),
  outputSchema: z.object({ tracks: z.array(track) }),
  execute: async ({ input }) => {
    const cat = input.cat && cats[input.cat] ? input.cat : 'انرژی';
    const p = new URLSearchParams({
      client_id: process.env.ZITE_JAMENDO_CLIENT_ID, format: 'json', limit: String(Math.min(input.limit ?? 24, 50)),
      audioformat: 'mp32', include: 'licenses', order: 'popularity_month', imagesize: '300',
    });
    if (input.q?.trim()) p.set('search', input.q.trim()); else p.set('fuzzytags', cats[cat]);
    const res = await fetch(`https://api.jamendo.com/v3.0/tracks/?${p}`);
    if (!res.ok) throw new ZiteError({ code: 'BAD_REQUEST', message: `JAMENDO_${res.status}`, userFacingMessage: 'فعلاً به کتابخانه‌ی موزیک دسترسی نداریم؛ کمی بعد دوباره امتحان کن.' });
    const data = (await res.json()) as { headers?: { status?: string; error_message?: string }; results?: { id: string; name: string; artist_name: string; duration: number; audio: string; image: string; license_ccurl?: string }[] };
    if (data.headers?.status !== 'success') { console.error(data.headers); throw new ZiteError({ code: 'BAD_REQUEST', message: 'JAMENDO_ERR', userFacingMessage: 'کتابخانه‌ی موزیک پاسخ نداد؛ دوباره امتحان کن.' }); }
    return {
      tracks: (data.results ?? []).filter((r) => r.audio).map((r, i) => ({
        id: `j${r.id}`, title: r.name, artist: r.artist_name, duration: r.duration, cat, hue: (Number(r.id) * 37 + i * 11) % 360,
        license: (r.license_ccurl?.match(/licenses\/([\w-]+)/)?.[1] ?? 'cc').toUpperCase().replace(/^/, 'CC '), audio: r.audio, image: r.image,
      })),
    };
  },
});
