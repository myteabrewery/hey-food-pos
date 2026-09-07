import { AppName } from "./typography";

/** 4px base unit spacing scale, per docs/hey-food-design-system-v1.md Section 4. */
export const SPACING_SCALE: readonly number[] = [4, 8, 12, 16, 24, 32, 48, 64];

export interface AppSpacingGuidance {
  approach: string;
}

export const SPACING_BY_APP: Record<AppName, AppSpacingGuidance> = {
  customer: {
    approach: "Generous spacing (16–24px between elements) — feels unhurried, appetizing.",
  },
  pos: {
    approach:
      "Tighter spacing between queue cards (8–12px) to maximize visible orders on screen, but generous internal padding on tap targets (16px+) so fingers don't miscount.",
  },
  hq: {
    approach: "Tightest spacing (8px) to support data density in tables and dashboards.",
  },
};
