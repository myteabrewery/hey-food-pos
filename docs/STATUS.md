# Hey Food — Build Status

Living document, updated after each milestone lands. Last updated: this session.

---

## Foundation (packages/)

| Package | Status |
|---|---|
| shared-types | ✅ Done — all entities, OrderStatus, StatusMeta |
| design-tokens | ✅ Done — v2 palette (navy/teal/yellow/cream), typography, spacing, radius. `OUTLET_HEALTH_COLORS` (`good`/`warning`/`critical`) added for HQ Admin's outlet-health indicator, documented in docs/hey-food-design-system-v1.md Section 2 alongside `ORDER_STATUS_META` — see HQ Admin section below for why `warning` needed a genuinely new color, not a reuse of brand `yellow`. |
| api-client | ✅ Done — zod schemas for all dev spec endpoints except GET /admin/reports (deferred) |
| eslint-config | ✅ Done — base + react-native + next configs |
| tsconfig | ✅ Done (scaffolding) |

## Backend (apps/hey-food-backend)

| Piece | Status |
|---|---|
| Database (Postgres + Prisma schema + migration + seed) | ✅ Done |
| GET /outlets/nearby | ✅ Done, verified against real seeded data |
| GET /outlets/:id (resolved menu) | ✅ Done, verified against real seeded data |
| `ProductModifierOption.imageUrl` (nullable) | ✅ Done — shared-types/api-client/Prisma migration (additive, no backfill) all updated, `outlets.service.ts` wired through, seed-soup-stall.ts seeded with `null` for every option. Now consumed by the Customer App's ingredient photo grid (see below) — falls back to a lettered placeholder tile until real photos are added by editing the seed data. |
| Auth (OTP request/verify) | 🔲 Not started — next up |
| POST /orders (order creation) | 🔲 Not started — blocked on auth |
| PATCH /pos/orders/:id/status | 🔲 Not started |
| Billplz payment integration | 🔲 Not started |
| GET /admin/reports | 🔲 Deferred — needs its own design pass |
| Known runtime caveat | ts-node runtime is a confirmed **stopgap**, not a production decision — see backend README |

## Customer App (apps/hey-food-customer)

| Screen/Feature | Status |
|---|---|
| Home (composite: hero, categories, outlet card, menu preview, order-progress) | ✅ Done, real data wired |
| Menu (item list, sold-out treatment) | ✅ Done, real data wired |
| Product Detail (customization/add-ons) | ✅ V1 (docs/product-customization-v1.md) all 3 stages done, tested on-device against real seeded Chicken Rice data. Superseded mid-flight by V2 (docs/product-customization-v2.md: `required` → `minSelections`/`maxSelections`, per-option `quantityEnabled`/`quantity`) — V2 Stage 1 (shared-types/api-client schemas) and Stage 2 (Prisma migration, rewritten validateSelectedModifiers, two named seed profiles — placeholder + the real soup-stall menu) done and verified. ✅ Stage 3.5 (rebuilding ModifierGroupSelector/ProductDetailScreen/CartSheetScreen against V2's real shape — real minSelections/maxSelections status text, quantity steppers on `quantityEnabled` options, per-option quantity flowing through to the cart) done and verified on-device against the real soup-stall seed data (DIY Soup Bowl: blocked at 1 ingredient, unlocked at 2 distinct ingredients, stepper live-updates price, cart shows correct quantity/price). |
| Known gap — Stage 3.5 max-reached blocking | A "multiple" group's cap-reached blocking (disabling unselected options once `maxSelections` is hit) is implemented per spec but **not on-device-verified** — no current seed data (placeholder or soup-stall) has a capped multiple-select group (`maxSelections: null` everywhere multiple selection is used). Verify this path once such data exists. |
| Ingredient photo grid | ✅ Done — `ModifierGroupSelector`'s Ingredients section (any `multiple` group whose options are `quantityEnabled`) now renders as a 2-column tap-to-select photo grid instead of the plain list: photo/first-letter-fallback, teal border + checkmark badge + quantity stepper when selected, "+ Add" button otherwise. Soup Base/Carb Base (single-select) unaffected. Verified on-device against soup-stall data (all placeholder-lettered, no real `imageUrl`s yet) — underlying min/max/quantity validation unchanged and still correct through the new interaction. |
| Cart (bottom sheet) | ✅ UI done — "Continue to payment" still a stub (logs, doesn't submit) |
| Checkout/Payment | 🔲 Not started — blocked on auth + order creation |
| Order Status (detail view) | 🔲 Not started — Home's inline card uses mock data |
| Login/OTP screens | 🔲 Not started — blocked on backend auth |
| Order history | 🔲 Not started |
| Rewards (loyalty/redemption) | 🔲 Spec'd (docs/loyalty-rewards-v1.md). Stage 1 (shared-types/api-client schemas — LoyaltyTransaction, RewardOffer, RewardRedemption) done and verified. Stage 2 (Prisma migration, point-earning trigger on order completion, /rewards/offers + /customers/me/loyalty endpoints, seed offers) and Stage 3 (Rewards tab screen) not started. |
| Account | 🔲 Stub placeholder only |

## Outlet POS (apps/hey-food-pos)

| Screen/Feature | Status |
|---|---|
| Login | ✅ **Stub only** — one button, no PIN pad, no device-outlet-binding check. docs/hey-food-developer-spec-v1.md Section 5.5 describes real login as PIN-based with the device pre-bound to its outlet at setup; neither exists yet. Placeholder is flagged both in code comments and with an on-screen caption ("Demo login — real staff PIN auth not yet built") — the one stub this session where surfacing the placeholder on-screen, not just in source, felt warranted. |
| Order Queue (docs/hey-food-developer-spec-v1.md Section 5.1) | ✅ First real screen built — three columns (New/Preparing/Ready) mapped to `received`/`preparing`/`ready` OrderStatus values, order cards (ID, item count, timestamp, status badge, stage-appropriate action button per docs/hey-food-design-system-v1.md Section 6), tapping Start/Ready/Collect transitions the order through `PosOrderStatus` locally. Verified on-device (phone, not a tablet — see limitation below). **Stub data**: mock/orders.ts, no live order feed — `POST /orders` doesn't exist yet (blocked on auth), so there's nothing real to subscribe to. Section 5.1's real-time (websocket/poll) update mechanism, mandatory new-order sound+visual alert, and offline action-queueing are all out of scope — explicitly not simulated, not just deferred silently. |
| Known limitation — phone testing | Tested on the same phone used throughout this session, not a real Android tablet. Columns are sized (`min 300px` each) to fit three side-by-side on a typical tablet in landscape with no scrolling; on the phone only about one column is visible at a time and the queue must be scrolled horizontally. Noted as a reasonable stand-in per explicit instruction, not fixed — real tablet testing is future work. |
| Menu Availability (docs/hey-food-developer-spec-v1.md Section 5.3) | ✅ Built — list of outlet products, each with a single toggle button whose label/color IS the current state ("AVAILABLE" teal / "SOLD OUT" ink), tap flips it. No price-editing affordance at all, by design — Section 5.3 is explicit that staff can only ever touch availability, never price, even though the underlying `OutletProductOverride` type also carries `priceOverride`. **Stub data**: mock/products.ts (one override row per product; Fried Chicken starts sold out, matching seed-placeholder.ts's own starting state) — no `PATCH /pos/outlets/:id/products/:productId/availability` endpoint exists on the backend yet. Verified on-device: toggle flips state and survives navigating to Queue/Summary and back. |
| Daily Summary (docs/hey-food-developer-spec-v1.md Section 5.4) | ✅ Built — 4 stat tiles (sales today, orders, avg prep time, cancelled) + a "Top selling today" list. **Fully static placeholder numbers**, flagged with an on-screen "PLACEHOLDER DATA" banner (same reasoning as Login's visible stub caption — these look like authoritative business metrics, and staff glancing at the screen has no other way to tell they're fake). Section 5.4 requires these aggregates be computed server-side so POS and HQ never disagree on the same number; no such aggregation endpoint exists yet, so unlike Queue/Menu Availability's mock data, there's no real shared-types/api-client shape this validates against either — nothing to validate against yet. |
| Order Detail | 🔲 Not started |
| Navigation (Queue/Menu/Summary) | ✅ Top bar with 3 large nav buttons, always visible on all three screens — judgment call over a menu icon/drawer, since POS's whole ethos is "minimal decoration, large touch targets" and hiding 3 destinations behind an extra tap has no real benefit here. Queue's `orders` and Menu Availability's `overrides` are both owned by a new `PosShell` component (lifted out of each screen) specifically so switching screens doesn't reset either one's state. |
| Follow-up backend dependency | Two endpoints from dev spec Section 5 don't exist yet and are what would replace these screens' mock data: `PATCH /pos/outlets/:id/products/:productId/availability` (Menu Availability) and a server-side daily-aggregates endpoint (Daily Summary, Section 5.4). |

## HQ Admin (apps/hey-food-hq)

| Screen/Feature | Status |
|---|---|
| Login | ✅ **Stub only** — no real HQ Admin auth exists yet (blueprint Section 6 lists role-based login as screen 1 of 12; role-based-ness itself isn't built). A plain Next.js `<Link>` to /dashboard, no session created anywhere. Same visible on-screen caption treatment as Outlet POS's login ("Demo login — real HQ Admin auth not yet built"). |
| Dashboard (dev spec Section 9.1, blueprint Section 6) | ✅ First real screens built — today's aggregate stat cards (sales, orders, avg order value, % vs yesterday), an outlet performance list, and the 3-state outlet health indicator (good/warning/critical dots + label). Layout/content structure follows the blueprint mockup; **colors do not** — that mockup used the old Ember/Char palette, which no longer exists in design-tokens after the Customer App pivot, so every color here comes from the current design-tokens instead. **Stub data**: mock/dashboard.ts, using the 3 real seeded outlets (Paradigm Mall/KSL City/Mid Valley) with invented sales/orders/health numbers — no aggregation endpoint or scheduled health-computation job exists yet (Section 9.1 requires both). Flagged with an on-screen "PLACEHOLDER DATA" banner, same reasoning as POS's Daily Summary. Verified in a real browser (Chrome via `pnpm dev`), not just by reading the code. |
| New design-tokens: `OUTLET_HEALTH_COLORS` | ✅ Added and documented in docs/hey-food-design-system-v1.md Section 2, same treatment as `ORDER_STATUS_META`'s own table — **a genuine proposal, not a values lookup**. No 3-state status-color system existed for outlet health before this. `good` reuses `BRAND_COLORS.teal`. `warning` (`#D97706`) is a **brand-new color, deliberately not** `BRAND_COLORS.yellow` (`#F5C451`) — yellow is reserved for the single highest-emphasis CTA per screen, so reusing it for a status dot would be a real conflict, not just a style note, and the two hexes are chosen to read as visually distinct at a glance. `critical` (`#DC2626`) is also brand-new — no red exists anywhere else in the palette. Both `warning` and `critical` are proposed values, flagged for designer confirmation before being treated as final. |
| Navigation shell | ✅ Left sidebar, not POS's top-button-row — chosen because HQ will eventually have ~12 top-level screens (blueprint Section 6) vs. POS's 3, and a button row doesn't scale past a handful before wrapping/crowding. Sidebar lists the full 12-screen set from the blueprint; only Dashboard is a real link today, the rest render as disabled "soon" rows so the shell visibly demonstrates it scales without needing 10 fake screens built to prove it. |
| Outlet Detail, Menu Management, Orders, Staff, Customers, Payments, Reports, Settings | 🔲 Not started |

## Known environment quirks (for future reference)

- This machine runs **Windows on ARM** — Prisma has no native ARM64 query engine. Backend requires x64 Node via a wrapper script (`scripts/with-x64-node.mjs`) — documented in the backend README.
- Native device testing requires **USB + `adb reverse`** (WiFi/hotspot connections were unreliable on this network — likely router/carrier client isolation). Ports needed: 8081 (Metro), 3000 (backend).
- Project is on **Expo SDK 51** (current latest is SDK 57 as of this session) — a real gap, not deliberately chosen. Upgrade deferred intentionally until the app is further along, to avoid compounding two hard problems at once.
- Web preview (`expo start --web`) is broken by a Windows + pnpm-workspace-specific Metro bug (malformed backslash path) — deferred, not fixed. Native (device) testing is unaffected.
- Every pushed stack route (Product Detail today; future ones like Checkout/Payment/Order Status) sits outside `TabScreenShell`'s subtree and needs its own `useSafeAreaInsets()` top-inset handling — missing it means the header renders under the status bar (a real bug caught on-device while building Product Detail). Deliberately not centralized into a shared wrapper yet — see the comment in `app/_layout.tsx` for why. Don't forget this on the next pushed screen.
- **Inter font is never actually loaded** — confirmed during Stage 3.5, not just a dev-time LogBox nuisance. `FONT_FAMILY = "Inter"` (design-tokens) is applied via `fontFamily: FONT_FAMILY` everywhere, but no app calls `useFonts`/`Font.loadAsync`, no `@expo-google-fonts/*` package is installed, `expo-font` only appears transitively (via `@expo/vector-icons`, for icon glyphs, not text), and no `.ttf` asset exists anywhere in the repo. Every screen in every app has been silently rendering in the platform default system font this whole time. Real design-system gap — needs its own follow-up task to actually load Inter, not folded into this pass.
