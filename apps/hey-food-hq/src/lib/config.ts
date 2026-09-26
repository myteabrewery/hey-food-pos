/**
 * SERVER-ONLY configuration for the HQ app's calls to the backend.
 *
 * Real HQ authentication (`POST /auth/hq/login`, see `lib/session.ts`) has
 * replaced the `HQ_ADMIN_KEY` shared-secret stand-in outright — there is no
 * key here anymore. `businessId` below is still configuration rather than
 * session-derived, but ONLY because a login form has no session yet to read
 * it from; every call after login gets `businessId` from the session itself,
 * never from this constant.
 */

/** Backend base URL. Server-side only (server components and actions), so no CORS is involved. */
export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

/**
 * Which business this HQ app manages. There is no session before login, so
 * the login form (the only place this is still used) applies it; the
 * browser cannot choose it.
 */
export const HQ_BUSINESS_ID = process.env.HQ_BUSINESS_ID ?? "biz_hey_food";
