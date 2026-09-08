# Customer App — Screen Specs V1

Exact values from the high-fidelity mockups designed in the product design phase. This file exists so screen implementation doesn't have to be reconstructed from prose — these are the literal values used.

---

## Home Screen

**Layout:** single scrollable column, max-width card container (mobile-native equivalent: full-width with standard screen padding)

**Header:**
- "Hey Food" — 20px, weight 700, color `#1C1917`
- Profile icon button, top right, 32×32px circle, background `#F5F5F4`

**Nearest outlet hero card:**
- Background: `#FFEDD5` (NOT solid Ember 500 — this is a light tint)
- Border radius: 20px (`radius-lg` per design-tokens)
- Padding: 16px
- "YOU'RE NEAR" label: 12px, weight 600, color `#9A3412`, with a map-pin icon in `#EA580C`
- Outlet name: 18px, weight 700, color `#1C1917`
- Address/subtitle: 13px, color `#57534E`
- Status row: 6px dot in `#059669` (open) + "Open · 10-15 min" text, 12px, weight 600, color `#059669`
- **"Order Now" button:** full width, background `#F97316` (solid Ember 500), text color `#FFFFFF`, weight 700, 15px, border radius 12px, padding 12px vertical
  - This is the ONE place solid Ember fill + white text appears on this screen — the card behind it is the light tint `#FFEDD5`, not solid Ember, so there is no button/background collision. Do not invert this button's colors.

**Closed outlet state:** same card structure, reduced opacity (~50%) on the whole card, "Order Now" button disabled. Do not introduce a separate closed-state color — this matches the same greyed-out treatment used for sold-out menu items.

**"What are you craving?" category shortcuts:**
- Label: 12px, weight 600, letter-spacing 0.04em, color `#78716C`
- 4-column grid, each item: 48×48px circle, background `#F5F5F4`, emoji centered, label below at 11px color `#57534E`
- Categories are presentational only in V1 — no navigation/filtering wired yet, no defined taxonomy beyond the four shown (Rice, Noodles, Chicken, Drinks)

**Other nearby outlets:**
- Label: 12px, weight 600, color `#78716C`
- Row per outlet: name (13px weight 600 `#1C1917`) + distance (11px `#A8A29E`), chevron-right icon `#A8A29E`
- V1 note: only ONE nearest outlet gets the full hero card treatment; additional outlets (if any) appear only in this simple list, not as additional hero cards

---

## Menu Screen

**Header:** "ORDERING FROM" label (11px `#A8A29E`) + outlet name (16px weight 700 `#1C1917`)

**Search bar:** background `#F5F5F4`, radius 12px, padding 10px/14px, search icon `#A8A29E`

**Category pills:** active pill — background `#F97316`, white text; inactive — background `#F5F5F4`, text `#57534E`. 12px, weight 600, radius 999px (full pill)

**Menu item row:**
- 64×64px image/icon container, radius 14px, background `#FFEDD5` (available) or `#F5F5F4` at 50% opacity (sold out)
- Name: 14px weight 600 `#1C1917`
- Description: 12px `#A8A29E`
- Price: 14px weight 700 `#1C1917`
- Add button: 28×28px, radius 8px, background `#F97316`, white "+"
- **Sold out:** entire row at 50% opacity, description replaced with "Sold out today", no add button rendered at all (not just disabled)

---

## Checkout Screen

**Outlet confirmation banner (mandatory, never omit):**
- Background `#FFEDD5`, radius 14px, padding 12px/14px
- Map-pin icon `#EA580C`
- "ORDERING FROM" label 12px weight 700 `#9A3412`
- Outlet name + level, 13px weight 600 `#1C1917`

**Line items:** name 13px weight 600 `#1C1917`, modifier note 11px `#A8A29E`, price 13px weight 600 `#1C1917`, divider `#F5F5F4`

**Totals block:** background `#F5F5F4`, radius 12px, padding 12px/14px. Subtotal/fees at 13px `#57534E`; total row at 15px weight 700 `#1C1917`, separated by a `#E7E5E4` divider

**Pay button:** full width, `#F97316` fill, white text, weight 700, 15px, radius 12px, padding 14px

---

## Order Status Screen

**Header row:** order ID 13px `#A8A29E` + status pill (background/text from `ORDER_STATUS_META`)

**Outlet name/address:** 17px weight 700 `#1C1917` / 13px `#A8A29E`

**Stepper (Paid → Preparing → Ready):**
- Completed step: 32px circle, background `#059669`, white checkmark icon
- Active step: 32px circle, background `#F97316`, white icon (flame for preparing)
- Upcoming step: 32px circle, background `#F5F5F4`, border 1.5px `#E7E5E4`, icon `#A8A29E`
- Connecting line: 3px height, `#059669` for completed segments, `#E7E5E4` for upcoming
- Label below each: 10px, `#1C1917` weight 600 for current step, `#78716C`/`#A8A29E` otherwise

**Order summary block:** same visual treatment as Checkout's totals block

**Footer copy:** "We'll notify you the moment it's ready for collection" — 12px `#A8A29E`, centered

---

## Shared notes across all screens

- Font family: Inter (or system fallback) everywhere — no per-screen font swaps
- No hardcoded hex values in component code — every color above should resolve through `design-tokens`, adding any token that's referenced here but doesn't yet exist in the package (e.g. the specific `#FFEDD5` outlet-card-tint may need its own named token rather than being an inline value, since it recurs across Home, Menu-item-available, and Checkout banner)
