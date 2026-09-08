/**
 * Corner radius, per docs/hey-food-design-system-v1.md Section 5.
 *
 * POS deliberately uses smaller radii than Customer — reinforces the
 * "operational tool" feel vs. the "consumer app" feel, without introducing
 * a different color or font system.
 */
export const RADIUS = {
  /** Badges, small buttons, POS queue cards (utilitarian feel). */
  sm: 8,
  /** Standard cards, buttons. */
  md: 12,
  /** Customer app hero cards, modals (softer, friendlier feel). */
  lg: 20,
  /**
   * 14px — doesn't fit the sm/md/lg scale above (sits between md and lg).
   * Recurs across two different element types: Menu's 64×64 item image
   * container and Checkout's outlet confirmation banner
   * (docs/customer-app-screens-v1.md) — named by the shared radius value's
   * role ("a slightly-more-rounded compact container") rather than either
   * element specifically, since it's clearly not just an image-container
   * value.
   */
  compact: 14,
  /**
   * Fully rounded pills — Menu screen category filter chips.
   * docs/customer-app-screens-v1.md specifies "999px", the standard CSS
   * idiom for "always render as a full pill regardless of height."
   */
  pill: 999,
} as const;

export type RadiusToken = keyof typeof RADIUS;
