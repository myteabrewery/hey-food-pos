# Customer App — Screen Specs V2
## Supersedes V1 — pivot to new palette + tab-based IA

This is a deliberate, confirmed pivot away from V1's Ember palette and screen-by-screen stack navigation, based on a reference mockup the user selected. It changes the color system, the navigation model, and how several screens are composed. Treat V1's content as historical — this document is the current source of truth.

---

## 1. New Brand Palette (replaces all V1 Ember/Char tokens)

| Token | Hex | Replaces (V1) | Usage |
|---|---|---|---|
| `ink` | `#20252B` | `char900` | Primary text |
| `muted` | `#7B817F` | `char500` | Secondary text |
| `cream` | `#FBF8F1` | `white` (base bg) | Page background |
| `white` | `#FFFFFF` | — | Card surfaces |
| `navy` | `#202B3C` | *(new role)* | Dark surfaces: hero card, avatar, cart drawer, bottom nav active accents |
| `teal` | `#1F8A82` | `ember500` (primary action) | Primary action color: add buttons, checkout button, active nav icon, link-style buttons |
| `yellow` | `#F5C451` | *(new role)* | High-emphasis CTA highlight: hero button, cart bar button — used sparingly, not as the general primary color |
| `peach` | `#F3A27E` | *(new role)* | Secondary warm accent, gradients on placeholder photo tiles |
| `line` | `#EBE7DF` | `neutral border` | Borders, dividers |
| `soft` | `#F2EEE5` | `neutral100`/`emberTint` | Subtle card backgrounds |

**Status colors (order lifecycle) are UNCHANGED** — `ORDER_STATUS_META` stays exactly as defined in the original design system doc. This palette pivot is about brand/UI chrome, not the order-status system, which must stay stable since POS and HQ also depend on it.

**Role clarification — teal vs. yellow:** teal is the default primary action color (used most places: add-to-cart buttons, checkout button, active states). Yellow is reserved for the single highest-emphasis call to action per screen (the hero's "Explore menu" button, the persistent cart bar's "View cart" button) — don't use yellow for ordinary buttons or it loses its emphasis value.

---

## 2. Navigation Model — Bottom Tabs (replaces V1's push-stack flow)

Five tabs: **Home · Menu · Cart · Rewards · Account**

- Implement via Expo Router's tab navigator (`expo-router` supports this natively via a `(tabs)` group — no new navigation library needed, consistent with the Expo Router decision already made)
- **Rewards and Account are stubs for this pass** — present in the tab bar (matching the reference), but their screens can be a simple placeholder. Rewards in particular stays out of real scope per the blueprint's MVP exclusion list (no complex loyalty system) — the tab existing is fine, its content isn't being built yet.
- **Cart is NOT primarily a tab destination** — in the reference, the Cart tab button and the persistent cart bar both open the same modal bottom sheet, rather than navigating to a separate screen. Treat "Cart" as a modal overlay reachable from multiple places (tab, persistent bar), not a routed page.

---

## 3. Home Screen — now a single scrolling composite (replaces V1's single-purpose Home)

Sections, top to bottom:

1. **Top bar:** logo wordmark ("HEY FOOD", with "FOOD" in `teal`) + circular avatar (initial, `navy` background, white text)
2. **Location line:** small text, `muted`, with the outlet name/area in `ink`
3. **Hero card:** `navy` background, radius 26px, large decorative emoji at low opacity in the corner. Contains an eyebrow label (`yellow`, bold), a short headline (white, large/tight leading), supporting copy (`#dce1e4`-equivalent — a muted light color against navy), and the `yellow`-filled primary button
4. **Categories row:** horizontally scrolling pills/cards, active category uses `teal` fill + white text, inactive uses white card + `line` border — same four+ categories concept as V1, styling updated
5. **"Your outlet" card:** white card, `line` border, shows outlet photo placeholder, name, open/closed status (`teal` when open), address, prep-time estimate — this is V1's outlet hero card content, restyled and demoted from full-hero treatment to a standard section card, since the new hero slot is now taken by the marketing/eyebrow hero
6. **"Popular right now" — menu preview:** a short subset of menu items (not the full menu — full menu lives on the Menu tab), same item-row visual treatment as the Menu screen, with a "See all" link (`teal`, links to Menu tab)
7. **"Order in progress" — conditional section:** only rendered when the customer has an active order. Shows order ID, outlet, status badge, a progress bar, and a 5-step tracker (Paid → Received → Preparing → Ready → Collected — note this is 5 steps here, not V1 Order Status screen's 3-step Paid/Preparing/Ready — reconcile by using the full lifecycle from dev spec §3, condensed visually). Tapping this section can still navigate to a fuller Order Status detail if useful, but the inline summary is the primary at-a-glance surface now.

---

## 4. Menu Screen

Content stays the same as V1 (search, category pills, item rows, sold-out treatment) — **only the color tokens change** per Section 1's mapping. This screen remains its own tab destination, unlike Cart/Checkout.

---

## 5. Cart — modal bottom sheet (replaces V1's dedicated Checkout screen as the primary entry point)

- **Persistent cart bar:** fixed above the bottom tab bar, `navy` background, appears only when cart is non-empty. Shows item count + running total on the left, a `yellow` "View cart →" button on the right.
- **Cart modal:** bottom sheet overlay, `cream` background, rounded top corners, drag handle indicator. Lists line items (name × qty, price), a total row, and a `teal`-filled "Continue to payment" button showing the total inline.
- **The mandatory outlet-confirmation banner from V1 is NOT optional and must still appear inside this cart sheet** — this requirement doesn't change just because the container changed from a full screen to a modal. Don't drop it in the restyle.
- "Continue to payment" is where V1's Checkout screen's actual payment-submission responsibility now lives — the cart sheet **is** effectively the checkout step, not a separate screen after it. A real payment screen/webview (Billplz) still follows as its own step when that gets built — this sheet ends at order submission, same as V1's Checkout scope did.

---

## 6. Toasts

Brief bottom-anchored (or top-anchored, per reference) confirmation messages for actions like "item added", used instead of/alongside more intrusive feedback. Style: `navy` background, white text, rounded, auto-dismiss.

---

## Migration notes for existing code

- **Home and Menu screens already exist and need real restructuring, not just a color swap** — Home in particular changes shape substantially (single-purpose outlet-detection screen → multi-section scrolling composite).
- **Navigation changes from a stack (Home → Menu push) to tabs** — this replaces the Expo Router stack setup done previously with a tab group. This is a second navigation change in a short span; treat it as the settled model going forward, not another temporary step.
- **Cart state (built for the in-progress Checkout screen) carries over directly** — the cart logic/store built in the previous pass is still correct; only its UI presentation (dedicated screen → modal sheet) changes.
- **The order-progress step count discrepancy (3 vs 5 steps) should resolve to the full lifecycle** (Paid → Received → Preparing → Ready → Collected) per dev spec §3, since that's the actual source of truth for order states — the reference mockup's 5-step tracker is the more spec-accurate version to keep, not a deviation to flag.
