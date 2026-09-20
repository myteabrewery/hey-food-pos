/**
 * Base URL of the Hey Food backend. Read only from server components
 * (menu/product pages fetch on the server), so it isn't exposed to the
 * browser and no CORS is involved yet — the scoped CORS allow-list arrives
 * with the first browser-originated call (guest checkout submit, a later
 * stage). Overridable for a real deployment; localhost:3000 is the
 * backend's dev port.
 */
export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

/**
 * Base URL the BROWSER uses to call the backend (guest order creation, pay,
 * order status). Unlike API_BASE_URL above this is inlined into the client
 * bundle, so it must be public-safe — it is just a URL. The backend's CORS
 * allow-list must contain this app's origin (backend env WEB_ORIGIN).
 */
export const PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";
