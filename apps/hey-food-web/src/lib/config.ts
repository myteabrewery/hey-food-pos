/**
 * Base URL of the Hey Food backend. Read only from server components
 * (menu/product pages fetch on the server), so it isn't exposed to the
 * browser and no CORS is involved yet — the scoped CORS allow-list arrives
 * with the first browser-originated call (guest checkout submit, a later
 * stage). Overridable for a real deployment; localhost:3000 is the
 * backend's dev port.
 */
export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";
