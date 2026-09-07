import { ISODateString } from "./common";

export type OutletStatus = "open" | "closed";

/** docs/hey-food-developer-spec-v1.md Section 1 */
export interface Outlet {
  id: string;
  businessId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  geofenceRadiusM: number;
  /** Unstructured for MVP — spec does not define a shape for this yet. */
  operatingHours: string;
  status: OutletStatus;
  createdAt: ISODateString;
}
