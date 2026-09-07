/**
 * docs/hey-food-developer-spec-v1.md Section 1, staffing hierarchy per
 * blueprint Section 13.
 */
export type StaffRole = "hq_admin" | "area_manager" | "outlet_staff";

/** docs/hey-food-developer-spec-v1.md Section 1 */
export interface StaffUser {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  role: StaffRole;
  /** Empty for `hq_admin` (sees all outlets); one outlet for `outlet_staff`. */
  assignedOutletIds: string[];
  pinHash: string;
}
