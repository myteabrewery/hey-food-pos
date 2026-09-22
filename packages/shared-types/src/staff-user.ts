import type { ISODateString } from "./common";

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
  /** Empty for `hq_admin` (sees all outlets); exactly one for `outlet_staff`; one or more for `area_manager`. */
  assignedOutletIds: string[];
  pinHash: string;
  /** When `pinHash` was last set — at creation, and again on every reset. Not "who": there is no login to attribute it to. */
  pinChangedAt: ISODateString;
  /** A deactivated account keeps its record (so history stays intact) but can never log in once real PIN auth checks this. */
  isActive: boolean;
  createdAt: ISODateString;
}
