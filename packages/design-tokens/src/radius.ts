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
} as const;

export type RadiusToken = keyof typeof RADIUS;
