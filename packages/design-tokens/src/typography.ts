/**
 * Typography, per docs/hey-food-design-system-v1.md Section 3.
 *
 * Single family used everywhere — differences between apps are weight
 * range and density, not font choice.
 */
export const FONT_FAMILY = "Inter" as const;
export const FONT_FAMILY_FALLBACK =
  "-apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif" as const;

export type TypeScaleName = "display" | "heading" | "body" | "caption";

export interface TypeScaleToken {
  minPx: number;
  maxPx: number;
}

/** Font size scale — given as ranges in the design system, not fixed values. */
export const TYPE_SCALE: Record<TypeScaleName, TypeScaleToken> = {
  display: { minPx: 28, maxPx: 32 },
  heading: { minPx: 20, maxPx: 22 },
  body: { minPx: 14, maxPx: 15 },
  caption: { minPx: 12, maxPx: 12 },
};

export type AppName = "customer" | "pos" | "hq";

export interface AppTypographyGuidance {
  /** Only given where the design system specifies a numeric range. */
  weightRange?: [number, number];
  approach: string;
}

export const TYPOGRAPHY_BY_APP: Record<AppName, AppTypographyGuidance> = {
  customer: {
    weightRange: [400, 600],
    approach:
      "Friendly weight range, comfortable line height, larger imagery-adjacent text (product names, prices).",
  },
  pos: {
    weightRange: [600, 800],
    approach:
      "Bold weights, oversized numbers for order IDs and item counts — must be legible from arm's length in bright, busy lighting.",
  },
  hq: {
    approach:
      "Compact, data-dense — smaller base size, more information per screen, weight used to establish hierarchy rather than size.",
  },
};
