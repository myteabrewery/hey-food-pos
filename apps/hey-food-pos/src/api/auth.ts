import type { StaffLoginResponse } from "@hey-food/api-client";
import { StaffLoginResponseSchema, StaffLogoutResponseSchema } from "@hey-food/api-client";

import { POS_BUSINESS_ID } from "../config";
import { posRequest } from "./http";

/**
 * `POST /auth/staff/login` — real staff PIN login (dev spec 5.5), replacing
 * POS_DEVICE_KEY. `businessId` comes from this app's own config (see
 * config.ts), never typed by anyone; `outletId` is sent only on a SECOND call
 * after a first response came back `choose_outlet` (an area_manager with more
 * than one assigned outlet — see LoginScreen).
 */
export async function loginStaff(pin: string, deviceId: string, outletId?: string): Promise<StaffLoginResponse> {
  return StaffLoginResponseSchema.parse(
    await posRequest("POST", "/auth/staff/login", { businessId: POS_BUSINESS_ID, pin, deviceId, ...(outletId ? { outletId } : {}) }, { withAuth: false }),
  );
}

/** `POST /auth/staff/logout` — revokes THIS session only; identified by the bearer token itself. */
export async function logoutStaff(): Promise<void> {
  StaffLogoutResponseSchema.parse(await posRequest("POST", "/auth/staff/logout"));
}
