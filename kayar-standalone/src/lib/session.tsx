import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { authLogin, authMe, authLogout, type AuthMeOutputType } from '@/zite/api';

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

/** Turns any thrown error into a friendly Persian message — never shows raw technical text. */
export function errMsg(e: unknown) {
  const x = e as { userFacingMessage?: string; message?: string; status?: number };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'اینترنتت قطعه؛ اتصال رو چک کن و دوباره امتحان کن.';
  const raw = (x?.userFacingMessage || x?.message || '').replace(/^PASSWORD_CHANGE_REQUIRED:\s*/, '').trim();
  if (/failed to fetch|networkerror|load failed|network/i.test(raw)) return 'ارتباط با سرور برقرار نشد؛ چند لحظه بعد دوباره امتحان کن.';
  if (/timeout|timed out/i.test(raw)) return 'پاسخ سرور طول کشید؛ دوباره تلاش کن.';
  if (/429|too many|rate/i.test(raw)) return 'تعداد تلاش‌ها زیاد بود؛ کمی صبر کن و دوباره امتحان کن.';
  if (/401|unauthori[sz]ed|session|expired/i.test(raw) && !/[\u0600-\u06FF]/.test(raw)) return 'نشستت تموم شده؛ لطفاً دوباره وارد شو.';
  if (/403|forbidden/i.test(raw) && !/[\u0600-\u06FF]/.test(raw)) return 'اجازه‌ی انجام این کار رو نداری.';
  // Only show server text if it's already a human Persian message
  if (raw && /[\u0600-\u06FF]/.test(raw) && raw.length < 220) return raw;
  return 'یه مشکلی پیش اومد؛ دوباره تلاش کن. اگه تکرار شد با پشتیبانی تماس بگیر.';
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
