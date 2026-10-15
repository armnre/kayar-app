/**
 * Minimal stand-in for the platform's `zitejs/auth` module.
 *
 * The upstream app authenticates members through its own `src/api/auth*` endpoints
 * (username/password + opaque session tokens), so only the tiny surface that
 * `@/ui/lib/legacyAuth.ts` re-exports is needed here.
 */

export type ZiteUser = {
  id: string;
  email?: string;
  displayName?: string;
};

export function useZiteUser(): ZiteUser | null {
  return null;
}

export function signOut(): Promise<void> {
  return Promise.resolve();
}
