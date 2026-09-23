import * as SecureStore from "expo-secure-store";

import type { StaffRole } from "@hey-food/shared-types";

const TOKEN_KEY = "hey_food_pos_session_token";
const META_KEY = "hey_food_pos_session_meta";

export interface PosSession {
  token: string;
  staffId: string;
  staffName: string;
  role: StaffRole;
  outletId: string;
  outletName: string;
}

/**
 * The current session, kept in memory and mirrored to SecureStore so a
 * restart within the 12-hour server-side TTL skips the login screen. Not a
 * React state itself — `App.tsx` owns the React state and subscribes here
 * (via `subscribeToSession`) so a session cleared from DEEP inside a fetch
 * call (an expired/revoked 401 — see api/http.ts) can still bounce the app
 * back to LoginScreen, not just an explicit user action.
 *
 * Deliberately does not check `expiresAt` client-side: no expiry is stored
 * locally at all. A restored-but-actually-expired session is instead caught
 * by the FIRST real request's 401 (http.ts reacts to that the same way),
 * which avoids clock-skew games for a cost of, at most, one failed request
 * shortly after restart.
 */
let current: PosSession | null = null;
const listeners = new Set<(session: PosSession | null) => void>();

export function getCurrentSession(): PosSession | null {
  return current;
}

/** Returns an unsubscribe function. */
export function subscribeToSession(listener: (session: PosSession | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  for (const listener of listeners) listener(current);
}

/** Called once at app startup. Best-effort: a SecureStore failure is treated as "no stored session". */
export async function loadStoredSession(): Promise<PosSession | null> {
  try {
    const [token, metaRaw] = await Promise.all([SecureStore.getItemAsync(TOKEN_KEY), SecureStore.getItemAsync(META_KEY)]);
    if (!token || !metaRaw) return null;
    current = { ...(JSON.parse(metaRaw) as Omit<PosSession, "token">), token };
    return current;
  } catch {
    return null;
  }
}

export async function saveSession(session: PosSession): Promise<void> {
  current = session;
  const { token, ...meta } = session;
  await Promise.all([SecureStore.setItemAsync(TOKEN_KEY, token), SecureStore.setItemAsync(META_KEY, JSON.stringify(meta))]);
  notify();
}

/** Clears both the in-memory and persisted session. Called on an explicit Logout AND automatically on a 401 (see api/http.ts). */
export async function clearSession(): Promise<void> {
  current = null;
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(META_KEY).catch(() => {}),
  ]);
  notify();
}
