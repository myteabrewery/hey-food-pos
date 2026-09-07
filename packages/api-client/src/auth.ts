import { z } from "zod";

import { CustomerSchema, OutletSchema, PublicStaffUserSchema } from "./entities";

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
 * No `outletId` in the request — dev spec Section 5.5: the outlet binding
 * lives on the device (set up once via the pos-devices endpoint below),
 * not chosen at login.
 */
export const StaffLoginRequestSchema = z.object({
  pin: z.string(),
  deviceId: z.string(),
});
export type StaffLoginRequest = z.infer<typeof StaffLoginRequestSchema>;

export const StaffLoginResponseSchema = z.object({
  token: z.string(),
  staff: PublicStaffUserSchema,
  outlet: OutletSchema,
});
export type StaffLoginResponse = z.infer<typeof StaffLoginResponseSchema>;

// POST /admin/outlets/:id/pos-devices
/** HQ/setup action — registers a new POS device and issues its pairing code. */
export const CreatePosDeviceRequestSchema = z.object({
  deviceName: z.string(),
});
export type CreatePosDeviceRequest = z.infer<typeof CreatePosDeviceRequestSchema>;

export const CreatePosDeviceResponseSchema = z.object({
  deviceId: z.string(),
  pairingCode: z.string(),
});
export type CreatePosDeviceResponse = z.infer<typeof CreatePosDeviceResponseSchema>;
