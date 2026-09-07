# Hey Food — Design System V1

One visual language, three personalities. All tokens below are shared across Customer App, Outlet POS, and HQ Admin — differences between apps come from emphasis, scale, and density, not from separate palettes or component sets.

---

## 1. Brand Colors

| Token | Hex | Usage |
|---|---|---|
| Ember 600 | `#EA580C` | Pressed/active state of primary actions |
| Ember 500 | `#F97316` | Primary brand color — CTAs, active nav, logo mark |
| Char 900 | `#1C1917` | Primary text, POS high-emphasis numbers |
| Char 500 | `#57534E` | Secondary text |
| Neutral 100 | `#F5F5F4` | Card backgrounds, subtle surfaces |
| White | `#FFFFFF` | Base background |

Ember was chosen deliberately: warm, appetite-associated, distinct from the blue/green palettes most food-delivery apps default to (Grab, foodpanda) — helps Hey Food read as its own brand rather than "another delivery app."

---

## 2. Status Colors (shared everywhere — customer app, POS, HQ)

| Status | Background | Text | Meaning |
|---|---|---|---|
| 🟡 Pending | `#FEF3C7` | `#92400E` | Waiting for payment |
| 🔵 Paid | `#DBEAFE` | `#1E40AF` | Payment successful |
| 🟣 Received | `#EDE9FE` | `#5B21B6` | POS has received the order |
| 🟠 Preparing | `#FFEDD5` | `#9A3412` | Staff preparing |
| 🟢 Ready | `#D1FAE5` | `#065F46` | Ready for collection |
| ⚪ Completed | `#E7E5E4` | `#44403C` | Collected, order closed |
| 🔴 Cancelled | `#FEE2E2` | `#991B1B` | Order cancelled |

A status always renders with the same colors regardless of which app displays it — a customer seeing "Preparing" and staff seeing "Preparing" on the POS should look like the same status, not two different design decisions.

---

## 3. Typography

**Single family: Inter** (or system font stack as fallback), used everywhere. Emphasis differs by app:

| App | Approach |
|---|---|
| **Customer** | Friendly weight range (400–600), comfortable line height, larger imagery-adjacent text (product names, prices) |
| **POS** | Bold weights (600–800), oversized numbers for order IDs and item counts — must be legible from arm's length in bright, busy lighting |
| **HQ Admin** | Compact, data-dense — smaller base size, more information per screen, weight used to establish hierarchy rather than size |

| Scale token | Size | Typical use |
|---|---|---|
| `display` | 28–32px | POS order ID, HQ hero metric |
| `heading` | 20–22px | Screen titles, product names |
| `body` | 14–15px | Standard text |
| `caption` | 12px | Labels, timestamps, metadata |

---

## 4. Spacing Scale

4px base unit: `4, 8, 12, 16, 24, 32, 48, 64`

- Customer app: generous spacing (16–24px between elements) — feels unhurried, appetizing
- POS: tighter spacing between queue cards (8–12px) to maximize visible orders on screen, but generous internal padding on tap targets (16px+) so fingers don't miscount
- HQ: tightest spacing (8px) to support data density in tables and dashboards

---

## 5. Corner Radius

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 8px | Badges, small buttons, POS queue cards (utilitarian feel) |
| `radius-md` | 12px | Standard cards, buttons |
| `radius-lg` | 20px | Customer app hero cards, modals (softer, friendlier feel) |

POS deliberately uses smaller radii than Customer — reinforces the "operational tool" feel vs. the "consumer app" feel, without introducing a different color or font system.

---

## 6. Core Components

### Buttons
- **Primary** — Ember 500 fill, white text, `radius-md`. Used for the single most important action per screen (Order Now, Pay, Start Preparing, Call Customer).
- **Secondary** — transparent fill, Ember 500 border and text. Used for lower-priority actions (View Menu, Cancel, Edit).
- **Destructive** — red fill or border, used only for cancel/refund actions, always requires a confirmation step.
- POS buttons are sized larger (min 48px height) than Customer/HQ buttons to account for imprecise tapping in a busy environment.

### Order Card
The single most reused component across POS and HQ — same visual structure, different density:
- Order ID (bold, prominent)
- Item count / summary
- Timestamp
- Status badge
- Primary action button relevant to current state (Start / Ready / Collect)

### Status Badge
Pill-shaped, uses the Section 2 color table exactly. Never appears without its paired text label — color alone is never the only signal (accessibility).

### Product Card (Customer app only)
Image, name, price, quick-add button. Larger imagery emphasis than any other card type in the system — this is the one place the design system leans fully into "friendly/appetizing."

### Tabs
Used for order status filtering (New / Preparing / Ready) on POS, and category browsing on Customer app. Active tab always uses Ember 500 underline or fill.

### Top Navigation
- Customer: outlet name + location pin, minimal
- POS: outlet name + online/offline indicator, always visible
- HQ: breadcrumb-style (Dashboard > Outlet > Detail), supports the drill-down navigation pattern

### Bottom Navigation (Customer app only)
Home, Orders, Rewards, Profile — POS and HQ use top-level navigation instead, since they're used on larger tablet/desktop screens where bottom nav isn't the natural pattern.

### Quantity Stepper
Customer app only — used in product detail and cart. Large tap targets, immediate visual feedback on change.

### Payment Component
Embedded webview for Billplz checkout, wrapped in Hey Food's own header/footer so the transition doesn't feel jarring even though payment itself is hosted externally.

### Notifications / Toasts
- POS: full-width banner + sound + vibration for new orders — impossible to miss
- Customer: standard push notification + in-app banner on the order status screen
- HQ: subtle toast for background events (e.g., "Southkey POS back online")

### Modals
Used sparingly — primarily for destructive action confirmation (cancel order, refund) and for the outlet-selection list when multiple outlets are nearby.

---

## 7. Accessibility Notes

- Status is always color + text + icon together, never color alone
- Minimum tap target size: 44×44px (Customer/HQ), 48×48px (POS, given the busier physical context)
- Text contrast meets WCAG AA minimum across all three apps, including on Ember 500 backgrounds (verify white text at 500 weight or heavier for small sizes)

---

## Next Step

With tokens and components locked, we can move to **Step 5 — High-Fidelity UI**: actual screen designs for the Customer App, POS, and HQ Admin, built directly against this system rather than improvised per screen.
