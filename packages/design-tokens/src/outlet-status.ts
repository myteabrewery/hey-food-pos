/**
 * Outlet operating-status colors — a distinct domain from `BRAND_COLORS`
 * (raw brand palette) and the order-lifecycle `ORDER_STATUS_META`
 * (re-exported from shared-types in ./status.ts). Outlet open/closed is
 * neither of those: docs/customer-app-screens-v1.md renders the closed
 * state via reduced opacity on the open styling, not a separate color, so
 * only "open" needs one today.
 */
export const OUTLET_STATUS_COLORS = {
  open: "#059669",
} as const;
