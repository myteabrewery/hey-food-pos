/**
 * The system's "danger" red — for destructive actions (Cancel order, and
 * later refund), documented in docs/hey-food-design-system-v1.md Section 2's
 * "Danger Color" entry and Section 6's Destructive button rule ("red fill or
 * border ... always requires a confirmation step").
 *
 * DELIBERATELY INDEPENDENT of `ORDER_STATUS_META[OrderStatus.Cancelled]`.
 * Today the two use the same hex values, but they mean different things:
 * the Cancelled status color says "this order IS cancelled" (a badge), this
 * token says "this action is destructive" (a button). Nothing here imports
 * or references the status map, on purpose — if the status palette is ever
 * revised, or this red is nudged for button contrast, the other must not
 * change with it. That the values currently agree is a coincidence to leave
 * alone, not a link to maintain.
 *
 * Two roles, same red family, so a destructive control can be built either
 * of the design system's two ways (Section 6: "red fill or border"):
 * - `solid` — the strong red: the fill of a confirm-destructive button
 *   (white text on it), plus borders/dots/accents and text sitting on
 *   `tint`.
 * - `tint` — the pale wash: the background of a low-emphasis (Secondary-
 *   style) destructive button, and a selected row inside a destructive
 *   dialog.
 *
 * Proposed values, not designer-confirmed — flag before treating as final,
 * same caveat as OUTLET_HEALTH_COLORS.
 */
export const DANGER_COLORS = {
  solid: "#991B1B",
  tint: "#FEE2E2",
} as const;

export type DangerColorRole = keyof typeof DANGER_COLORS;
