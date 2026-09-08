/**
 * Typography, per docs/hey-food-design-system-v1.md Section 3.
 *
 * Single family used everywhere — differences between apps are weight
 * range and density, not font choice.
 */
export const FONT_FAMILY = "Inter" as const;
export const FONT_FAMILY_FALLBACK =
  "-apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif" as const;

export type AppName = "customer" | "pos" | "hq";

export type TypeScaleName = "display" | "heading" | "body" | "caption";

/**
 * Font size scale, resolved to a single px value per (scale × app) pair.
 *
 * The design system gives each scale token as a range shared across
 * different usage contexts (e.g. `display`: "28–32px... POS order ID, HQ
 * hero metric") without saying which end of the range applies where —
 * these are the resolved values.
 */
export const TYPE_SCALE: Record<TypeScaleName, Record<AppName, number>> = {
  display: { customer: 28, pos: 32, hq: 28 },
  heading: { customer: 22, pos: 20, hq: 20 },
  body: { customer: 15, pos: 15, hq: 14 },
  caption: { customer: 12, pos: 12, hq: 12 },
};

export interface AppTypographyGuidance {
  weightRange: [number, number];
  approach: string;
}

/**
 * Font sizes from specific Menu screen mockup elements that don't fit the
 * display/heading/body/caption scale above (docs/customer-app-screens-v1.md).
 * Each screen's own header/label sizes turned out to be close-but-distinct
 * values in the mockups rather than sharing one scale step — e.g. this
 * screen's "ORDERING FROM" label is 11px vs. Checkout's 12px, and this
 * screen's outlet-name is 16px vs. Order Status's 17px — so these are
 * named by concrete usage instead of forcing a shared abstraction the
 * source mockups don't actually have.
 */
export const MENU_HEADER_LABEL_PX = 11;
export const MENU_HEADER_TITLE_PX = 16;
export const MENU_ITEM_TITLE_PX = 14;

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
    weightRange: [400, 700],
    approach:
      "Compact, data-dense — smaller base size, more information per screen, weight used to establish hierarchy rather than size.",
  },
};
