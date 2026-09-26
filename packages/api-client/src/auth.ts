import { z } from "zod";

import { StaffPasswordSchema, StaffPinSchema } from "./admin-staff";
import { OutletRefSchema } from "./common";
import { CustomerSchema, PublicStaffUserSchema } from "./entities";
import { GuestPhoneSchema } from "./phone";

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

// POST /auth/hq/login
/**
 * Real HQ Admin web login, replacing the `HQ_ADMIN_KEY` shared-secret
 * stand-in outright (see docs/STATUS.md, "Real HQ authentication"). NOT in
 * dev spec Section 2 (only `POST /auth/staff/login` is) and NOT the same
 * flow as that one, deliberately:
 *
 * - Credential is a real PASSWORD, not a PIN — see `StaffPasswordSchema`'s
 *   doc comment for why a browser-based admin surface warrants more than a
 *   POS tablet's numeric keypad.
 * - Looked up by `phone` (unique per business, same as staff creation),
 *   directly, not by scanning every staff member's hash the way PIN login
 *   does — a password isn't engineered to be business-wide-unique the way a
 *   6-digit PIN is, so this needs an identifier alongside the secret.
 * - No outlet resolution or `choose_outlet` step: an HQ session is never
 *   bound to one outlet (`hq_admin` sees all; `area_manager` may have
 *   several) — see `StaffSession.outletId`, nullable for exactly this case.
 * - `outlet_staff` is rejected outright (403), symmetric to `hq_admin`'s
 *   rejection at POS login: the permissions matrix (dev spec Section 11)
 *   gives Outlet Staff no HQ-scoped action at all.
 * - `businessId` is supplied by the HQ APP's own server configuration
 *   (`HQ_BUSINESS_ID`, mirroring the POS app's `POS_BUSINESS_ID`) — never
 *   typed by a human, and only needed at login; every subsequent `/admin/*`
 *   call derives `businessId` from the session itself, not this field.
 */
export const HqLoginRequestSchema = z
  .object({
    businessId: z.string().min(1),
    phone: GuestPhoneSchema,
    password: StaffPasswordSchema,
  })
  .strict();
export type HqLoginRequest = z.infer<typeof HqLoginRequestSchema>;

/** One outcome, unlike POS login: no outlet ambiguity to resolve, so no discriminated union. */
export const HqLoginResponseSchema = z.object({
  token: z.string(),
  staff: PublicStaffUserSchema,
});
export type HqLoginResponse = z.infer<typeof HqLoginResponseSchema>;

// POST /auth/hq/logout
/** Identity from the `Authorization: Bearer` token itself — no body. Revokes that ONE session. */
export const HqLogoutResponseSchema = z.object({ success: z.boolean() });
export type HqLogoutResponse = z.infer<typeof HqLogoutResponseSchema>;

// GET /auth/hq/session
/**
 * Not in dev spec Section 2 at all: a browser session has no login-response
 * payload to remember between page loads the way the POS app's SecureStore
 * does, so the HQ Next.js server re-resolves "who is this" from the httpOnly
 * cookie on each render via this endpoint (re-validated against the live
 * `StaffSession` row every time — the same "revoked/deactivated takes effect
 * immediately" property as every other use of `StaffSessionGuard`).
 */
export const HqSessionResponseSchema = z.object({
  staff: PublicStaffUserSchema,
});
export type HqSessionResponse = z.infer<typeof HqSessionResponseSchema>;

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
