// POS runtime configuration, from Expo's EXPO_PUBLIC_* environment variables
// (read from apps/hey-food-pos/.env at Metro start; see .env.example).

/**
 * Backend base URL. On a USB-connected phone this resolves through
 * `adb reverse tcp:3000 tcp:3000`; a real tablet would use the deployed URL.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

/**
 * Which business this POS app belongs to — mirrors the HQ app's own
 * `HQ_BUSINESS_ID` (apps/hey-food-hq/src/lib/config.ts): a POS app
 * deployment (the Expo bundle installed on a business's tablets) IS one
 * business's software, exactly like an HQ app deployment is. Supplied by the
 * app's own build configuration, never typed by a human — sent as
 * `businessId` on every `POST /auth/staff/login` call, because a PIN is only
 * unique WITHIN a business (packages/api-client/src/auth.ts).
 */
export const POS_BUSINESS_ID = process.env.EXPO_PUBLIC_POS_BUSINESS_ID ?? "biz_hey_food";

/**
 * Escape hatch: `EXPO_PUBLIC_POS_USE_MOCK_ORDERS=1` runs the POS on built-in
 * mock data with no backend — the queue on the mock orders (src/mock/orders.ts)
 * AND Menu Availability on the mock menu (src/mock/products.ts) — for demos and
 * offline UI work. (The name predates the menu; it now means "demo mode".)
 * Off by default — the POS reads real data. Mock mode also skips real login
 * (MOCK_STAFF, src/mock/session.ts, stands in for a session).
 */
export const USE_MOCK_ORDERS = process.env.EXPO_PUBLIC_POS_USE_MOCK_ORDERS === "1";

/** How often the queue re-fetches. Polling is Stage A; the spec prefers websockets. */
export const QUEUE_POLL_MS = 5_000;
