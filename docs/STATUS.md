# Hey Food — Build Status

Living document, updated after each milestone lands. Last updated: this session.

---

## Foundation (packages/)

| Package | Status |
|---|---|
| shared-types | ✅ Done — all entities, OrderStatus, StatusMeta |
| design-tokens | ✅ Done — v2 palette (navy/teal/yellow/cream), typography, spacing, radius |
| api-client | ✅ Done — zod schemas for all dev spec endpoints except GET /admin/reports (deferred) |
| eslint-config | ✅ Done — base + react-native + next configs |
| tsconfig | ✅ Done (scaffolding) |

## Backend (apps/hey-food-backend)

| Piece | Status |
|---|---|
| Database (Postgres + Prisma schema + migration + seed) | ✅ Done |
| GET /outlets/nearby | ✅ Done, verified against real seeded data |
| GET /outlets/:id (resolved menu) | ✅ Done, verified against real seeded data |
| `ProductModifierOption.imageUrl` (nullable) | ✅ Schema done — shared-types/api-client/Prisma migration (additive, no backfill) all updated, `outlets.service.ts` wired through, seed-soup-stall.ts seeded with `null` for every option (no real photos exist yet). 🔲 Not yet consumed by any UI — that's the next screen-rebuild step. |
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

Entirely untouched since initial scaffolding — no real screens built yet.

## HQ Admin (apps/hey-food-hq)

Entirely untouched since initial scaffolding — no real screens built yet.

## Known environment quirks (for future reference)

- This machine runs **Windows on ARM** — Prisma has no native ARM64 query engine. Backend requires x64 Node via a wrapper script (`scripts/with-x64-node.mjs`) — documented in the backend README.
- Native device testing requires **USB + `adb reverse`** (WiFi/hotspot connections were unreliable on this network — likely router/carrier client isolation). Ports needed: 8081 (Metro), 3000 (backend).
- Project is on **Expo SDK 51** (current latest is SDK 57 as of this session) — a real gap, not deliberately chosen. Upgrade deferred intentionally until the app is further along, to avoid compounding two hard problems at once.
- Web preview (`expo start --web`) is broken by a Windows + pnpm-workspace-specific Metro bug (malformed backslash path) — deferred, not fixed. Native (device) testing is unaffected.
- Every pushed stack route (Product Detail today; future ones like Checkout/Payment/Order Status) sits outside `TabScreenShell`'s subtree and needs its own `useSafeAreaInsets()` top-inset handling — missing it means the header renders under the status bar (a real bug caught on-device while building Product Detail). Deliberately not centralized into a shared wrapper yet — see the comment in `app/_layout.tsx` for why. Don't forget this on the next pushed screen.
- **Inter font is never actually loaded** — confirmed during Stage 3.5, not just a dev-time LogBox nuisance. `FONT_FAMILY = "Inter"` (design-tokens) is applied via `fontFamily: FONT_FAMILY` everywhere, but no app calls `useFonts`/`Font.loadAsync`, no `@expo-google-fonts/*` package is installed, `expo-font` only appears transitively (via `@expo/vector-icons`, for icon glyphs, not text), and no `.ttf` asset exists anywhere in the repo. Every screen in every app has been silently rendering in the platform default system font this whole time. Real design-system gap — needs its own follow-up task to actually load Inter, not folded into this pass.
