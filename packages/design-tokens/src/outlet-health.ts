import { BRAND_COLORS } from "./colors";

/**
 * HQ Admin's 3-state outlet health indicator — docs/hey-food-developer-
 * spec-v1.md Section 9.1 (🔴 POS offline/stuck order, 🟡 elevated order
 * volume or prep time, 🟢 everything else), documented alongside
 * ORDER_STATUS_META in docs/hey-food-design-system-v1.md Section 2's
 * "Outlet Health Colors" table. A real, permanent 3-state status system
 * — same treatment as order-lifecycle colors, not a one-off — so every
 * value here is its own first-class token, not borrowed from another
 * domain's color:
 *
 * - `good` reuses `BRAND_COLORS.teal`, already the system's positive/
 *   accent color everywhere else.
 * - `warning` is a genuinely new value, `#D97706` — NOT `BRAND_COLORS.
 *   yellow` (`#F5C451`). Brand yellow is documented as reserved for "the
 *   single highest-emphasis CTA per screen"; reusing it here would be a
 *   real conflict (two different meanings competing for one color), not
 *   just a style nitpick, and the two hexes need to read as visually
 *   distinct on top of that — `#D97706` is a deeper, more saturated
 *   amber specifically so it can't be mistaken for the softer brand
 *   yellow at a glance.
 * - `critical` is also new, `#DC2626` — `BRAND_COLORS` has no red at
 *   all (V1's Ember/Char palette didn't either).
 *
 * `warning` and `critical` are proposed values, not designer-confirmed —
 * flag both before treating them as final.
 */
export const OUTLET_HEALTH_COLORS = {
  good: BRAND_COLORS.teal,
  warning: "#D97706",
  critical: "#DC2626",
} as const;

export type OutletHealthStatus = keyof typeof OUTLET_HEALTH_COLORS;
