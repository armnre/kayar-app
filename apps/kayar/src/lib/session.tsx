import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { authLogin, authMe, authLogout, type AuthMeOutputType } from 'zitejs/api';

export type Scope = 'app' | 'admin';
type Member = AuthMeOutputType['member'];
type State = { token: string | null; member: Member | null; permissions: string[]; loading: boolean };
type Ctx = State & {
  login: (username: string, password: string) => Promise<Member>;
  logout: (all?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  can: (p: string) => boolean;
};

// Token storage: Zite endpoints receive no cookies/headers we control, so the opaque session
// token lives in localStorage with its server-side expiry (see docs/DECISIONS.md). It is never
// put in a URL, and it is wiped on logout or when the server rejects it.
const KEY = (s: Scope) => `kayar.session.${s}`;
export function readToken(scope: Scope) {
  try {
    const raw = localStorage.getItem(KEY(scope));
    if (!raw) return null;
    const { token, expiresAt } = JSON.parse(raw) as { token: string; expiresAt: string };
    if (new Date(expiresAt).getTime() < Date.now()) { localStorage.removeItem(KEY(scope)); return null; }
    return token;
  } catch { return null; }
}
const clear = (scope: Scope) => localStorage.removeItem(KEY(scope));

export function errMsg(e: unknown) {
  const x = e as { userFacingMessage?: string; message?: string };
  return (x?.userFacingMessage || x?.message || 'خطایی رخ داد؛ دوباره تلاش کن.').replace(/^PASSWORD_CHANGE_REQUIRED:\s*/, '');
}
export const isPwChange = (e: unknown) => /PASSWORD_CHANGE_REQUIRED/.test(String((e as { message?: string })?.message) + String((e as { userFacingMessage?: string })?.userFacingMessage));

const contexts = { app: createContext<Ctx | null>(null), admin: createContext<Ctx | null>(null) };

export function SessionProvider({ scope, children }: { scope: Scope; children: ReactNode }) {
  const [s, setS] = useState<State>(() => ({ token: readToken(scope), member: null, permissions: [], loading: true }));
  const refresh = useCallback(async () => {
    const token = readToken(scope);
    if (!token) { setS({ token: null, member: null, permissions: [], loading: false }); return; }
    try {
      const r = await authMe({ token });
      setS({ token, member: r.member, permissions: r.permissions, loading: false });
    } catch {
      clear(scope);
      setS({ token: null, member: null, permissions: [], loading: false });
    }
  }, [scope]);
  useEffect(() => { void refresh(); }, [refresh]);

  const login = async (username: string, password: string) => {
    const old = readToken(scope);
    if (old) authLogout({ token: old }).catch(() => {});
    const r = await authLogin({ username, password, scope, userAgent: navigator.userAgent.slice(0, 300) });
    localStorage.setItem(KEY(scope), JSON.stringify({ token: r.token, expiresAt: r.expiresAt }));
    setS({ token: r.token, member: r.member, permissions: r.permissions, loading: false });
    return r.member;
  };
  const logout = async (all?: boolean) => {
    const token = readToken(scope);
    clear(scope);
    setS({ token: null, member: null, permissions: [], loading: false });
    if (token) await authLogout({ token, all }).catch(() => {});
  };
  const C = contexts[scope];
  return <C.Provider value={{ ...s, login, logout, refresh, can: (p) => s.permissions.includes(p) }}>{children}</C.Provider>;
}
export const useSession = (scope: Scope) => {
  const c = useContext(contexts[scope]);
  if (!c) throw new Error('SessionProvider missing');
  return c;
};
/** Admin helper: token is guaranteed inside the guarded admin shell. */
export const useAdmin = () => {
  const s = useSession('admin');
  return { ...s, token: s.token ?? '' };
};
