import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { appLibrary } from '@/zite/api';
import { type Track } from '../data/sample';
import { useSession } from './session';

/**
 * The single global Morshed player. One <audio> element for the whole app, one source of truth
 * for queue / position / buffering. Survives route changes because it lives above the router.
 */
type Ctx = {
  track: Track | null; queue: Track[]; playing: boolean; progress: number; duration: number; buffering: boolean; error: boolean; real: boolean;
  volume: number; setVolume: (v: number) => void;
  play: (t: Track, queue?: Track[]) => void; toggle: () => void; next: (dir?: 1 | -1) => void; stop: () => void; setProgress: (n: number) => void; retry: () => void;
  fullPlayer: boolean; setFullPlayer: (v: boolean) => void;
  favs: Set<string>; toggleFav: (id: string) => void;
  sleepAt: number | null; setSleep: (minutes: number | null) => void;
};
const C = createContext<Ctx | null>(null);
const SAVE_EVERY = 15_000;

export function PreviewProvider({ children }: { children: ReactNode }) {
  const { token } = useSession('app');
  const tokenRef = useRef(token); tokenRef.current = token;
  const audio = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const trackRef = useRef<Track | null>(null); trackRef.current = track;
  const [queue, setQueue] = useState<Track[]>([]);
  const [playing, setPlaying] = useState(false);
  const [progress, setProg] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState(false);
  const [volume, setVol] = useState(() => Number(localStorage.getItem('kayar.volume') ?? 1));
  const [fullPlayer, setFullPlayer] = useState(false);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [sleepAt, setSleepAt] = useState<number | null>(null);
  const lastSave = useRef(0);

  const save = useCallback((completed = false) => {
    const t = trackRef.current; const a = audio.current; const tk = tokenRef.current;
    if (!t || !a || !tk || !t.id.includes(':')) return;
    lastSave.current = Date.now();
    appLibrary({ token: tk, action: 'progress', key: t.id, position: Math.floor(a.currentTime), completed }).catch(() => {});
  }, []);

  const nextRef = useRef<() => void>(() => {});
  useEffect(() => {
    const a = new Audio(); a.preload = 'auto'; audio.current = a;
    a.ontimeupdate = () => { setProg(a.currentTime); if (!a.paused && Date.now() - lastSave.current > SAVE_EVERY) save(); };
    a.ondurationchange = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0);
    a.onwaiting = () => setBuffering(true);
    a.onplaying = () => { setBuffering(false); setPlaying(true); };
    a.oncanplay = () => setBuffering(false);
    a.onpause = () => { setPlaying(false); save(); };
    a.onended = () => { save(true); nextRef.current(); };
    a.onerror = () => { if (a.getAttribute('src')) { setPlaying(false); setBuffering(false); setError(true); } };
    return () => { a.pause(); a.removeAttribute('src'); };
  }, [save]);
  useEffect(() => { if (audio.current) audio.current.volume = volume; localStorage.setItem('kayar.volume', String(volume)); }, [volume]);

  const stop = useCallback(() => {
    const a = audio.current; if (a) { a.pause(); a.removeAttribute('src'); a.load(); }
    setPlaying(false); setTrack(null); setProg(0); setDuration(0); setFullPlayer(false); setError(false); setSleepAt(null);
  }, []);

  // Security: when the member signs out, stop playback and forget personal data.
  useEffect(() => {
    if (!token) { stop(); setFavs(new Set()); return; }
    appLibrary({ token, action: 'favKeys' }).then((r) => setFavs(new Set(r.favKeys))).catch(() => {});
  }, [token, stop]);

  const load = (t: Track, resume: boolean) => {
    const a = audio.current; if (!a) return;
    setError(false); setProg(0); setDuration(t.duration || 0);
    if (!t.audio) { setError(true); return; }
    a.src = t.audio; setBuffering(true);
    a.play().catch(() => { setPlaying(false); setBuffering(false); });
    const tk = tokenRef.current;
    if (resume && tk && t.id.includes(':')) appLibrary({ token: tk, action: 'resume', key: t.id }).then((r) => {
      if (trackRef.current?.id === t.id && r.position > 5 && (!t.duration || r.position < t.duration - 10) && a.currentTime < 3) { a.currentTime = r.position; toast(`ادامه از جایی که مونده بودی`); }
    }).catch(() => {});
  };
  const play = (t: Track, q?: Track[]) => {
    if (track && track.id !== t.id) save();
    if (q?.length) setQueue(q.filter((x) => x.audio)); else if (!queue.some((x) => x.id === t.id)) setQueue([t]);
    setTrack(t); load(t, true);
  };
  const next = (dir: 1 | -1 = 1) => {
    const list = queue.length ? queue : track ? [track] : [];
    if (!list.length) return;
    if (dir === -1 && audio.current && audio.current.currentTime > 5) { audio.current.currentTime = 0; return; }
    const i = list.findIndex((t) => t.id === track?.id);
    const n = list[(i + dir + list.length) % list.length];
    if (n.id === track?.id && dir === 1 && list.length === 1) { audio.current?.pause(); return; }
    play(n);
  };
  nextRef.current = () => next(1);
  const toggle = () => { const a = audio.current; if (!a || !track) return; if (error) { retry(); return; } if (a.paused) a.play().catch(() => setError(true)); else a.pause(); };
  const retry = () => { if (track) { const pos = audio.current?.currentTime ?? 0; load(track, false); if (pos && audio.current) audio.current.currentTime = pos; } };
  const setProgress = (n: number) => { setProg(n); if (audio.current && track?.audio) audio.current.currentTime = n; };
  const toggleFav = (id: string) => {
    const tk = tokenRef.current;
    if (!tk) { toast('برای ذخیره‌ی علاقه‌مندی وارد شو.'); return; }
    setFavs((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    appLibrary({ token: tk, action: 'toggleFav', key: id }).catch(() => {
      setFavs((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
      toast.error('ذخیره‌ی علاقه‌مندی انجام نشد؛ دوباره تلاش کن.');
    });
  };

  // Sleep timer
  useEffect(() => {
    if (!sleepAt) return;
    const t = setTimeout(() => { audio.current?.pause(); setSleepAt(null); toast('تایمر خواب: پخش متوقف شد'); }, Math.max(0, sleepAt - Date.now()));
    return () => clearTimeout(t);
  }, [sleepAt]);
  const setSleep = (m: number | null) => { setSleepAt(m ? Date.now() + m * 60_000 : null); if (m) toast(`پخش ${m} دقیقه‌ی دیگر متوقف می‌شود`); };

  // Media Session API (lock screen / headset controls) where supported
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    if (!track) { ms.metadata = null; return; }
    ms.metadata = new MediaMetadata({ title: track.title, artist: track.artist, album: track.album || 'کایار · مرشد', artwork: track.image ? [{ src: track.image, sizes: '300x300', type: 'image/jpeg' }] : [] });
    const h: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => audio.current?.play()], ['pause', () => audio.current?.pause()],
      ['previoustrack', () => next(-1)], ['nexttrack', () => nextRef.current()],
      ['seekto', (d) => { if (audio.current && d.seekTime != null) audio.current.currentTime = d.seekTime; }],
    ];
    for (const [k, fn] of h) { try { ms.setActionHandler(k, fn); } catch { /* unsupported action */ } }
  }); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'; }, [playing]);

  return <C.Provider value={{ track, queue, playing, progress, duration: duration || track?.duration || 0, buffering, error, real: !!track?.audio, volume, setVolume: setVol, play, toggle, next, stop, setProgress, retry, fullPlayer, setFullPlayer, favs, toggleFav, sleepAt, setSleep }}>{children}</C.Provider>;
}
export const usePreview = () => useContext(C)!;
