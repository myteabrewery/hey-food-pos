import type { StaffRole } from "@hey-food/shared-types";

export const ROLE_LABELS: Record<StaffRole, string> = {
  hq_admin: "HQ Admin",
  area_manager: "Area Manager",
  outlet_staff: "Outlet Staff",
};

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  hq_admin: "Sees and manages every outlet automatically.",
  area_manager: "Sees and manages a defined set of outlets — pick at least one below.",
  outlet_staff: "POS access at exactly one outlet — pick it below.",
};

/** The roles offered, in the blueprint Section 13 hierarchy order (top to bottom). */
export const ROLE_OPTIONS: StaffRole[] = ["hq_admin", "area_manager", "outlet_staff"];

/** Kuala Lumpur time, deterministic on the server — same convention as menu-format.ts / order-format.ts. */
export function formatStaffTime(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(iso));
}
