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
