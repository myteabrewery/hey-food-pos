import type { ISODateString } from "./common";

export type OutletStatus = "open" | "closed";

export interface DayHours {
  /** 24-hour "HH:mm", e.g. "09:00". */
  open: string;
  /** 24-hour "HH:mm", e.g. "22:00". */
  close: string;
  closed?: boolean;
}

export type OperatingHours = Record<
  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
  DayHours
>;

/** docs/hey-food-developer-spec-v1.md Section 1 */
export interface Outlet {
  id: string;
  businessId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  geofenceRadiusM: number;
  operatingHours: OperatingHours;
  status: OutletStatus;
  createdAt: ISODateString;
}
