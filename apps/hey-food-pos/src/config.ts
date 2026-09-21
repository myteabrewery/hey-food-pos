// POS runtime configuration, from Expo's EXPO_PUBLIC_* environment variables
// (read from apps/hey-food-pos/.env at Metro start; see .env.example).

/**
 * Backend base URL. On a USB-connected phone this resolves through
 * `adb reverse tcp:3000 tcp:3000`; a real tablet would use the deployed URL.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

/**
 * ############################################################################
 * TEMPORARY — MUST BE REPLACED BEFORE PRODUCTION.
 * ############################################################################
 * The shared secret the backend's POS endpoints expect as `X-Pos-Device-Key`
 * (backend env POS_DEVICE_KEY). This is a stand-in for the real staff-PIN +
 * outlet-bound-device login of dev spec Section 5.5, which isn't built.
 *
 * EXPO_PUBLIC_* values are compiled INTO the app bundle — this is not a
 * secret in any real sense: anyone with the app can read it, and it grants
 * access to every outlet's orders AND menu availability (it is not bound to
 * the tablet's own outlet). It only keeps casual traffic off the endpoints
 * during development. See the backend README's Pre-launch checklist.
 */
export const POS_DEVICE_KEY = process.env.EXPO_PUBLIC_POS_DEVICE_KEY ?? "";

/**
 * Escape hatch: `EXPO_PUBLIC_POS_USE_MOCK_ORDERS=1` runs the POS on built-in
 * mock data with no backend — the queue on the mock orders (src/mock/orders.ts)
 * AND Menu Availability on the mock menu (src/mock/products.ts) — for demos and
 * offline UI work. (The name predates the menu; it now means "demo mode".)
 * Off by default — the POS reads real data.
 */
export const USE_MOCK_ORDERS = process.env.EXPO_PUBLIC_POS_USE_MOCK_ORDERS === "1";

/** How often the queue re-fetches. Polling is Stage A; the spec prefers websockets. */
export const QUEUE_POLL_MS = 5_000;
