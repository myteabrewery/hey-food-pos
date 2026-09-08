/** 4px base unit spacing scale, per docs/hey-food-design-system-v1.md Section 4. */
export const SPACING_SCALE: readonly number[] = [4, 8, 12, 16, 24, 32, 48, 64];

/** Generous spacing — feels unhurried, appetizing. */
export interface CustomerSpacing {
  elementGapPx: number;
  cardPaddingPx: number;
}

/**
 * Tighter spacing between queue cards to maximize visible orders on
 * screen, but generous internal padding on tap targets so fingers don't
 * miscount.
 */
export interface PosSpacing {
  queueCardGapPx: number;
  tapPaddingPx: number;
}

/** Tightest spacing — supports data density in tables and dashboards. */
export interface HqSpacing {
  elementGapPx: number;
  tablePaddingPx: number;
}

export interface SpacingByApp {
  customer: CustomerSpacing;
  pos: PosSpacing;
  hq: HqSpacing;
}

/** Per-app spacing, per docs/hey-food-design-system-v1.md Section 4. */
export const SPACING_BY_APP: SpacingByApp = {
  customer: { elementGapPx: 24, cardPaddingPx: 16 },
  pos: { queueCardGapPx: 8, tapPaddingPx: 16 },
  hq: { elementGapPx: 8, tablePaddingPx: 8 },
};

/**
 * Exact padding from the Menu screen search bar mockup
 * (docs/customer-app-screens-v1.md: "padding 10px/14px"). Flagged rather
 * than silently rounded: 10 and 14 are not members of the 4px-base
 * SPACING_SCALE above (design-system-v1.md Section 4 documents strictly
 * 4/8/12/16/24/32/48/64) — the high-fidelity mockup deviates from that
 * scale for this one element, and this reproduces it exactly rather than
 * picking the nearest scale step.
 */
export const SEARCH_BAR_PADDING = {
  verticalPx: 10,
  horizontalPx: 14,
} as const;

/**
 * Padding for a padded, subtly-backgrounded rounded info block — the
 * Checkout outlet confirmation banner and totals block both specify
 * "padding 12px/14px" identically (docs/customer-app-screens-v1.md).
 * Genuine shared role (not just a numeric coincidence, unlike some other
 * additions in this file), so one token covers both. 12 is on the base
 * SPACING_SCALE; 14 isn't, same deviation as SEARCH_BAR_PADDING above.
 */
export const INFO_CARD_PADDING = {
  verticalPx: 12,
  horizontalPx: 14,
} as const;

/**
 * Vertical padding for a large full-width CTA button — Checkout's Pay
 * button specifies "padding 14px" (docs/customer-app-screens-v1.md).
 * Named generically rather than "PAY_BUTTON_..." in case another screen's
 * primary button turns out to share it, but not yet confirmed to recur.
 */
export const LARGE_BUTTON_PADDING_VERTICAL_PX = 14;
