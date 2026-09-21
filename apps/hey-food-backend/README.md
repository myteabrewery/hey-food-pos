# Hey Food Backend

> # ⛔ CRITICAL — THE HQ ADMIN APP HAS NO LOGIN. DO NOT EXPOSE IT.
>
> The HQ Admin web app (`apps/hey-food-hq`) has **no application-layer authentication**: its "login" screen is a link to the dashboard. **Product / Menu Management now exists (`/menu`): it edits master prices, per-outlet price overrides and availability for the whole business. Anyone who can reach the HQ app's URL can change any price, with nothing to stop them and nothing to record who did it** (the change log records *when* and *what*, never *who*). The Dashboard and Outlets screens are still mock data; Menu Management is real.
>
> This is categorically more dangerous than every other stand-in in this repo. The payment stub, the POS device key and the notification stubs each touch one outlet's orders or one customer; this one reprices the entire business. Forgetting it is not a small mistake.
>
> **Rules until real HQ authentication exists** (blueprint §6 screen 1, dev spec §2 `POST /auth/staff/login`; neither is built):
>
> 1. **Never port-forward, tunnel, reverse-proxy, deploy, or bind the HQ app to anything but localhost.** Not for a demo, not "just for a minute", not to test on a phone over Wi-Fi.
> 2. **This is enforced for the package scripts.** `pnpm --filter hey-food-hq dev` and `start` bind `127.0.0.1` and **refuse to start** if `HQ_BIND_HOST` is anything else, unless you *also* set `HQ_UNSAFE_NETWORK_BIND=I_UNDERSTAND_THIS_IS_UNSAFE` (that exact value; `true`, `yes` or a different case are refused), in which case it prints a large warning. Also refused: `-H` / `--hostname` passed to the script. (Until this check was added, the HQ dev server listened on every network interface — Next's default — so it was reachable from the LAN.) Verified: by default the app answers on `localhost` and is **unreachable** at the machine's LAN address; with the override it is reachable there.
> 3. **That check is a seatbelt, not security.** It covers only those two scripts. Running `next` directly, or putting a tunnel or proxy in front of a localhost bind, defeats it, and it does nothing about someone with access to the machine. Only real HQ authentication fixes this.
> 4. **The `/admin/*` API is guarded by a shared secret, `HQ_ADMIN_KEY` — which is a stand-in, not authentication.** It is sent as `X-Hq-Admin-Key` **only by the HQ app's server** (Next server actions; it is never in the browser bundle, and the HQ app has no `NEXT_PUBLIC_` copy). It stops a stranger calling the API directly. It does **nothing** to stop a person who can open the HQ app: whoever can load a page there can call its server actions, and so effectively holds the key's power. The backend fails closed (503 `HQ_AUTH_NOT_CONFIGURED`) when the key is unset, and a production process **refuses to start** with it set. Every HQ page shows a permanent "NO LOGIN" banner.
>
> Tracked as **CRITICAL** at the top of [`docs/STATUS.md`](../../docs/STATUS.md).

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

Each item below is a deliberate stopgap that exists so the order pipeline could be built end to end before its real counterpart. **A production process refuses to start** (`src/common/env.ts`) if `PAYMENT_STUB_ENABLED=true`, `POS_DEVICE_KEY`, `HQ_ADMIN_KEY`, `PUSH_STUB_ENABLED=true` or `SMS_STUB_ENABLED=true` is set, but the code behind them must still be replaced, not just switched off.

- [ ] **⛔ CRITICAL — HQ Admin has no login (see the banner at the top of this file).** Real HQ authentication must exist before the HQ app is ever reachable beyond localhost. The localhost-only bind check is a seatbelt, not a fix; remove the `HQ_UNSAFE_NETWORK_BIND` escape hatch's need by shipping real auth, and never set it on anything shared. **The first HQ write path now exists** (Menu Management, below), guarded only by the `HQ_ADMIN_KEY` stand-in: replace `HqAdminKeyGuard` (`src/admin/hq-admin-key.guard.ts`) with real staff auth + roles, and have the HQ app authenticate the person, not just itself.
- [ ] **⛔ HQ Menu Management: no login, no "who", and a few things it deliberately does not do.** (1) **Anyone who can open the HQ app can reprice the business** (see the banner). (2) **The change log (`menu_change_events`, append-only) records WHEN and WHAT — field, old value, new value, source `hq`/`pos` — but not WHO or from which device**; there is no login to attribute a change to, and the table deliberately has no actor column rather than a fake one. Product **creation** is logged; nothing is ever deleted from it. (3) **Product-name uniqueness is checked in application code (case-insensitive), not by a database constraint, so two simultaneous creates of the same name can both succeed.** (4) **No delete / archive:** a product cannot be removed or hidden from the menu other than by marking it sold out per outlet. (5) **Modifier groups (toppings, sizes) are not editable in HQ**, and a product created there has none. (6) **No image upload:** an image is a pasted `http(s)` URL. (7) Prices must be > 0, at most RM999.99 and have at most 2 decimals (rejected, never rounded); an override **equal to** the master price is rejected (`PRICE_OVERRIDE_EQUALS_MASTER`), because it would silently stop following the master later — clear the override instead. Clearing writes `NULL` to the row; override rows are never deleted. (8) A change to the master price does **not** move outlets that have their own price; the product page says which outlets those are.
- [ ] **Payment stub → Billplz.** `PAYMENT_STUB_ENABLED=true` makes `POST /orders/:id/pay` mark an order paid **without taking any payment** (`src/payments/payment-stub.service.ts`). Replace `PaymentStubService.markPaid` with the real Billplz bill + webhook, delete the stub, and remove `isStub` from the pay response and the web app's "TEST MODE" banner. Stub-paid orders are recognisable in the DB: `status = 'paid'` with `payment_id IS NULL` and no `payments` row — audit any that exist before launch.
- [ ] **Push stub → FCM.** `PUSH_STUB_ENABLED=true` routes push notifications to `LoggingPushProvider` (`src/notifications/logging-push.provider.ts`), which **sends nothing** — it logs what it would have pushed and reports "accepted". Replace the `PUSH_PROVIDER` factory in `notifications.module.ts` with a real FCM provider (the `FCM_*` variables in `.env.example` are placeholders for it). **A real provider also needs what does not exist yet:** a device-token registry (no table, no registration endpoint) and push handling in the Customer App (no `expo-notifications`, no Firebase). `PushProvider.send` is addressed by customer id for exactly that reason — the real provider owns the token lookup.
- [ ] **SMS stub → a real SMS provider.** `SMS_STUB_ENABLED=true` routes SMS to `LoggingSmsProvider` (`src/notifications/logging-sms.provider.ts`), which **sends nothing**. No provider is chosen; this is the same decision the OTP login is waiting on, so choose once and implement `SmsProvider` for both. Until then a guest is never actually texted that their food is ready.
- [ ] **What a stub-"notified" order looks like (audit before launch).** With the stubs `orders.notified_at` IS set (the stub "accepted"), so it is **not** proof anyone was told. The tell is `notification_logs`: `payload->>'provider' = 'logging-stub'`, `payload->>'stub' = 'true'`, `delivered = false`. `delivered` is `false` on every row today — nothing observes a delivery receipt.
- [ ] **Notification outbox + retry.** Notifications are sent in-process, after the status change commits, with no queue: if the process dies or a provider is down at that moment, that customer is never notified and nothing retries. Every failed attempt is a `notification_logs` row with `payload->>'accepted' = 'false'` and the reason, which is how to find them. A durable outbox needs status / attempt / error columns and a cron sweep (`ScheduleModule` is registered but nothing uses it yet).
- [ ] **Lost response after a successful action → false failure on the POS.** If the server applies a Start / Ready / Collect / Cancel (or a Menu Availability toggle, which shares the same `useOptimisticActions` hook) but the response is lost on the way back (dropped connection, timeout), the POS treats it as a failed request: it rolls the card back and shows the "Couldn't … put back as it was" banner although the order changed server-side. For **Ready** the customer notification has already fired at that point, so staff are told it failed when it didn't. It self-corrects on the next poll (~5 s; up to one further cycle if a poll was already in flight) and the banner clears itself after 10 s. Retrying is safe: a repeated Ready is a silent no-op and sends no second notification (verified). **Not fixed in this pass.** Same root gap as the missing outbox/retry ("the server did the thing" vs "the client knows the server did the thing") and the offline action queue — revisit together; e.g. treat an ambiguous failure (timeout / network error after the request was sent) as "outcome unknown" and resolve it by reading the server, rather than rolling back.
- [ ] **POS device key → real staff/device auth.** `POS_DEVICE_KEY` is one shared secret sent as `X-Pos-Device-Key` (`src/pos/pos-device-key.guard.ts`). It is not per-device, not per-outlet, cannot be revoked for one device, and — because it ships inside the POS app bundle as `EXPO_PUBLIC_POS_DEVICE_KEY` — is not secret. **It now guards WRITES, not just reads: `PATCH /pos/orders/:id/status` and `POST /pos/orders/:id/cancel` (Stage B), and `PATCH /pos/outlets/:outletId/products/:productId/availability`. Anyone who extracts the key from the app can move or cancel ANY outlet's orders and mark ANY outlet's menu items sold out** (the outlet is just a URL segment; verified: the key a Paradigm tablet holds toggled KSL City's Chicken Rice), and nothing records which device or person did it (see the next item). Replace with dev spec Section 5.5 (PIN login, device bound to its outlet, actions attributed to a staff user) and scope the write endpoints to the device's own outlet.
- [ ] **Audit trail: who changed an order.** A status change or cancel stores WHEN (`preparing_at`, `ready_at`, `collected_at`/`completed_at`, `cancelled_at`) and, for a cancel, WHY (`cancel_reason`, `cancel_reason_detail`) — but **not who or from which device**: no actor/staff/device id on the order, no events table, and no per-request log of these calls (the only log line is the refund warning). The cancel body's `actor: "staff"` is a category the client asserts, not an identity, and with one shared device key even access logs can't tell devices or people apart. "Who cancelled this?" is unanswerable, and a wrongful cancel or misuse of an extracted key can't be attributed. **Menu changes are partly covered:** `menu_change_events` now records when, what and from which side (`hq`/`pos`) for every availability, price-override and master-product change — but still **not who**, so a wrongful sell-out or reprice can be dated and described, not attributed. Needs real staff auth (above) first, then a record of staff id + device id on every transition.
- [ ] **Refunds on cancel.** Cancelling a paid order should trigger the refund flow (dev spec Section 3, Section 8). Not built: `POST /pos/orders/:id/cancel` logs `[REFUND NOT IMPLEMENTED]` when it cancels an order that had been paid (with "nothing to refund" for a stub-paid one). Once Billplz is real, a cancelled real payment is a customer who was charged for food they didn't get.
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
