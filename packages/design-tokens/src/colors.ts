/**
 * Brand colors, per docs/customer-app-screens-v2.md Section 1 — a
 * deliberate, confirmed pivot away from the original Ember/Char palette
 * (docs/hey-food-design-system-v1.md Section 1, docs/customer-app-screens-v1.md).
 * V1's palette is now historical; this is the current source of truth for
 * brand/UI chrome colors.
 *
 * Order-lifecycle status colors are UNCHANGED by this pivot and are NOT
 * defined here — see ./status.ts, which re-exports shared-types'
 * ORDER_STATUS_META untouched, since POS and HQ also depend on it and
 * this pivot is scoped to Customer App brand/UI chrome only.
 *
 * Note: docs/customer-app-screens-v2.md Section 3 also mentions outlet
 * open/closed status rendering as `teal` (replacing the green in
 * ./outlet-status.ts's OUTLET_STATUS_COLORS) — that's a separate file,
 * intentionally not touched in this pass; it belongs with the "Your
 * outlet" card restyle, not this token-mapping step.
 */
export const BRAND_COLORS = {
  /** Primary text. Replaces `char900`. */
  ink: "#20252B",
  /** Secondary text. Replaces `char500`. */
  muted: "#7B817F",
  /** Page background. Replaces `white`'s former base-background role. */
  cream: "#FBF8F1",
  /** Card surfaces. */
  white: "#FFFFFF",
  /** Dark surfaces — hero card, avatar, cart drawer, bottom nav active accents. New role, no V1 equivalent. */
  navy: "#202B3C",
  /** Primary action color — add buttons, checkout button, active nav icon, link-style buttons. Replaces `ember500`. */
  teal: "#1F8A82",
  /**
   * Pressed/active state for `teal` buttons (~12% darker) — replaces the
   * role V1's `ember600` played. Not in docs/customer-app-screens-v2.md's
   * Section 1 table; added per explicit instruction as a low-stakes
   * utility shade, not a primary palette decision.
   */
  tealDark: "#186F68",
  /**
   * High-emphasis CTA highlight only — the hero button, the persistent
   * cart bar's button. New role, no V1 equivalent. Reserved for the
   * single highest-emphasis action per screen; don't use for ordinary
   * buttons (that's `teal`) or it loses its emphasis value.
   */
  yellow: "#F5C451",
  /** Secondary warm accent — gradients on placeholder photo tiles. New role, no V1 equivalent. */
  peach: "#F3A27E",
  /** Borders, dividers. Replaces the V1 neutral border color. */
  line: "#EBE7DF",
  /** Subtle card backgrounds. Replaces `neutral100`/`emberTint`. */
  soft: "#F2EEE5",
  /**
   * Muted light color for supporting copy against a `navy` background
   * (the Home hero card). docs/customer-app-screens-v2.md Section 3.3:
   * "supporting copy (#dce1e4-equivalent — a muted light color against
   * navy)".
   */
  onNavyMuted: "#DCE1E4",
} as const;

export type BrandColorToken = keyof typeof BRAND_COLORS;
