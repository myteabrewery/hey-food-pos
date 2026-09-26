import { cookies } from "next/headers";

import type { PublicStaffUser } from "@hey-food/api-client";

import { hqSession } from "./hq-auth-api";

/**
 * The httpOnly cookie holding the opaque HQ session token — the browser
 * edge's half of the same `StaffSession` mechanism POS uses (SecureStore on
 * device, this cookie in the browser). httpOnly so no client script can read
 * it; the token itself is meaningless without the backend, same as POS's.
 *
 * SERVER-ONLY: every export here touches `next/headers`, which throws if
 * imported into a Client Component. This module must only be imported from
 * Server Components, Server Actions, or Route Handlers.
 */
const COOKIE_NAME = "hq_session";

/** Mirrors HqAuthService's own SESSION_TTL_MS — the cookie simply expires around when the session would anyway. Not authoritative: getHqSession() re-validates the live session on every read regardless, the same "revoked takes effect immediately" property as every other use of StaffSessionGuard. */
const COOKIE_MAX_AGE_SECONDS = 12 * 60 * 60;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
}

export function getHqToken(): string | null {
  return cookies().get(COOKIE_NAME)?.value ?? null;
}

/** Server Action / Route Handler only — Next refuses cookie writes from a plain Server Component render. Called once, right after a successful `POST /auth/hq/login`. */
export function setHqSessionCookie(token: string): void {
  cookies().set(COOKIE_NAME, token, cookieOptions());
}

/** Server Action / Route Handler only, same restriction as above. */
export function clearHqSessionCookie(): void {
  cookies().delete(COOKIE_NAME);
}

/**
 * "Who is logged in", re-resolved from the httpOnly cookie against the live
 * `StaffSession` row on every call — never trusting a remembered login
 * response, so a revocation or deactivation is reflected the moment the next
 * page renders, not just on the next login attempt.
 *
 * NOT memoized per-request: React's `cache()` (which would dedupe this
 * across, e.g., the layout's gating check and a page that also wants the
 * current staff member) isn't available in this project's React 18.3.1 —
 * that's a React 19 / Next 15 feature. A page that also calls this pays one
 * extra backend round-trip beyond the layout's own call; correctness is
 * unaffected, and no page needs it today besides Dashboard.
 *
 * Null covers "no cookie" and "cookie no longer valid" identically — callers
 * that need to tell those apart don't exist today, and the backend's own
 * guard is the one source of truth for whether a session is still live.
 */
export async function getHqSession(): Promise<PublicStaffUser | null> {
  const token = getHqToken();
  if (!token) return null;
  try {
    return (await hqSession(token)).staff;
  } catch {
    return null;
  }
}
