import { ZiteError } from 'zitejs/backend';
import { getSettings } from './settings';

/** Shape of a Jamendo v3.0 /tracks result (only the fields we use). */
type Raw = {
  id: string; name: string; duration: number; artist_name: string; album_name?: string; image?: string; album_image?: string;
  audio?: string; shareurl?: string; license_ccurl?: string;
};
export type JamTrack = { id: string; title: string; artist: string; album: string; duration: number; image: string; audio: string; shareUrl: string; licenseUrl: string; license: string };

const TTL = 5 * 60_000;
const cache = new Map<string, { at: number; data: { tracks: JamTrack[]; total: number } }>();
const inflight = new Map<string, Promise<{ tracks: JamTrack[]; total: number }>>();

const fail = (code: string, msg: string) => new ZiteError({ code: 'BAD_REQUEST', message: code, userFacingMessage: msg });

export const licenseLabel = (url?: string) => {
  const m = url?.match(/licenses\/([\w-]+)/)?.[1];
  return m ? `CC ${m.toUpperCase()}` : '';
};

/** Live Jamendo availability: admin switch on AND client id configured. Never throws. */
export async function jamendoStatus() {
  const s = await getSettings();
  if (!s.jamendoEnabled) return { available: false, reason: 'disabled' as const };
  if (!process.env.ZITE_JAMENDO_CLIENT_ID) return { available: false, reason: 'blocked' as const };
  return { available: true, reason: 'ok' as const };
}

const IMAGE_SIZES = [100, 200, 300, 400, 500, 600];
export type JamQuery = { search?: string; tags?: string; order?: 'popularity_month' | 'popularity_week' | 'releasedate_desc' | 'relevance'; offset?: number; limit?: number; ids?: string[]; imagesize?: number };

/**
 * Server-only Jamendo call (docs: https://developer.jamendo.com/v3.0/tracks).
 * - client id only from ZITE_JAMENDO_CLIENT_ID, never sent to the browser
 * - 5-minute in-memory cache per isolate + in-flight de-duplication
 * - tracks without a streamable `audio` URL are dropped
 */
export async function jamendoTracks(q: JamQuery): Promise<{ tracks: JamTrack[]; total: number }> {
  const clientId = process.env.ZITE_JAMENDO_CLIENT_ID;
  if (!clientId) throw fail('JAMENDO_BLOCKED', 'منبع Jamendo تنظیم نشده است.');
  const p = new URLSearchParams({
    client_id: clientId, format: 'json', limit: String(Math.min(Math.max(q.limit ?? 24, 1), 50)), offset: String(Math.max(q.offset ?? 0, 0)),
    audioformat: 'mp32', include: 'licenses', imagesize: String(IMAGE_SIZES.includes(q.imagesize ?? 0) ? q.imagesize : 300), fullcount: 'true',
  });
  if (q.ids?.length) p.set('id', q.ids.slice(0, 50).join('+'));
  else {
    if (q.search) p.set('search', q.search.slice(0, 80));
    if (q.tags) p.set('fuzzytags', q.tags.slice(0, 80));
    p.set('order', q.order ?? (q.search ? 'relevance' : 'popularity_month'));
  }
  const key = [...p.entries()].filter(([k]) => k !== 'client_id').map(([k, v]) => `${k}=${v}`).join('&');
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  if (inflight.has(key)) return inflight.get(key)!;

  const run = (async () => {
    let res: Response;
    try {
      res = await fetch(`https://api.jamendo.com/v3.0/tracks/?${p}`, { signal: AbortSignal.timeout(8000) });
    } catch (e) {
      console.error('jamendo network', e);
      throw fail('JAMENDO_DOWN', 'سرویس موزیک Jamendo در دسترس نیست؛ کمی بعد دوباره تلاش کن.');
    }
    if (res.status === 429) throw fail('JAMENDO_RATE', 'درخواست‌ها به Jamendo زیاد شده؛ یک دقیقه بعد دوباره تلاش کن.');
    if (!res.ok) { console.error('jamendo http', res.status); throw fail('JAMENDO_DOWN', 'سرویس موزیک Jamendo پاسخ نداد؛ دوباره تلاش کن.'); }
    const data = (await res.json()) as { headers?: { status?: string; code?: number; error_message?: string; results_fullcount?: number }; results?: Raw[] };
    if (data.headers?.status !== 'success') {
      console.error('jamendo api', data.headers?.code, data.headers?.error_message);
      if (data.headers?.code === 5) throw fail('JAMENDO_BLOCKED', 'کلید Jamendo معتبر نیست؛ مدیر باید آن را بررسی کند.');
      throw fail('JAMENDO_ERR', 'Jamendo خطا برگرداند؛ دوباره تلاش کن.');
    }
    const tracks = (data.results ?? [])
      .filter((r) => r.id && r.name && typeof r.audio === 'string' && r.audio.startsWith('https://'))
      .map((r) => ({
        id: String(r.id), title: r.name, artist: r.artist_name ?? '', album: r.album_name ?? '', duration: Number(r.duration) || 0,
        image: (r.image || r.album_image || '').startsWith('https://') ? (r.image || r.album_image)! : '', audio: r.audio!,
        shareUrl: r.shareurl ?? '', licenseUrl: r.license_ccurl ?? '', license: licenseLabel(r.license_ccurl),
      }));
    const out = { tracks, total: Number(data.headers?.results_fullcount ?? tracks.length) };
    cache.set(key, { at: Date.now(), data: out });
    if (cache.size > 300) cache.delete(cache.keys().next().value as string);
    return out;
  })();
  inflight.set(key, run);
  try { return await run; } finally { inflight.delete(key); }
}
