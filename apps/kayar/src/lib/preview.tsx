import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { tracks as sample, type Track } from '../data/sample';

// Real audio player for Morshed (Jamendo / uploaded tracks). Tracks without `audio` fall back to a simulated timer.
type Ctx = {
  track: Track | null; playing: boolean; progress: number; real: boolean;
  play: (t: Track, queue?: Track[]) => void; toggle: () => void; next: (dir?: 1 | -1) => void; stop: () => void; setProgress: (n: number) => void;
  fullPlayer: boolean; setFullPlayer: (v: boolean) => void;
  favs: Set<string>; toggleFav: (id: string) => void;
};
const C = createContext<Ctx | null>(null);
const FAV = 'kayar.favs';

export function PreviewProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>(sample);
  const [playing, setPlaying] = useState(false);
  const [progress, setProg] = useState(0);
  const [fullPlayer, setFullPlayer] = useState(false);
  const [favs, setFavs] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem(FAV) || '[]')); } catch { return new Set(); } });
  useEffect(() => { localStorage.setItem(FAV, JSON.stringify([...favs])); }, [favs]);

  const nextRef = useRef<() => void>(() => {});
  useEffect(() => {
    const a = new Audio(); a.preload = 'auto'; audio.current = a;
    a.ontimeupdate = () => setProg(a.currentTime);
    a.onended = () => nextRef.current();
    a.onerror = () => { if (a.src) { setPlaying(false); toast.error('پخش این آهنگ ممکن نشد؛ آهنگ بعدی رو امتحان کن.'); } };
    return () => { a.pause(); a.src = ''; };
  }, []);

  const play = (t: Track, q?: Track[]) => {
    if (q?.length) setQueue(q);
    setTrack(t); setProg(0); setPlaying(true);
    const a = audio.current; if (!a) return;
    if (t.audio) { a.src = t.audio; a.play().catch(() => setPlaying(false)); } else { a.pause(); a.removeAttribute('src'); }
  };
  const next = (dir: 1 | -1 = 1) => { const i = queue.findIndex((t) => t.id === track?.id); play(queue[(i + dir + queue.length) % queue.length]); };
  nextRef.current = () => next(1);
  const toggle = () => {
    const a = audio.current;
    if (track?.audio && a) { if (playing) a.pause(); else a.play().catch(() => {}); }
    setPlaying((p) => !p);
  };
  const setProgress = (n: number) => { setProg(n); if (track?.audio && audio.current) audio.current.currentTime = n; };
  const stop = () => { const a = audio.current; if (a) { a.pause(); a.removeAttribute('src'); } setPlaying(false); setTrack(null); setProg(0); setFullPlayer(false); };
  const toggleFav = (id: string) => setFavs((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return <C.Provider value={{ track, playing, progress, real: !!track?.audio, play, toggle, next, stop, setProgress, fullPlayer, setFullPlayer, favs, toggleFav }}>{children}</C.Provider>;
}
export const usePreview = () => useContext(C)!;
