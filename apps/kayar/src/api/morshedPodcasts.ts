import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';

const show = z.object({ id: z.string(), title: z.string(), author: z.string(), image: z.string(), feed: z.string() });
const episode = z.object({ id: z.string(), title: z.string(), artist: z.string(), duration: z.number(), cat: z.string(), hue: z.number(), license: z.string(), audio: z.string(), image: z.string(), date: z.string() });

const fail = () => new ZiteError({ code: 'BAD_REQUEST', message: 'PODCAST_ERR', userFacingMessage: 'فعلاً به پادکست‌ها دسترسی نداریم؛ کمی بعد دوباره امتحان کن.' });
const tag = (s: string, t: string) => {
  const m = s.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i'))?.[1] ?? '';
  return m.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
};
const dur = (v: string) => { if (!v) return 0; const p = v.split(':').map(Number); return p.reduce((a, b) => a * 60 + (b || 0), 0); };

export default createEndpoint({
  description: 'Searches fitness podcasts and lists their episodes for Morshed',
  inputSchema: z.object({ q: z.string().optional(), feed: z.string().url().optional() }),
  outputSchema: z.object({ shows: z.array(show), episodes: z.array(episode) }),
  execute: async ({ input }) => {
    if (input.feed) {
      const res = await fetch(input.feed, { headers: { 'User-Agent': 'Kayar/1.0' } });
      if (!res.ok) throw fail();
      const xml = await res.text();
      const showImg = xml.match(/<itunes:image[^>]*href="([^"]+)"/i)?.[1] ?? '';
      const showTitle = tag(xml.split('<item')[0], 'title');
      const items = xml.split(/<item[\s>]/i).slice(1, 31);
      return {
        shows: [],
        episodes: items.map((it, i) => {
          const audio = it.match(/<enclosure[^>]*url="([^"]+)"/i)?.[1] ?? '';
          return { id: `p${(audio || String(i)).slice(-40)}`, title: tag(it, 'title'), artist: showTitle, duration: dur(tag(it, 'itunes:duration')), cat: 'پادکست', hue: (i * 47) % 360, license: 'Podcast', audio: audio.replace(/&amp;/g, '&'), image: it.match(/<itunes:image[^>]*href="([^"]+)"/i)?.[1] ?? showImg, date: tag(it, 'pubDate') };
        }).filter((e) => e.audio),
      };
    }
    const term = input.q?.trim() || 'fitness workout';
    const res = await fetch(`https://itunes.apple.com/search?media=podcast&limit=20&term=${encodeURIComponent(term)}`);
    if (!res.ok) throw fail();
    const data = (await res.json()) as { results?: { collectionId: number; collectionName: string; artistName: string; artworkUrl600?: string; artworkUrl100?: string; feedUrl?: string }[] };
    return {
      episodes: [],
      shows: (data.results ?? []).filter((r) => r.feedUrl).map((r) => ({ id: String(r.collectionId), title: r.collectionName, author: r.artistName, image: r.artworkUrl600 ?? r.artworkUrl100 ?? '', feed: r.feedUrl! })),
    };
  },
});
