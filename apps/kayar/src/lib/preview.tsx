import { createContext, useContext, useState, type ReactNode } from 'react';
import { tracks, type Track } from '../data/sample';

// Player state only. Morshed still uses the labelled sample tracks until the real library/Jamendo
// wiring lands (see docs/progress.md). Auth/session lives in ./session.tsx.
type Ctx = {
  track: Track | null; playing: boolean; progress: number;
  play: (t: Track) => void; toggle: () => void; next: (dir?: 1 | -1) => void; setProgress: (n: number) => void;
  fullPlayer: boolean; setFullPlayer: (v: boolean) => void;
  favs: Set<string>; toggleFav: (id: string) => void;
};
const C = createContext<Ctx | null>(null);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fullPlayer, setFullPlayer] = useState(false);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const play = (t: Track) => { setTrack(t); setPlaying(true); setProgress(0); };
  const next = (dir: 1 | -1 = 1) => { const i = tracks.findIndex((t) => t.id === track?.id); play(tracks[(i + dir + tracks.length) % tracks.length]); };
  const toggleFav = (id: string) => setFavs((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return <C.Provider value={{ track, playing, progress, play, toggle: () => setPlaying((p) => !p), next, setProgress, fullPlayer, setFullPlayer, favs, toggleFav }}>{children}</C.Provider>;
}
export const usePreview = () => useContext(C)!;
