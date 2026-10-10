import { useEffect, useState } from 'react';
import { publicSettings, publicPosts, type PublicSettingsOutputType, type PublicPostsOutputType } from 'zitejs/api';

let settingsP: Promise<PublicSettingsOutputType> | null = null;
/** Public, non-sensitive site settings (cached for the page lifetime). Null while loading or on error. */
export function usePublicSettings() {
  const [s, setS] = useState<PublicSettingsOutputType | null>(null);
  useEffect(() => {
    settingsP ??= publicSettings({}).catch((e) => { settingsP = null; throw e; });
    settingsP.then(setS).catch(() => setS(null));
  }, []);
  return s;
}

export type PostCard = PublicPostsOutputType['posts'][0];
export function usePosts(args: { tag?: string; page?: number; pageSize?: number }) {
  const [d, setD] = useState<PublicPostsOutputType | null>(null); const [err, setErr] = useState(false); const [n, setN] = useState(0);
  const key = JSON.stringify(args);
  useEffect(() => {
    let on = true; setErr(false);
    publicPosts(args).then((r) => on && setD(r)).catch(() => on && setErr(true));
    return () => { on = false; };
  }, [key, n]); // eslint-disable-line react-hooks/exhaustive-deps
  return { d, err, retry: () => setN((x) => x + 1) };
}
