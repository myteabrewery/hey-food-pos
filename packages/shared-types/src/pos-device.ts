import type { ISODateString } from "./common";

export type ConnectionStatus = "online" | "offline";

/** docs/hey-food-developer-spec-v1.md Section 1 */
export interface POSDevice {
  id: string;
  outletId: string;
  deviceName: string;
  lastSeenAt: ISODateString;
  connectionStatus: ConnectionStatus;
}
