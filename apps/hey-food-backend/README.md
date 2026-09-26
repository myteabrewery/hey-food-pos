# Hey Food Backend

NestJS + Prisma + PostgreSQL. Data model: `prisma/schema.prisma`, mirroring
`packages/shared-types` (camelCase in Prisma, `@map()`'d to snake_case
columns/tables in Postgres).

## Setup

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` for a local
   Postgres instance.
2. `pnpm exec prisma migrate dev` — applies migrations.
3. Seed dev data — two separate, named profiles (docs/product-
   customization-v2.md's "Two seed profiles" section). Both write to the
   same schema; they're not meant to coexist — running one after clearing
   the database replaces the other, rather than adding to it:

   - `pnpm run db:seed:placeholder` — the original Chicken Rice/Nasi Lemak
     placeholder catalog, matching the frontend's existing mock data for
     the one outlet/order that already have mocks.

     Note: the seeded KSL City and Mid Valley outlets use placeholder
     `lat`/`lng` values, not verified coordinates (see the comment in
     `prisma/seed-placeholder.ts`) — if geofencing logic is ever tested
     against this data, a wrong result for those two outlets may just be
     inaccurate seed coordinates, not a code bug. Paradigm Mall's
     coordinates are real (taken from the frontend mock).

   - `pnpm run db:seed:soup-stall` — the real business's actual menu
     shape (Soup Base / Ingredients / Carb Base modifier groups), per
     docs/product-customization-v2.md. Every name and price in this one
     is an invented placeholder pending the real menu — see the comments
     at the top of `prisma/seed-soup-stall.ts`.

   `prisma db seed` / `prisma migrate reset`'s built-in auto-seed still
   defaults to the placeholder profile (`package.json`'s `"prisma".seed`
   config) — use the two named scripts above to pick a profile
   explicitly, most importantly to load the soup-stall one at all.

## Pre-launch checklist — temporary stand-ins that MUST go before production

Each item below is a deliberate stopgap that exists so the order pipeline could be built end to end before its real counterpart. **A production process refuses to start** (`src/common/env.ts`) if `PAYMENT_STUB_ENABLED=true`, `PUSH_STUB_ENABLED=true` or `SMS_STUB_ENABLED=true` is set, but the code behind them must still be replaced, not just switched off. (`POS_DEVICE_KEY` and `HQ_ADMIN_KEY` used to be in this list — both have been REMOVED, along with their refusal checks, now that real staff PIN login and real HQ login both exist; see below.)

- [x] ~~HQ Admin has no login.~~ **DONE — replaced outright, not run alongside the old stopgap.** `HQ_ADMIN_KEY`, `HqAdminKeyGuard`, its env var and its production-refusal check are all REMOVED. Every `/admin/*` controller (Staff, Orders, Menu, Customers) now requires a real HQ session (`HqAdminSessionGuard`) from `POST /auth/hq/login` — a real password (not a PIN; see `StaffPasswordSchema`'s doc comment for why), looked up by phone, checked with the same `crypto.scrypt` primitive as POS's PIN. The browser holds an httpOnly session cookie (`apps/hey-food-hq/src/lib/session.ts`); the backend session itself is the same `StaffSession` mechanism POS uses (`outletId` is `NULL` for an HQ session — never bound to one outlet). `outlet_staff` is rejected outright (403); `hq_admin` gets full access. What that closes and what is still open:
  - **Every `businessId` that used to be a client-supplied field is now session-derived** — removed from every admin request/query contract. This also closed several pre-existing, previously-unscoped gaps found along the way: `GET /admin/orders/:id`, `POST /admin/orders/:id/cancel`, `GET /admin/products/:id`, `PATCH /admin/products/:id` and the override endpoint had NO business-ownership check at all before this pass (any business's session could read or write another's by id); all are scoped now, verified in both directions with a real second business created for the test.
  - **HQ's own writes finally have a real actor:** `AdminOrdersService.cancel()` and `AdminMenuService`'s create/update/override paths now pass the real `session.staffId` into `cancelOrder()`/`recordMenuChanges()` instead of `null` — closing the HQ side of the audit-trail gap below.
  - **`area_manager` is authenticated but blocked everywhere for now.** It can log in (`POST /auth/hq/login`), and `GET/POST /auth/hq/session`/`logout` always work regardless of role, but every `/admin/*` route rejects it outright (403 `AREA_MANAGER_NOT_YET_SUPPORTED`) — scoping HQ's screens to an area manager's assigned outlets (mirroring what POS login already does) is real, deliberately deferred follow-up work. **Orders is the natural first screen to open up to it.** The HQ frontend shows one clear "not available yet" screen in place of every page's content for this role, rather than six raw 403s.
  - **The localhost-bind guard (`apps/hey-food-hq/scripts/serve.mjs`) is KEPT**, deliberately, but as ordinary defense-in-depth now rather than compensating for a missing login — see docs/STATUS.md's entry for what it still does. The permanent "NO LOGIN" banner on every HQ page is REMOVED — it existed specifically to compensate for the auth gap this closes.
- [x] ~~HQ Staff: no login, no "who," nothing checked the PIN or a password.~~ **DONE, alongside the item above.** `GET/POST /admin/staff`, `GET/PATCH /admin/staff/:id`, `.../reset-pin`, `.../reset-password` (new) and `.../deactivate`/`.../reactivate` all require `HqAdminSessionGuard`. (1) **The PIN and (for `hq_admin`/`area_manager`) the password are both typed by the HQ admin, not generated** — real POS PIN login and real HQ password login both exist now, checking exactly these, but there is still nothing enforcing a forced first-login change. (2) Both hashed with `crypto.scrypt` (`src/staff/pin-hash.ts`, `src/staff/password-hash.ts`) — pure Node core, not a native addon (this repo already hit a native-binding wall once — Prisma's engine has no Windows-ARM64 build). (3) **No two staff in a business share a PIN** (unchanged); a password has no such uniqueness rule — it's looked up by phone directly, not PIN-scanned. (4) The role/outlet-assignment invariant is unchanged (request schema + a hand-written CHECK constraint). (5) **No delete, deactivate only** — `isActive` now blocks login immediately, for both POS and HQ; deactivating (or demoting) the business's LAST active `hq_admin` is still refused (409 `LAST_HQ_ADMIN`). (6) **Password lifecycle mirrors PIN's:** required at creation for `hq_admin`/`area_manager`, forbidden for `outlet_staff`, NOT auto-set on promotion (a promoted staff member gets their first one via the same `reset-password` endpoint), and auto-**cleared** on demotion away from needing one (a lingering hash would be structurally unusable, not just unused).
- [x] ~~HQ Orders: no login, no "who".~~ **DONE, alongside the item above.** `GET /admin/orders`, `GET /admin/orders/:id` and `POST /admin/orders/:id/cancel` all require `HqAdminSessionGuard`, scoped to the session's business (see the cross-business note above). Everything else about this screen — masked phones, no phone search, what an HQ cancel does NOT do (no refund, no customer notification, no kitchen notice), the shared `order-cancel.ts` implementation, the `cancel_source` column, the keyset-cursor pagination — is unchanged; see the Menu/Customers items and the audit-trail item below for what else moved.
- [ ] **HQ Menu Management: a few things it deliberately does not do (real auth now closes the "anyone can reprice the business" part).** (1) **The change log (`menu_change_events`, append-only) now records WHO too** (`changedByStaffId`, from the real HQ session) **as well as** WHEN/WHAT/WHERE (field, old value, new value, source `hq`/`pos`). Product **creation** is logged; nothing is ever deleted from it. (2) **Product-name uniqueness is checked in application code (case-insensitive), not by a database constraint, so two simultaneous creates of the same name can both succeed.** (3) **No delete / archive:** a product cannot be removed or hidden from the menu other than by marking it sold out per outlet. (4) **Modifier groups (toppings, sizes) are not editable in HQ**, and a product created there has none. (5) **No image upload:** an image is a pasted `http(s)` URL. (6) Prices must be > 0, at most RM999.99 and have at most 2 decimals (rejected, never rounded); an override **equal to** the master price is rejected (`PRICE_OVERRIDE_EQUALS_MASTER`), because it would silently stop following the master later — clear the override instead. Clearing writes `NULL` to the row; override rows are never deleted. (7) A change to the master price does **not** move outlets that have their own price; the product page says which outlets those are.
- [ ] **HQ Customers: reads every customer's real order history and lifetime value — real auth now, still read-only.** `GET /admin/customers`, `GET /admin/customers/:id`, `GET /admin/guest-customers` and `GET /admin/guest-customers/:key` all require `HqAdminSessionGuard` (no write route exists here at all). (1) **Personal data:** exactly the Orders precedent — the full phone number never leaves the backend; every response carries only a masked one. The guest view's `key` (a one-way hash of the phone, computed server-side) exists so a browser can address one guest phone's detail page without the raw number ever appearing in a URL, page source, or anywhere else the browser can read. (2) **Two views because of what data actually exists, not because dev spec §9.4 asked for two:** `Customer` (the entity dev spec §2/9.4 actually describes) has exactly one row in a fresh dev DB — nothing creates one outside the seed script until customer OTP auth (dev spec §5.5) exists, since a guest order deliberately never creates one (`orders_identity_xor`). The **App Accounts** view is that real entity, honestly near-empty until OTP auth ships; **Guest Orders by Phone** groups guest orders by phone at query time (not a real table) and is where genuine, growing data lives today. (3) **"Lifetime value" / order count is a judgment call** (dev spec says only the words "lifetime value"): both views exclude `pending` (unpaid) and `cancelled` orders from the count/total, but the order HISTORY list always shows every order regardless of status — a phone whose only order was cancelled does not appear in the Guest list at all. (4) **The Guest list's cursor is NOT a true keyset** like Orders' — there is no indexed row to keyset over, only a live `GROUP BY guest_phone`, so it's an offset encoded inside the opaque cursor; a guest order landing between two page fetches can shift a page boundary by one row. (5) **The guest `key` → phone lookup is an unindexed scan** (distinct guest phones for the business, hashed in code until one matches) — fine at today's guest volume; a persisted, indexed hash column is the fix if that changes. (6) Neither `GET /admin/customers` (list) nor either guest-customer route is in dev spec §2, which defines only the one detail endpoint — added when this screen was built, same as `GET /admin/orders` before it.
- [ ] **Payment stub → Billplz.** `PAYMENT_STUB_ENABLED=true` makes `POST /orders/:id/pay` mark an order paid **without taking any payment** (`src/payments/payment-stub.service.ts`). Replace `PaymentStubService.markPaid` with the real Billplz bill + webhook, delete the stub, and remove `isStub` from the pay response and the web app's "TEST MODE" banner. Stub-paid orders are recognisable in the DB: `status = 'paid'` with `payment_id IS NULL` and no `payments` row — audit any that exist before launch.
- [ ] **Push stub → FCM.** `PUSH_STUB_ENABLED=true` routes push notifications to `LoggingPushProvider` (`src/notifications/logging-push.provider.ts`), which **sends nothing** — it logs what it would have pushed and reports "accepted". Replace the `PUSH_PROVIDER` factory in `notifications.module.ts` with a real FCM provider (the `FCM_*` variables in `.env.example` are placeholders for it). **A real provider also needs what does not exist yet:** a device-token registry (no table, no registration endpoint) and push handling in the Customer App (no `expo-notifications`, no Firebase). `PushProvider.send` is addressed by customer id for exactly that reason — the real provider owns the token lookup.
- [ ] **SMS stub → a real SMS provider.** `SMS_STUB_ENABLED=true` routes SMS to `LoggingSmsProvider` (`src/notifications/logging-sms.provider.ts`), which **sends nothing**. No provider is chosen; this is the same decision the OTP login is waiting on, so choose once and implement `SmsProvider` for both. Until then a guest is never actually texted that their food is ready.
- [ ] **What a stub-"notified" order looks like (audit before launch).** With the stubs `orders.notified_at` IS set (the stub "accepted"), so it is **not** proof anyone was told. The tell is `notification_logs`: `payload->>'provider' = 'logging-stub'`, `payload->>'stub' = 'true'`, `delivered = false`. `delivered` is `false` on every row today — nothing observes a delivery receipt.
- [ ] **Notification outbox + retry.** Notifications are sent in-process, after the status change commits, with no queue: if the process dies or a provider is down at that moment, that customer is never notified and nothing retries. Every failed attempt is a `notification_logs` row with `payload->>'accepted' = 'false'` and the reason, which is how to find them. A durable outbox needs status / attempt / error columns and a cron sweep (`ScheduleModule` is registered but nothing uses it yet).
- [ ] **Lost response after a successful action → false failure on the POS.** If the server applies a Start / Ready / Collect / Cancel (or a Menu Availability toggle, which shares the same `useOptimisticActions` hook) but the response is lost on the way back (dropped connection, timeout), the POS treats it as a failed request: it rolls the card back and shows the "Couldn't … put back as it was" banner although the order changed server-side. For **Ready** the customer notification has already fired at that point, so staff are told it failed when it didn't. It self-corrects on the next poll (~5 s; up to one further cycle if a poll was already in flight) and the banner clears itself after 10 s. Retrying is safe: a repeated Ready is a silent no-op and sends no second notification (verified). **Not fixed in this pass.** Same root gap as the missing outbox/retry ("the server did the thing" vs "the client knows the server did the thing") and the offline action queue — revisit together; e.g. treat an ambiguous failure (timeout / network error after the request was sent) as "outcome unknown" and resolve it by reading the server, rather than rolling back.
- [x] ~~POS device key → real staff/device auth.~~ **DONE — replaced outright, not run alongside the old stopgap.** `POS_DEVICE_KEY`, `PosDeviceKeyGuard`, its env var and its production-refusal check are all REMOVED (there was no reason to keep two auth systems running in parallel: this project has no real production rollout to hedge a transition against). Every POS route (`GET /pos/outlets/:id/orders`, `PATCH /pos/orders/:id/status`, `POST /pos/orders/:id/cancel`, `PATCH /pos/outlets/:id/products/:id/availability`) now requires a real staff session (`StaffSessionGuard`) from `POST /auth/staff/login` (dev spec Section 5.5). What that closes and what is still open:
  - **The demonstrated cross-outlet weakness is fixed.** Every request is scoped to the SESSION's own outlet (resolved once at login), never a route's own `:outletId` — a KSL City session can no longer touch a Paradigm Mall order or product, closing exactly the weakness this checklist used to describe ("a Paradigm tablet's key toggled KSL City's Chicken Rice").
  - **Session, not a shared secret:** an opaque, DB-backed, hashed bearer token (`StaffSession`, modeled on the guest order token, not a JWT — this repo has no JWT infrastructure, and a lost/stolen shared tablet is a real physical-security case where revocability matters more than statelessness would help), 12-hour TTL, revoked immediately on explicit logout OR the moment HQ deactivates that staff member (re-checked on every request, not just at login).
  - **Outlet resolution without real device binding:** `outlet_staff` (exactly one assigned outlet) and most `area_manager`s resolve outright; an `area_manager` with more than one assigned outlet gets a one-tap outlet-choice step (`status: "choose_outlet"` in the response) — a narrow, deliberate deviation from "the device knows its outlet," since that assumption depends on device binding, which does not exist. `hq_admin` is rejected outright (403) — blueprint's own device table lists that role's device as the web dashboard, not POS.
  - **Rate-limited** (10/min/IP on login, `@nestjs/throttler`, same convention as guest order creation) — a 6-digit PIN is only 1,000,000 combinations.
  - **STILL NOT real device binding** (`POST /admin/outlets/:id/pos-devices`): `deviceId` is an opaque, client-generated identifier, recorded on the session but not validated against any device registry — `PosDevice` in Prisma has no field to support pairing at all (id/outletId/deviceName/lastSeenAt/connectionStatus only — decorative health-status data for the HQ dashboard). A deliberately separate, still-unbuilt follow-up.
  - **STILL NOT wired into "who changed this order/menu item"** — see the next item. Real, authenticated staff identity now exists and flows through every POS request; it just isn't persisted onto `orders` or `menu_change_events` yet.
- [x] ~~Audit trail: who changed an order or menu item — closed for the POS, still open for HQ.~~ **DONE, both sides now.** A status change or cancel stores WHEN (`preparing_at`, `ready_at`, `collected_at`/`completed_at`, `cancelled_at`) and, for a cancel, WHY (`cancel_reason`, `cancel_reason_detail`); `orders.cancel_source` and `menu_change_events.source` still record WHERE (`hq` vs `pos`). **WHO is recorded too, for every write, POS and HQ alike:** `orders.preparingByStaffId`/`readyByStaffId`/`collectedByStaffId`/`cancelledByStaffId` (one column per timestamp above, not one shared "last actor" column — so "who started this order" stays answerable separately from "who marked it ready") and `menu_change_events.changedByStaffId`, populated from the real `StaffSession` identity every POS request already carried (`PosOrdersService.advance`/`cancel`, `PosMenuService.setAvailability`) **and, as of real HQ auth above, every HQ request too** (`AdminOrdersService.cancel`, `AdminMenuService`'s create/update/override), all wired through the same shared `cancelOrder()`/`recordMenuChanges()`. **All nullable, no backfill, no CHECK constraint** — deliberately: `orders`' automatic transitions (`paid→received` on sync; `completedAt`, stamped alongside `collectedAt`) have no human actor, and every row that predates either auth pass genuinely has no staffId to compute. **Backend/data-model only, deliberately:** no api-client contract change and no UI surfacing ("cancelled by Jane Doe" on HQ Orders, "by Ahmad" in the Menu change log) — both cheap, natural follow-ons now that `StaffUser.name` is a join away, not bundled into either pass.
- [ ] **Refunds on cancel.** Cancelling a paid order should trigger the refund flow (dev spec Section 3, Section 8). Not built: `POST /pos/orders/:id/cancel` **and HQ's `POST /admin/orders/:id/cancel`** log `[REFUND NOT IMPLEMENTED]` when it cancels an order that had been paid (with "nothing to refund" for a stub-paid one). Once Billplz is real, a cancelled real payment is a customer who was charged for food they didn't get.
- [ ] **Customer notifications: `ready` is wired, to stubs only.** `PATCH .../status` to `ready` now fires a notification (`src/notifications/`): an app-based customer gets push + SMS in parallel, a guest gets SMS; `orders.notified_at` is set only if a provider accepted. But both providers are logging stubs (see the push and SMS items above), so **nobody is actually notified** and the POS still says so on screen. Still missing: the `paid` push ("Order confirmed") and `preparing` push of dev spec Section 6, delivery receipts (`delivered` is always false), and Malay/Chinese copy (guests have no stored language; the message is English).
- [ ] **POS offline action queue.** Dev spec 5.1 requires actions taken offline to be queued and replayed in order. The POS instead applies each action optimistically, and if the save fails it is undone with a visible error. Nothing is dropped silently, but a tap made while offline is lost and must be repeated.
- [ ] **Service fee.** `SERVICE_FEE_CENTS` in `src/orders/pricing.ts` is a flat RM2.00 **placeholder** copied from the Customer App's mock — the real rule (flat / percentage / per outlet) is undecided.
- [ ] **Business timezone.** Display IDs reset at midnight in `Asia/Kuala_Lumpur` (`src/orders/business-date.ts`), fixed for every outlet. Fine while all outlets are in Malaysia.
- [ ] **CORS origin / proxy.** Set `WEB_ORIGIN` to the deployed guest-checkout origin (also the payment redirect target). Rate limiting is per client IP, so when deployed behind a proxy or load balancer configure Express `trust proxy` — otherwise every guest shares the proxy's IP and one budget.
- [ ] **Order polling → real-time.** POS and the guest order page poll every 5 s; the dev spec prefers websockets.

## Runtime: ts-node, not `nest build` + `node dist/main.js`

**Dev-time fix, not a production decision.** `dev`/`start` currently run
`src/main.ts` directly under `ts-node` (`node -r ts-node/register`, with
`--watch` added for `dev`) instead of the Nest CLI's default `nest build` →
`node dist/main.js`. This was chosen to unblock *local development* against
the raw-TypeScript workspace packages below, and that's the only thing it's
actually been evaluated against — functional correctness, not production
readiness. Concretely, still open before this should ever be what actually
deploys:

- It's running with full type-checking on every process start (plain
  `ts-node/register`, not `--transpile-only`) — slower than it needs to be,
  since CI/dev already typechecks separately; this was never tuned for
  startup cost.
- Cold-start time hasn't been benchmarked at all, and no deployment target
  (container? serverless? long-running VM?) has been decided yet — whether
  ts-node's startup profile is even acceptable depends entirely on that.
- The real fix for shipping this properly is almost certainly giving
  `api-client`/`shared-types` a real compiled `dist/` (see the tradeoff
  below) scoped to a production build step only, or `--transpile-only` at
  minimum — neither has been done. Revisit this section before an actual
  deploy; don't assume `ts-node` in prod is fine just because it works
  here.

`nest build` still exists and still passes (useful as a compile-check),
but its output isn't what actually runs the app.

Why: `@hey-food/api-client` and `@hey-food/shared-types` ship raw
TypeScript source (`"main": "./src/index.ts"`) — every other consumer
(Metro, Next.js, `tsx`) bundles, so that's never been a problem. Plain
`node dist/main.js` doesn't bundle: at runtime it `require()`s those
packages' raw `.ts` source directly, and hits two hard limits in Node's
built-in TypeScript support (no bundler involved):

- It resolves relative imports the same strict way ESM does — no extension
  guessing — so an ordinary extensionless `from "./common"` inside those
  packages fails to resolve at runtime (even though tsc accepts it fine at
  typecheck time).
- It can only erase pure type syntax, and explicitly refuses to strip a
  real `enum` declaration (shared-types' `OrderStatus` was one — now a
  const-object + derived type instead, which sidesteps this for good
  regardless of runtime).

`ts-node` doesn't have either limitation (it runs the real TypeScript
compiler, not a syntax-only stripper), and — unlike `tsx`'s esbuild-based
transform, tried first — it preserves the `emitDecoratorMetadata` NestJS's
dependency injection depends on; esbuild silently dropped it, leaving
injected constructor params `undefined` with no error. Adding explicit
`.ts` extensions to fix the first bullet was tried too, but
`allowImportingTsExtensions` requires `noEmit`/`emitDeclarationOnly`, which
conflicts with `nest build`/`ts-node` actually needing to emit real output
— a dead end independent of which runner is used.

The other standard fix — giving `api-client`/`shared-types` a real
compiled `dist/` build and pointing `"main"` at it — would work too, but
changes what *every* consumer resolves (Metro/Next's hot-reload against
live source would need it rebuilt first) for the sake of the one consumer
(this app) that doesn't bundle. Scoping the fix to this app's own runtime
instead leaves that untouched.

## Windows on ARM

Prisma has no native Windows-ARM64 query engine — on an arm64 Node process,
`@prisma/client` fails to load its engine with `"...is not a valid Win32
application"`. This is a confirmed upstream dead end
([prisma/prisma#25206](https://github.com/prisma/prisma/issues/25206),
closed as not planned), not something fixable from this repo.

If `node -p process.arch` on your machine prints `arm64`, anything that
instantiates `PrismaClient` — the dev server, `prisma` CLI commands, the
seed script — needs to run under an **x64** Node instead (Windows' x64
emulation runs it fine; no other workaround needed).

Setup, one-time:

1. Download the x64 Node zip build (same version as your arm64 install) from
   https://nodejs.org/dist/ and extract it somewhere **other than**
   `C:\Program Files\nodejs` (that path is already the arm64 install — the
   official x64 MSI installer targets the same path and would collide with
   it, which is why this uses the zip distribution instead).
2. By default `scripts/with-x64-node.mjs` looks for it at
   `C:\node-x64\node-v24.20.0-win-x64`. If you extracted it elsewhere, set
   `HEY_FOOD_X64_NODE_DIR` to that path (in your shell profile, or per
   invocation).

From then on, `pnpm run dev`, `pnpm run start`, and every `pnpm run
prisma:*` script route through that wrapper automatically — it prepends the
x64 Node directory to `PATH` for the duration of the command (and its child
processes: `ts-node`, `prisma`, `tsx`, `nest`, etc. all resolve to x64 Node
as a result). On a machine that doesn't have this problem, the configured
directory won't exist and the wrapper is a silent no-op.

One thing this doesn't cover automatically: if you ever need to run a
Prisma-touching script directly (bypassing `package.json`'s `scripts`),
esbuild-based tools (`tsx`, etc.) need their own x64 native binary too —
this repo's `devDependencies` already includes `@esbuild/win32-x64`
explicitly for that reason. If you add a new esbuild-based dev tool here,
check whether it needs the same treatment.
