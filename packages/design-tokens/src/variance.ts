/**
 * The "differs from master" color: HQ's price-variance badge on the Product
 * Detail matrix (dev spec Section 9.3, docs/hey-food-design-system-v1.md
 * Section 2's "Price Variance Color"). It marks an outlet whose price override
 * is not the master price, so HQ never loses track of price variance across
 * outlets.
 *
 * DELIBERATELY INDEPENDENT of `OUTLET_HEALTH_COLORS.warning` (and of brand
 * yellow, which is reserved for the single top call-to-action). Same principle
 * as `DANGER_COLORS` vs the Cancelled status color: the health "warning" says
 * "this outlet is having a problem right now", this token says "this price is
 * intentionally different". They are both amber-ish today; that is a
 * coincidence to leave alone, not a link to maintain. Nothing here imports or
 * references the health map, on purpose.
 *
 * Two roles, so a badge can be built the usual way:
 * - `solid` — the dark amber: text and border of the badge (and its icon).
 * - `tint` — the pale wash: the badge's background.
 *
 * Proposed values, not designer-confirmed — flag before treating as final, same
 * caveat as DANGER_COLORS and OUTLET_HEALTH_COLORS. `solid` on `tint` is about
 * 6.9:1 contrast.
 */
export const VARIANCE_COLORS = {
  solid: "#92400E",
  tint: "#FEF3C7",
} as const;

export type VarianceColorRole = keyof typeof VARIANCE_COLORS;
