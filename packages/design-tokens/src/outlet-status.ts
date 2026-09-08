import { BRAND_COLORS } from "./colors";

/**
 * Outlet operating-status colors — a distinct domain from `BRAND_COLORS`
 * (raw brand palette) and the order-lifecycle `ORDER_STATUS_META`
 * (re-exported from shared-types in ./status.ts). Outlet open/closed is
 * neither of those: docs/customer-app-screens-v1.md renders the closed
 * state via reduced opacity on the open styling, not a separate color, so
 * only "open" needs one today.
 *
 * Was its own green (#059669) under the V1 palette. docs/customer-app-
 * screens-v2.md Section 3.5 says the "Your outlet" card should show open
 * status in `teal` — deferred through the palette-migration pass to this
 * Home-restructuring pass, and applied now. Referenced from BRAND_COLORS
 * rather than duplicating the hex, so it can't drift if `teal` changes.
 */
export const OUTLET_STATUS_COLORS = {
  open: BRAND_COLORS.teal,
} as const;
