import { AppName } from "./typography";

/**
 * Minimum tap target size (px), per docs/hey-food-design-system-v1.md
 * Section 7 — larger on POS given its busier physical context (imprecise
 * tapping, possibly gloved hands).
 */
export const MIN_TAP_TARGET_PX: Record<AppName, number> = {
  customer: 44,
  hq: 44,
  pos: 48,
};
