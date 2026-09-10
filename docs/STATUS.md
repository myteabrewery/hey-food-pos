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
| Product Detail (customization/add-ons) | 🔲 Spec'd (docs/product-customization-v1.md). Stage 1 (shared-types/api-client schemas) and Stage 2 (Prisma migration, seed data, GET /outlets/:id resolved menu, standalone order-validation logic) done and verified. Stage 3 (Product Detail screen + cart display of selected modifiers) not started. |
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
