# Hey Food — Developer Specification V1

This document turns the Product Blueprint and Design System into something an engineering team can build against: data model, API surface, screen-by-screen behavior, edge cases, and error states. It covers the core loop in full detail and the remaining screens at spec-level (enough to build, expandable on request).

---

## 1. Data Model

```
Business
  id, name, created_at

Outlet
  id, business_id, name, address, lat, lng, geofence_radius_m,
  operating_hours, status (open/closed), created_at

POSDevice
  id, outlet_id, device_name, last_seen_at, connection_status (online/offline)

StaffUser
  id, business_id, name, phone, role (hq_admin | area_manager | outlet_staff),
  assigned_outlet_ids[], pin_hash

Customer
  id, phone, name, created_at, loyalty_points

Product (master menu)
  id, business_id, name, description, image_url, category, master_price

OutletProductOverride
  id, outlet_id, product_id, is_available (bool), price_override (nullable)

Order
  id, outlet_id, customer_id, display_id (e.g. "PM238" — outlet-prefixed),
  status (pending|paid|received|preparing|ready|collected|completed|cancelled),
  subtotal, service_fee, total, payment_id,
  created_at, paid_at, received_at, preparing_at, ready_at,
  notified_at, collected_at, completed_at, cancelled_at, cancel_reason

OrderItem
  id, order_id, product_id, name_snapshot, price_snapshot, quantity, notes

Payment
  id, order_id, provider (billplz|...), provider_ref, status (pending|paid|failed),
  amount, paid_at, webhook_payload

NotificationLog
  id, order_id, channel (push|sms), sent_at, delivered (bool), payload
```

**Why `name_snapshot` / `price_snapshot` on OrderItem:** menu items and prices change over time; an order must preserve exactly what the customer was charged, independent of later master menu edits.

**Why `display_id` is a separate field from the database primary key:** the outlet-prefixed human-readable ID (PM238) is for humans — staff calling out orders, customers checking notifications. The internal `id` is for the system. Never expose the raw internal ID in any UI.

---

## 2. API Surface (high level)

**Auth**
- `POST /auth/customer/otp/request` — send OTP to phone
- `POST /auth/customer/otp/verify` — verify + issue session token
- `POST /auth/staff/login` — PIN + device-bound outlet login

**Location**
- `GET /outlets/nearby?lat=&lng=` — returns outlets within range, sorted by distance
- `GET /outlets/:id` — outlet detail + live menu (with overrides applied)

**Menu**
- `GET /outlets/:id/menu` — resolved menu (master + outlet override merged)
- `PATCH /admin/products/:id` — HQ edits master item
- `PATCH /admin/outlets/:id/products/:product_id` — outlet-level override (availability/price)
- `PATCH /pos/outlets/:id/products/:product_id/availability` — staff toggles sold-out (writes to the same override table as above, scoped to staff role)

**Orders**
- `POST /orders` — create order (cart → order, status `pending`)
- `POST /orders/:id/pay` — initiates Billplz checkout, returns redirect URL
- `POST /webhooks/billplz` — payment provider webhook → updates `Payment` and `Order.status` to `paid`, triggers push to outlet POS
- `GET /orders/:id` — order detail + live status (polled or subscribed)
- `PATCH /pos/orders/:id/status` — staff transitions status (`preparing`, `ready`, `collected`) — see state machine rules below
- `POST /orders/:id/cancel` — cancel (customer pre-payment, or staff/HQ with reason)

**Notifications**
- Internal service triggered by order status transitions — see Section 6

**Staff / HQ**
- `GET /admin/outlets` — list with today's aggregate metrics
- `GET /admin/outlets/:id/live` — live queue counts + health status
- `GET /admin/reports?range=` — sales/ops aggregates
- `GET /admin/customers/:id` — order history, lifetime value

---

## 3. Order State Machine — Transition Rules

```
pending → paid → received → preparing → ready → collected → completed
                                                       ↘ (any state before completed) → cancelled
```

| Transition | Triggered by | Side effects |
|---|---|---|
| `pending → paid` | Billplz webhook | Set `paid_at`; push order to outlet's POS queue; if POS unreachable, order stays visible to HQ as "paid, not received" |
| `paid → received` | POS app acknowledges receipt (automatic on successful sync, not a staff action) | Set `received_at`; if this doesn't happen within a threshold (e.g. 2 min), flag on HQ outlet-health as a sync issue |
| `received → preparing` | Staff taps "Start" | Set `preparing_at` |
| `preparing → ready` | Staff taps "Ready" / "Call customer" | Set `ready_at`; trigger customer push + SMS fallback (Section 6) |
| `ready → collected` | Staff taps "Collect" | Set `collected_at` |
| `collected → completed` | Automatic, immediately after `collected` | Set `completed_at`; order moves out of any active queue view |
| `* → cancelled` | Customer (pending only) or staff/HQ (any pre-completed state, requires reason) | Set `cancelled_at`, `cancel_reason`; if already paid, trigger refund flow |

**Rule: no state can be skipped.** A staff device that's been offline and reconnects must replay the correct sequence, not jump straight to `ready` — this preserves the timing data HQ's reporting depends on (Section 14 of the blueprint: prep-time and ready-to-collection metrics).

**Rule: only one active order per `display_id` per outlet per day.** IDs reset daily per outlet (PM001, PM002, ... resetting at midnight local time) — prevents ID collision without needing globally unique human-readable IDs.

---

## 4. Customer App — Screen Specifications

### 4.1 Home / Nearest Outlet
- **On load:** request location permission (if not granted, show manual outlet search instead of blocking); call `GET /outlets/nearby`
- **Logic:** if exactly one outlet within geofence radius → show it directly with "Order Now" as primary CTA (per blueprint Section 12: don't make the customer choose unnecessarily). If multiple → show ranked list by distance. If zero → show "no outlets nearby" state with search/browse-all fallback.
- **Edge case — permission denied:** fall back to manual outlet list, sorted alphabetically or by the customer's last-used outlet if they have order history.
- **Edge case — outlet closed:** still shown, greyed out, with reopening time if known; "Order Now" disabled.

### 4.2 Menu
- **Data:** `GET /outlets/:id/menu` — resolved menu with overrides already merged server-side (client never merges master + override itself, to avoid stale-cache mismatches)
- **Sold-out items:** rendered greyed out, no add button, per the design system spec — never hidden entirely, so customers aren't confused about menu changes between visits.
- **Edge case:** item goes sold-out *while customer has it in cart* (race condition) — validate cart against live availability at checkout start; if conflict, surface a blocking modal before payment, not after.

### 4.3 Cart / Checkout
- **Outlet confirmation banner is mandatory,** not optional UI — this is the guard against the "customer thinks they're ordering from Outlet A but it's actually Outlet B" failure mode named in the blueprint.
- **On submit:** `POST /orders` creates the order in `pending` state before payment is attempted — this gives you a record even if payment fails or the customer abandons checkout.

### 4.4 Payment
- Billplz webview embedded with Hey Food header/footer wrapper (design system Section 6)
- **On success:** webhook-driven, not client-driven — the client polls or subscribes for the `paid` status rather than trusting the webview's own success callback alone, since webview redirects can be interrupted (app backgrounded, network drop) without the payment itself failing.
- **Edge case — payment succeeds but app was killed mid-flow:** on next app open, check for any `pending`/`paid` orders tied to the customer and resume the status screen — never leave a paid order orphaned in the customer's view.
- **Edge case — payment fails:** order stays `pending`; offer retry; auto-expire unpaid orders after a set window (e.g. 15 min) to avoid queue clutter on the outlet side.

### 4.5 Order Status (live)
- **Real-time updates:** push notification is the primary trigger, but the screen itself should poll or subscribe (websocket/long-poll) so it's correct even if the push is missed
- **Stepper UI** exactly as designed: Paid → Preparing → Ready, using the shared status colors
- Notification copy per stage as specified in blueprint Section 8

### 4.6–4.14 (remaining screens — spec level)
- **Splash/Login/OTP:** standard phone+OTP flow; session token stored securely on device
- **Outlet page:** wraps the menu with outlet metadata (hours, address, live prep-time estimate derived from that outlet's recent average)
- **Product detail:** customization options are `Product`-level attributes (not separate entities) unless variant complexity grows — keep this simple for MVP
- **Order history:** paginated list, active orders always pinned above past orders regardless of date
- **Rewards:** out of MVP scope per blueprint Section 15 unless prioritized — data model has a `loyalty_points` field ready, UI can be added later without a schema change

---

## 5. Outlet POS — Screen Specifications

### 5.1 Order Queue (main screen)
- **Data:** subscribes to outlet's live order feed (websocket preferred over polling, given the need for immediate new-order alerts)
- **New order arrival:** must trigger sound + visual per design system — this is not optional, it's the core reliability mechanism replacing a physical pager buzzer at the *staff* end
- **Offline behavior (critical):** if the tablet loses connection, the app must:
  1. Continue showing the last-known queue state, clearly marked as "may be out of date"
  2. Queue any local status changes (Start/Ready/Collect taps) locally
  3. Sync queued actions on reconnect, in the order they were made
  4. Never silently drop a staff action — show a persistent local indicator ("2 actions pending sync") until confirmed

### 5.2 Order Detail
- **"Mark ready & call customer"** is a single combined action, not two steps — the design system deliberately merges "prepared" and "notify" into one tap to reduce staff friction during a busy shift
- **Cancel action:** requires a reason (dropdown: item unavailable, customer no-show, kitchen error, other) — this reason feeds directly into HQ's cancellation reporting

### 5.3 Menu Availability
- Writes to `OutletProductOverride.is_available` — scoped so outlet staff can only toggle availability, never price (price override is HQ-only per the blueprint's MVP scoping)

### 5.4 Daily Summary
- Aggregates computed server-side, not client-side, so the numbers match what HQ sees for the same outlet — a single source of truth for "sales today" prevents POS and HQ ever disagreeing on the same number

### 5.5–5.10 (remaining screens)
- **Login:** PIN-based, device is pre-bound to its outlet at setup (not chosen at login) — this is a deliberate constraint preventing a tablet from accidentally operating as the wrong outlet
- **Outlet assignment confirmation:** shown once at device setup, not per login
- **Preparing/Ready/Completed states:** these are views into the same queue, filtered by status — not separate screens with separate data sources

---

## 6. Notification System

**Trigger points:**

| Order event | Channel(s) | Payload |
|---|---|---|
| `paid` | Push (customer) | "Order confirmed — #PM238" |
| `preparing` | Push (customer), optional | "Your food is being prepared" |
| `ready` | Push + SMS (customer) | "#PM238 is ready! Collect from Hey Food — Paradigm Mall." |
| New order | Sound + visual (POS, local, no push needed since it's the same device) | — |
| POS offline > threshold | Push/email (HQ/outlet manager) | "Southkey POS has lost connection" |
| Order ready > 10 min uncollected | Dashboard flag (HQ), optional push to outlet manager | "Order PM229 ready for 12 min" |

**SMS fallback logic:** send SMS in parallel with push for the `ready` event specifically — not sequentially triggered by push failure (which introduces unacceptable delay for a "come get your food now" message). Accept the minor cost of occasionally sending both.

**Delivery tracking:** log every notification attempt in `NotificationLog` — this is what lets you diagnose "customer says they never got notified" support tickets after the fact.

---

## 7. Geofencing & Location Service

- **Detection:** client requests device location, calls `GET /outlets/nearby`; backend computes distance server-side (never trust client-computed distance for anything security/business-logic relevant, e.g. discount eligibility tied to location)
- **QR fallback:** QR code encodes a direct deep link to `outlet/:id/menu` — bypasses location detection entirely, always available regardless of GPS accuracy
- **Edge case — customer is inside geofence of two outlets simultaneously** (unlikely but possible with generous radii in dense malls): show both, closest first, never auto-pick between two genuinely ambiguous options
- **Edge case — GPS spoofing / manipulation:** since ordering doesn't gate anything security-critical (no discount is tied to "must be physically present"), this is a low-severity concern for MVP; flag for revisit if promotions ever become location-gated

---

## 8. Payment Integration (Billplz)

- Backend creates a Billplz bill on `POST /orders/:id/pay`, returns the payment URL to the client
- **Webhook is the source of truth**, not the client-side redirect callback — Billplz webhooks should be verified (signature/checksum per Billplz's documentation) before trusting the payload
- **Idempotency:** webhook handler must be idempotent — Billplz may retry webhook delivery; processing the same `paid` event twice must not double-charge internal state or send duplicate notifications
- **Refunds:** MVP can start with manual refund initiated by HQ (outside Billplz's automated refund API if that adds complexity) — log the refund against the order regardless of mechanism, so reporting stays accurate

---

## 9. HQ Admin — Screen Specifications

### 9.1 Dashboard
- All-outlet aggregates and outlet health computed via a scheduled job (e.g. every 1–2 min), not computed live on every page load — at scale, live aggregation across all outlets on every dashboard visit doesn't hold up
- **Outlet health thresholds** (configurable, starting defaults):
  - 🔴 Red: POS offline > 5 min, or any paid order stuck in `paid` (not `received`) > 2 min
  - 🟡 Yellow: order volume > outlet's rolling average by a set margin, or avg prep time trending up sharply
  - 🟢 Green: everything else

### 9.2 Outlet Detail
- Drill-down view mirrors what that outlet's own POS would show, plus the connection-status warning banner (as designed) when relevant

### 9.3 Menu Management
- Availability matrix writes to the same `OutletProductOverride` table as the POS toggle — HQ and outlet staff are editing the same data through different UIs, not parallel systems
- Price override: exposed in HQ (per MVP scope), with a visual flag when an outlet's price diverges from master (the guardrail discussed earlier) — implement this as a simple "differs from master" badge next to any overridden price

### 9.4–9.12 (remaining screens)
- **Orders (all outlets):** filterable table, links into the same order detail data model
- **Customers:** central `Customer` record — order history query spans all outlets naturally since orders are already outlet-scoped, not customer-account-scoped separately
- **Staff:** CRUD on `StaffUser`, role + outlet assignment
- **Payments:** settlement view sourced from `Payment` records, reconciled against Billplz's own settlement reports
- **Reports:** time-series aggregates over `Order` timestamps — the granular per-transition timestamps (Section 1) are what make prep-time and ready-to-collection reporting possible without additional instrumentation later

---

## 10. Global Error States

| Scenario | Handling |
|---|---|
| Network failure mid-checkout | Preserve cart client-side; on reconnect, resume at the same checkout step, don't force restart |
| POS action fails to sync | Local queue + retry with backoff; visible "pending sync" indicator, never a silent failure |
| Order not found (deep link, stale notification) | Friendly "this order is no longer available" state, not a raw 404 |
| Duplicate webhook delivery | Idempotency key on `Payment.provider_ref`; second delivery is a no-op |
| Staff attempts an invalid state transition (e.g. tapping Ready twice) | Button disables immediately on tap (optimistic UI), server rejects duplicate transition silently rather than erroring visibly |

---

## 11. Permissions Matrix

| Action | Customer | Outlet Staff | Area Manager | HQ Admin |
|---|---|---|---|---|
| Place order | ✓ | — | — | — |
| View own outlet's queue | — | ✓ (own outlet only) | ✓ (assigned outlets) | ✓ (all) |
| Toggle item availability | — | ✓ (own outlet) | ✓ (assigned outlets) | ✓ (all) |
| Edit master menu / pricing | — | — | — | ✓ |
| View all-outlet reports | — | — | ✓ (assigned outlets only) | ✓ |
| Manage staff accounts | — | — | — | ✓ |
| Issue refund | — | — | ✓ (assigned outlets, with reason) | ✓ |

---

## Next Steps

This spec is built to be revised — flag any screen, flow, or data model decision you want to change, and I'll update the relevant section without needing to redo the whole document.
