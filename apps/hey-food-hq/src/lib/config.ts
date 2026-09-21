/**
 * SERVER-ONLY configuration for the HQ app's calls to the backend.
 *
 * ############################################################################
 * HQ_ADMIN_KEY IS THE POWER TO CHANGE ANY PRICE FOR THE WHOLE BUSINESS.
 * ############################################################################
 * It is a TEMPORARY shared secret standing in for real HQ authentication, which
 * does not exist: this app has no login, so whoever can reach it can make it
 * use this key. It therefore lives ONLY in this server's environment
 * (`apps/hey-food-hq/.env.local`, gitignored), is NEVER exposed to the browser
 * (no `NEXT_PUBLIC_` prefix; every call that uses it happens in a server
 * component or server action), and this app must only ever run on localhost —
 * `pnpm dev` / `pnpm start` refuse to bind anywhere else without an explicit
 * unsafe override. See the CRITICAL banner at the top of
 * apps/hey-food-backend/README.md and docs/STATUS.md.
 */

/** Backend base URL. Server-side only (server components and actions), so no CORS is involved. */
export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

/**
 * Which business this HQ app manages. There is no session to derive it from, so
 * it is configuration; the server action layer applies it, the browser cannot
 * choose it.
 */
export const HQ_BUSINESS_ID = process.env.HQ_BUSINESS_ID ?? "biz_hey_food";

/** The admin key, or a thrown error if it is missing or this is somehow running in a browser. */
export function requireHqAdminKey(): string {
  if (typeof window !== "undefined") {
    throw new Error("HQ_ADMIN_KEY must never be read in the browser.");
  }
  const key = process.env.HQ_ADMIN_KEY?.trim();
  if (!key) {
    throw new Error("HQ_ADMIN_KEY is not set (apps/hey-food-hq/.env.local); the backend's /admin endpoints would refuse the request.");
  }
  return key;
}
