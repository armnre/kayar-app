import { z } from 'zod';
import { zite, type TracksRecordType } from 'zitejs/db';
import { jamendoTracks, jamendoStatus, licenseLabel, type JamTrack } from './jamendo';
import { splitTags } from './content';

/** Track as sent to the app. `id` is a stable key: "lib:<record id>" or "jam:<jamendo id>". */
export const trackDto = z.object({
  id: z.string(), title: z.string(), artist: z.string(), album: z.string(), duration: z.number(), cat: z.string(), hue: z.number(),
  license: z.string(), licenseUrl: z.string(), shareUrl: z.string(), rights: z.string(), audio: z.string(), image: z.string(),
  source: z.enum(['library', 'jamendo']), featured: z.boolean(),
});
export type TrackDto = z.infer<typeof trackDto>;

const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

export const libToDto = (r: TracksRecordType): TrackDto => ({
  id: `lib:${r.id}`, title: r.title ?? '', artist: r.artist ?? '', album: r.album ?? '', duration: r.durationSeconds ?? 0, cat: splitTags(r.categories)[0] ?? '',
  hue: hue(r.id), license: licenseLabel(r.licenseUrl) || (r.licenseUrl ? 'مجوز' : ''), licenseUrl: r.licenseUrl ?? '', shareUrl: r.shareUrl ?? '', rights: r.rights ?? '',
  audio: r.audioUrl ?? '', image: r.coverUrl ?? '', source: 'library', featured: !!r.isFeatured,
});
export const jamToDto = (t: JamTrack, cat = ''): TrackDto => ({
  id: `jam:${t.id}`, title: t.title, artist: t.artist, album: t.album, duration: t.duration, cat, hue: hue(t.id), license: t.license, licenseUrl: t.licenseUrl,
  shareUrl: t.shareUrl, rights: '', audio: t.audio, image: t.image, source: 'jamendo', featured: false,
});
export const playable = (r: TracksRecordType) => r.status === 'published' && !!r.audioUrl && r.audioUrl.startsWith('https://');

/** Resolves stored keys back to tracks. Missing / unpublished / unreachable ones map to null. */
export async function resolveKeys(keys: string[]): Promise<Map<string, TrackDto | null>> {
  const out = new Map<string, TrackDto | null>(keys.map((k) => [k, null]));
  const lib = keys.filter((k) => k.startsWith('lib:')).map((k) => k.slice(4));
  const jam = keys.filter((k) => k.startsWith('jam:')).map((k) => k.slice(4)).filter((x) => /^\d+$/.test(x));
  if (lib.length) {
    const { records } = await zite.tracks.findAll({ filters: { id: { in: lib } }, limit: 2000 });
    for (const r of records) if (playable(r)) out.set(`lib:${r.id}`, libToDto(r));
  }
  if (jam.length && (await jamendoStatus()).available) {
    try {
      for (let i = 0; i < jam.length; i += 50) {
        const { tracks } = await jamendoTracks({ ids: jam.slice(i, i + 50), limit: 50 });
        for (const t of tracks) out.set(`jam:${t.id}`, jamToDto(t));
      }
    } catch (e) { console.error('resolve jamendo', e); }
  }
  return out;
}
