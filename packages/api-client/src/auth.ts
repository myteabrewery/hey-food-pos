import { z } from "zod";

import { StaffPinSchema } from "./admin-staff";
import { OutletRefSchema } from "./common";
import { CustomerSchema, PublicStaffUserSchema } from "./entities";

// POST /auth/customer/otp/request
export const OtpRequestRequestSchema = z.object({
  phone: z.string(),
});
export type OtpRequestRequest = z.infer<typeof OtpRequestRequestSchema>;

export const OtpRequestResponseSchema = z.object({
  success: z.boolean(),
  retryAfterSeconds: z.number().optional(),
});
export type OtpRequestResponse = z.infer<typeof OtpRequestResponseSchema>;

// POST /auth/customer/otp/verify
export const OtpVerifyRequestSchema = z.object({
  phone: z.string(),
  code: z.string(),
});
export type OtpVerifyRequest = z.infer<typeof OtpVerifyRequestSchema>;

/** Verifying an unrecognized phone implicitly creates a new Customer (blueprint Section 1's "one account" model). */
export const OtpVerifyResponseSchema = z.object({
  token: z.string(),
  customer: CustomerSchema,
});
export type OtpVerifyResponse = z.infer<typeof OtpVerifyResponseSchema>;

// POST /auth/staff/login
/**
 * Real POS staff PIN login (dev spec Section 5.5), replacing the POS_DEVICE_KEY
 * stopgap. See docs/STATUS.md for the full design writeup; the shape here:
 *
 * - `businessId`: supplied by the POS APP from its own build configuration
 *   (`EXPO_PUBLIC_POS_BUSINESS_ID`, mirroring the HQ app's `HQ_BUSINESS_ID`) —
 *   never typed by a human. A PIN is only unique WITHIN a business, so without
 *   this the backend can't know which business's staff to check against.
 * - `deviceId`: an OPAQUE identifier the POS app generates once and keeps for
 *   the life of the install (not a secret, not validated against any device
 *   registry — device binding, dev spec 5.5's other half, does not exist yet
 *   and is a deliberately separate follow-up). Recorded on the session so a
 *   future device-management view has something to show.
 * - `outletId`: ABSENT on the first call. Sent only on a SECOND call, after a
 *   first response came back `status: "choose_outlet"` — see below. This is a
 *   deliberate, narrow deviation from "the device knows its outlet, so login
 *   never needs one": that assumption depends on device binding, which
 *   doesn't exist, so an `area_manager` with more than one assigned outlet has
 *   to say which one THIS session is for. `outlet_staff` (exactly one
 *   assigned outlet, enforced by the Staff CHECK constraint) never hits this —
 *   no ambiguity, no deviation. Once real device binding exists, a bound
 *   device's outlet can be passed the same way and this step disappears for
 *   it.
 */
export const StaffLoginRequestSchema = z
  .object({
    businessId: z.string().min(1),
    pin: StaffPinSchema,
    deviceId: z.string().min(1).max(200),
    outletId: z.string().min(1).optional(),
  })
  .strict();
export type StaffLoginRequest = z.infer<typeof StaffLoginRequestSchema>;

/**
 * Two outcomes, not one:
 * - `ok`: session issued outright (outlet_staff always; area_manager with
 *   exactly one assigned outlet; area_manager who already named `outletId`).
 * - `choose_outlet`: PIN was correct, but which outlet is still ambiguous
 *   (an area_manager with more than one assigned outlet and no `outletId`
 *   sent yet) — the client shows `outlets` as a picker and resubmits the same
 *   PIN + deviceId with the chosen `outletId`. Issues NO session and NO token:
 *   nothing to revoke or expire for a login that never completed.
 *
 * `hq_admin` never appears here: rejected outright (403) before either
 * outcome, since blueprint's own device table lists HQ Admin's device as the
 * web dashboard, not POS.
 */
export const StaffLoginResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), token: z.string(), staff: PublicStaffUserSchema, outlet: OutletRefSchema }),
  z.object({ status: z.literal("choose_outlet"), outlets: z.array(OutletRefSchema) }),
]);
export type StaffLoginResponse = z.infer<typeof StaffLoginResponseSchema>;

// POST /auth/staff/logout
/** Identity comes from the `Authorization: Bearer` token itself — no body. Revokes that ONE session; other devices/sessions for the same staff are unaffected. */
export const StaffLogoutResponseSchema = z.object({ success: z.boolean() });
export type StaffLogoutResponse = z.infer<typeof StaffLogoutResponseSchema>;

// POST /admin/outlets/:id/pos-devices
/**
 * Real device binding (dev spec 5.5's other half): NOT built. `PosDevice` in
 * Prisma has no field to support pairing at all today (id/outletId/deviceName/
 * lastSeenAt/connectionStatus only — decorative health-status data for the HQ
 * dashboard, not an auth mechanism), so this would need its own migration.
 * Deliberately deferred; PIN login (above) works standalone without it.
 */
export const CreatePosDeviceRequestSchema = z.object({
  deviceName: z.string(),
});
export type CreatePosDeviceRequest = z.infer<typeof CreatePosDeviceRequestSchema>;

export const CreatePosDeviceResponseSchema = z.object({
  deviceId: z.string(),
  pairingCode: z.string(),
});
export type CreatePosDeviceResponse = z.infer<typeof CreatePosDeviceResponseSchema>;
