# Hey Food — POS + Ordering System
## Product Blueprint V1

---

## 1. Product Vision

**What we're building:** A multi-outlet F&B ordering and operations platform for a single brand ("Hey Food") that operates stalls across multiple food courts/locations nationwide.

**The core loop:** A customer discovers the nearest Hey Food outlet via the mobile app, orders and pays remotely, the outlet's tablet POS receives and prepares the order, and the customer is notified via push when it's ready for collection — replacing the physical wireless pager entirely.

**What makes this different from a generic food-court app:** The customer relationship belongs to the *brand*, not the venue. One account, one order history, one loyalty balance — regardless of which of the brand's outlets a customer visits.

**Design philosophy:** One backend platform, three front-of-house experiences, each tuned to a different mental model:
- **Customer** thinks in terms of the **brand** ("I want Hey Food")
- **Staff** think in terms of the **outlet** ("I'm working at Hey Food — Paradigm Mall")
- **Owner/HQ** thinks in terms of the **business** ("How are all 27 outlets doing?")

---

## 2. User Types & Roles

| Role | Access | Typical device |
|---|---|---|
| **Customer** | Own account, own orders, own outlet menus | Personal Android/iOS phone |
| **Outlet Staff** | POS for their assigned outlet only; cannot see other outlets | Outlet's Android tablet |
| **Area/Outlet Manager** | Full visibility + control over one or several assigned outlets | Web dashboard, may also use POS |
| **HQ Admin** | Full visibility and control across all outlets, menu, staff, payments, reporting | Web dashboard |

---

## 3. System Architecture

Four components, one shared backend:

```
                    F&B BUSINESS (Hey Food)
                            |
              +-------------+-------------+
              |                           |
          HQ ADMIN                    OUTLETS
              |                           |
              |              +------------+------------+
              |              |            |             |
              |          Outlet A     Outlet B      Outlet C
              |              |            |             |
              |            POS          POS           POS
              |
              v
       CENTRAL BACKEND PLATFORM
              |
    +---------+---------+----------+
    |         |         |          |
  Orders   Payments  Location  Notifications
    |
    v
CUSTOMER APP
```

- **Product #1 — Customer App** (Android + iOS)
- **Product #2 — Outlet POS** (Android tablet, one per outlet)
- **Product #3 — HQ Admin** (web dashboard)
- **Product #4 — Backend Platform** (not user-facing; connects everything)

The backend exposes two internal services designed to be provider-agnostic from day one:

```
PaymentService
  ├── Billplz        (MVP)
  ├── Provider B      (future)
  └── Provider C      (future)

LocationService
  ├── GPS
  ├── Geofence
  ├── QR verification
  └── Outlet coordinates
```

Neither app talks to Billplz or GPS directly — both go through the backend's abstraction layer, so switching or adding a provider later doesn't require front-end rework.

---

## 4. Customer App

**Purpose:** Let a customer find their nearest Hey Food outlet, order, pay, and get notified when food is ready — with as little friction as possible.

**Key behavior:** Don't make the customer choose an outlet unless genuinely necessary.
- One outlet detected nearby → app goes straight to that outlet's menu, labelled clearly ("Hey Food — Paradigm Mall")
- Multiple outlets nearby → short list, closest first, with distance and status shown
- No outlet nearby → search / browse all outlets

**Screens (MVP, ~14):**

*Onboarding*
1. Splash
2. Login (phone + OTP or social)
3. Location permission prompt

*Ordering*
4. Home / nearest outlet
5. Outlet page (status, menu categories)
6. Menu (full grid, search)
7. Product detail (customization, quantity)
8. Cart
9. Checkout (outlet confirmation banner — "ordering from Hey Food, Paradigm Mall")
10. Payment (Billplz webview)
11. Order confirmation

*Order tracking*
12. Preparing status
13. Ready notification / live order status
14. Order history (active + past)

---

## 5. Outlet POS

**Purpose:** Let outlet staff process the order queue with minimal friction, in a busy, hands-dirty, high-noise physical environment.

**Design principle:** The POS home screen is not a dashboard — it's a queue. The staff's first and only question opening the app is *"what orders do I need to deal with?"*

**POS UX rules (designed for a working kitchen counter, not a quiet office):**
- Large touch targets — usable with imperfect finger accuracy, possibly gloved hands
- Minimal typing — tap-driven, not form-driven
- High visibility — readable from arm's length in bright food-court lighting
- Strong visual status per order (color-coded)
- Sound + vibration on new order and on any missed action
- No decorative animation — every motion should carry operational meaning
- Immediate feedback on every tap

**Home screen layout:**

```
+-------------------------------------------+
| HEY FOOD                                   |
| Paradigm Mall                    [ONLINE]  |
+-------------------------------------------+
| NEW: 3        PREPARING: 8      READY: 2   |
|                                             |
| [PM238]      [PM232]           [PM229]     |
| 3 items      2 items           4 items     |
| 12:42 PM     12:38 PM          12:31 PM    |
| [START]      [READY]           [COLLECT]   |
+-------------------------------------------+
```

**Screens (MVP, ~10):**
1. Login (staff PIN, device bound to its outlet)
2. Outlet assignment confirmation
3. Order queue (main screen)
4. New order detail
5. Order detail (expanded view)
6. Preparing state
7. Ready state / "Call customer" action
8. Completed / collected confirmation
9. Menu availability (sold-out toggles, this outlet only)
10. Daily summary (orders, sales, avg prep time)

---

## 6. HQ Admin

**Purpose:** Let the business owner/manager see and control the whole operation — performance, menu, staff, payments — without needing to visit any outlet.

**Design principle:** Built around outlets, not around abstract metrics first. The first click after login should answer "how are my outlets doing," then let the owner drill into any one of them and see exactly what that outlet's staff sees operationally.

**Home dashboard:**

```
TODAY
RM 28,420 total sales | 1,284 orders | RM 22.13 avg order | +12.4% vs yesterday

OUTLET PERFORMANCE
Paradigm Mall   RM 5,820
KSL City        RM 4,210
Mid Valley      RM 3,920
Southkey        RM 3,410
City Square     RM 2,840
```

Tapping an outlet opens that outlet's own operational view — live queue counts, avg prep time, cancellations, refunds — the HQ-level lens on the same data the outlet's own tablet shows.

**Outlet Health concept** (becomes valuable once there are many outlets):

```
OUTLET HEALTH
🟢 Paradigm Mall   Good
🟢 KSL City        Good
🟡 Mid Valley      High order volume
🔴 Southkey        POS offline
```

**Screens (MVP, ~12):**
1. Login (role-based: HQ Admin / Area Manager / Outlet Staff view)
2. Dashboard (all-outlets overview + outlet health)
3. Outlet list
4. Outlet detail (operational view)
5. Orders (all outlets, filterable)
6. Product / master menu
7. Product detail (with per-outlet availability & price override)
8. Staff (accounts, role, outlet assignment)
9. Customers (central database, order history, lifetime value)
10. Payments (Billplz settlement, reconciliation)
11. Reports (sales trends, outlet comparison, best-sellers, peak hours)
12. Settings (brand info, notification templates)

---

## 7. Order Lifecycle

The full state machine, shared across all three apps:

```
PAID → RECEIVED → PREPARING → READY → CUSTOMER NOTIFIED → COLLECTED → COMPLETED
```

| Status | Meaning | Triggered by |
|---|---|---|
| 🟡 Pending | Waiting for payment | Customer at checkout |
| 🔵 Paid | Payment successful | Payment provider webhook |
| 🟣 Received | Order has reached the outlet's POS | Backend sync to POS |
| 🟠 Preparing | Staff has started making the order | Staff taps "Start" |
| 🟢 Ready | Food ready for collection | Staff taps "Ready" / "Call customer" |
| — | Customer notified | Backend push (automatic, same moment as Ready) |
| ✓ Collected | Customer has picked up the order | Staff taps "Collect" |
| ✓ Completed | Order fully closed | Automatic on Collected |
| 🔴 Cancelled | Order cancelled | Staff or HQ action |

**Why `Received` and `Collected` matter as their own states** (not just cosmetic):
- `Received` separates "customer paid" from "outlet's tablet actually has it" — critical for diagnosing a stuck order when a tablet loses connection.
- `Collected` is what lets HQ flag "7 orders have been ready for more than 10 minutes" as an operational problem — a signal invisible if `Ready` and `Completed` are merged into one state.

---

## 8. Digital Pager / Notification System

Internal name: **Digital Queue** — reframing the feature as *"the customer's phone is the pager"* rather than *"we need to integrate a pager."*

**Notification copy at each stage:**

- **Order confirmed** — "#PM238 · Your order has been sent to Hey Food."
- **Preparing** — "#PM238 · Your food is being prepared."
- **Ready** — "#PM238 · Your order is ready! Please collect from Hey Food — Paradigm Mall."

**Reliability considerations** (push alone isn't always enough):
- Pair every push with a persistent in-app order-status screen, so a missed/delayed push isn't the only channel
- Add an SMS fallback for the "ready" alert specifically, since Billplz checkout already captures the customer's phone number
- Use both sound and vibration on the notification, since a locked phone in a pocket needs to be noticeably felt, not just silently displayed

---

## 9. Geofencing

**What it actually needs to answer:** not "is the customer inside Food Court A," but **"is the customer close enough to this specific Hey Food outlet to order from it?"**

**Two-layer approach:**
- **Primary — Location detection.** A ~100m geofence per outlet auto-suggests "Hey Food is available here" when the customer enters range.
- **Secondary — QR code.** Every outlet counter displays an "Order from Hey Food" QR code linking directly to that outlet's menu. This exists because indoor GPS is frequently unreliable (concrete floors, mall structures), and because it lets a walk-in customer skip location detection entirely.

Both feed the same `LocationService` abstraction in the backend — the app doesn't need to know or care which method resolved the outlet.

---

## 10. Payment Flow

The customer never communicates directly with sensitive payment credentials — everything passes through the backend.

```
CUSTOMER APP
     |
     v
YOUR BACKEND
     |
     v
PAYMENT PROVIDER (Billplz)
     |
     v
PAYMENT CONFIRMED (webhook)
     |
     v
YOUR BACKEND
     |
     +---> POS (order appears in queue)
     |
     +---> Customer App (order confirmation screen)
```

Billplz is the MVP provider, but the `PaymentService` abstraction means adding a second provider (FPX, Touch 'n Go, card) later is a backend addition, not a front-end rewrite.

---

## 11. Outlet Management

Each outlet, as a record in the system, holds:
- Name, address, geofence radius, GPS coordinates
- Operating hours
- Assigned POS tablet(s)
- Assigned staff
- Live order queue
- Menu availability overrides (see Section 12)
- Optional price overrides
- Daily/historical performance metrics

Outlets are added centrally by HQ — a new outlet is a data record, not a code change.

---

## 12. Menu Management

**Master menu**, defined once at brand level:

```
Chicken Rice      RM8.00
Fried Dumpling    RM6.00
Iced Tea          RM3.00
```

**Per-outlet override**, layered on top:

```
Outlet A: Chicken Rice — Available | Fried Dumpling — Available | Iced Tea — Available
Outlet B: Chicken Rice — Available | Fried Dumpling — SOLD OUT  | Iced Tea — Available
Outlet C: Chicken Rice — RM9.00    | Fried Dumpling — Available | Iced Tea — Available
```

This means the menu is managed once centrally, while each outlet retains day-to-day operational control (marking items sold out as ingredients run out mid-shift) without needing to duplicate the whole menu five times.

**MVP scope note:** ship the **availability toggle** (available/sold-out) in v1. Ship the **price override** as a backend capability now, but it can stay unexposed in the outlet-facing UI until there's a real business need to differentiate pricing by location — exposing it early risks HQ losing track of price variance across outlets.

---

## 13. Staff Permissions

```
HEY FOOD HQ
    |
    ├── HQ Admin        — sees and manages everything
    |
    ├── Area Manager     — sees/manages a defined set of outlets
    |     ├── Outlet A
    |     ├── Outlet B
    |     └── Outlet C
    |
    └── Outlet Staff     — POS access only, single outlet
          └── Outlet A
```

This becomes essential the moment the business grows past a handful of outlets and hiring a layer of area managers becomes necessary.

---

## 14. Reporting

**Per-outlet operational metrics** (visible to HQ, drill-down from the outlet list):
- Average preparation time (Preparing → Ready)
- Average ready-to-collection time (Ready → Collected)
- Orders today, sales today, cancellations, refunds

**Example — this is where the value compounds:**

| | Avg preparation | Avg ready-to-collection |
|---|---|---|
| Outlet A | 8m 42s | 2m 18s |
| Outlet B | 17m 31s | 8m 12s |

This tells HQ *"Outlet B is significantly slower"* — a much more actionable signal than sales totals alone, and one that's only possible because the order lifecycle (Section 7) tracks each transition as its own timestamped event.

**Brand-level reports:** sales trends over time, outlet-to-outlet comparison, best-selling items, peak hours by outlet.

---

## 15. MVP vs Phase 2

**Deliberately excluded from MVP** (not because they lack value — because they'd distract from proving the core loop first):

- ❌ Inventory management (beyond simple sold-out toggle)
- ❌ Accounting / bookkeeping integration
- ❌ Complex loyalty / points program
- ❌ Advanced AI (recommendations, demand forecasting)
- ❌ Kitchen display system hardware
- ❌ Physical pager hardware
- ❌ Marketplace functionality (other brands on the platform)
- ❌ Multi-brand support
- ❌ Complicated table/dine-in management

**What the MVP must prove, end to end:**

> Can a customer order remotely near an outlet → pay → have the outlet receive it → have staff prepare it → get notified when ready → and collect it?

If that loop works cleanly across all three apps, the foundation is proven and every excluded feature above becomes an additive Phase 2 decision rather than a rebuild.

---

## 16. Complete Screen List

**Customer App — 14 screens:** Splash, Login, Location permission, Home/nearest outlet, Outlet page, Menu, Product detail, Cart, Checkout, Payment, Order confirmation, Preparing status, Ready/order status, Order history

**Outlet POS — 10 screens:** Login, Outlet assignment, Order queue, New order detail, Order detail, Preparing, Ready, Completed, Menu availability, Daily summary

**HQ Admin — 12 screens:** Login, Dashboard, Outlet list, Outlet detail, Orders, Product/menu, Product detail, Staff, Customers, Payments, Reports, Settings

**Total: ~36 screens for MVP** — a manageable, well-scoped first release.

---

## 17. Detailed User Flows

**Customer ordering flow:**
```
Open app → Detect location → Find nearby Hey Food outlet → View menu →
Add to cart → Checkout → Pay → Order confirmed → Outlet receives order →
Preparing → Ready → Push notification → Customer collects → Order completed
```

**POS staff flow:**
```
Login → View order queue → New order arrives (sound + visual) → Tap "Start" →
Preparing → Tap "Ready" (triggers customer push) → Order sits in Ready column →
Customer arrives → Tap "Collect" → Order moves to Completed
```

**HQ oversight flow:**
```
Login → Dashboard (all-outlet snapshot + outlet health) → Notice an outlet flagged
(e.g., high order volume or POS offline) → Drill into that outlet's detail view →
Take action (contact outlet, adjust staffing, investigate) or view broader reports
```

---

## 18. Recommended Technical Architecture (high level)

- **Backend:** central API serving all three clients; owns the order state machine, `PaymentService`, and `LocationService` abstractions
- **Customer App:** Android + iOS (native or cross-platform), push notification support (FCM/APNs), SMS fallback integration
- **Outlet POS:** Android tablet app, designed for offline resilience — queues "mark ready"/"mark collected" actions locally and syncs when connectivity returns
- **HQ Admin:** web dashboard, role-based access control matching Section 13
- **Payment:** Billplz integration via `PaymentService`, webhook-driven status updates
- **Notifications:** push as primary channel, SMS as fallback for the "ready" alert specifically
- **Data model foundation:** Business → Outlet → POS → Staff → Orders, with a master menu layer and outlet-level override layer sitting above it

---

## Design System Direction (for Step 4, next)

Each app gets its own UX personality while sharing one underlying brand design system:

| App | Personality |
|---|---|
| Customer | Warm, friendly, food-focused |
| POS | Bold, extremely readable, operational |
| HQ Admin | Minimal, professional, data-focused |

**Shared status model** (used identically across all three apps):

| Status | Meaning |
|---|---|
| 🟡 Pending | Waiting for payment/action |
| 🔵 Paid | Payment successful |
| 🟣 Received | POS has received the order |
| 🟠 Preparing | Staff preparing |
| 🟢 Ready | Ready for collection |
| ✓ Collected / Completed | Customer collected |
| 🔴 Cancelled | Order cancelled |

---

## Proposed Sequence From Here

1. ✅ Product Architecture — this document
2. UX Sitemap — done in prior discussion, refined above (Section 16)
3. Core User Flows — done above (Section 17), can be expanded into detailed wireframe flow diagrams
4. Design System — colours, typography, components, icons, states
5. High-Fidelity UI — actual screen designs
6. Developer Specification — screen specs, component behavior, API/data requirements, edge cases, error states
