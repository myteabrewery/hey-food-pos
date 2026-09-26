import { z } from "zod";

import { listResponseSchema, OutletRefSchema } from "./common";
import { PublicStaffUserSchema, StaffRoleSchema } from "./entities";
import { GuestPhoneSchema } from "./phone";

/**
 * HQ Staff (dev spec Section 6/9.4 "Staff (accounts, role, outlet assignment)",
 * blueprint Section 13's three-role hierarchy). NOT in dev spec Section 2's
 * endpoint list (only `POST /auth/staff/login`, unbuilt, is): the admin CRUD
 * routes below are new, documented in docs/STATUS.md:
 *
 *   GET   /admin/staff                 list, one business
 *   POST  /admin/staff                 create
 *   GET   /admin/staff/:id             one staff member
 *   PATCH /admin/staff/:id             edit name/phone/role/outlets
 *   POST  /admin/staff/:id/reset-pin       set a new PIN
 *   POST  /admin/staff/:id/reset-password  set a new HQ password (hq_admin/area_manager only)
 *   POST  /admin/staff/:id/deactivate  isActive -> false
 *   POST  /admin/staff/:id/reactivate  isActive -> true
 *
 * Real auth: `HqAdminSessionGuard` (`POST /auth/hq/login`), replacing the
 * `HQ_ADMIN_KEY` shared-secret stand-in outright. `businessId` is no longer a
 * request field anywhere below — it comes from the calling session, never
 * from the client. This is also the screen writing `pinHash`/`passwordHash`
 * — real POS login and real HQ login each check theirs for real, so a
 * change here has immediate effect on what each accepts.
 */

/** Exactly 6 digits. Not attempting to reject weak PINs (all-same-digit, sequential) — past this project's stage. */
export const StaffPinSchema = z.string().regex(/^\d{6}$/, "must be exactly 6 digits");

/**
 * A real password for HQ web login (`POST /auth/hq/login`) — NOT a PIN. A
 * browser has a full keyboard, unlike a POS tablet's numeric keypad, and HQ's
 * blast radius (reprice the business, cancel any order, manage staff, read
 * every customer) is categorically larger than one outlet's queue, so this
 * is deliberately not "a longer PIN". Length only, no composition rules —
 * current guidance favors length over composition theatre; the upper bound
 * just keeps `scrypt`'s cost on adversarial input reasonable.
 */
export const StaffPasswordSchema = z.string().min(10, "must be at least 10 characters").max(128, "must be at most 128 characters");

/**
 * The role/outlet-assignment invariant (blueprint Section 13): `hq_admin` sees
 * every outlet BECAUSE of the role and lists none; `outlet_staff` is bound to
 * exactly one outlet (dev spec 5.5's device-outlet binding assumes a single
 * staff-outlet pairing); `area_manager` needs at least one. Returns the
 * problem, or null if the pairing is valid.
 *
 * A PLAIN function, not folded into the zod schema below, because the backend
 * needs the identical rule for a case zod can't see: `PATCH /admin/staff/:id`
 * may send only `role` OR only `assignedOutletIds`, so re-validating the
 * invariant means checking the MERGED (existing + patch) values against DB
 * state — this is that one implementation, called from both places, and also
 * backed by a hand-written CHECK constraint in the database (belt and
 * suspenders — the same pattern as `orders_cancel_detail_only_for_other`).
 */
export function checkStaffOutletAssignment(
  role: z.infer<typeof StaffRoleSchema>,
  assignedOutletIds: string[],
): string | null {
  const count = assignedOutletIds.length;
  if (new Set(assignedOutletIds).size !== count) {
    return "the same outlet is listed twice";
  }
  if (role === "hq_admin" && count !== 0) {
    return "an HQ Admin sees every outlet automatically — don't assign specific outlets";
  }
  if (role === "outlet_staff" && count !== 1) {
    return "outlet staff must be assigned to exactly one outlet";
  }
  if (role === "area_manager" && count < 1) {
    return "an area manager needs at least one assigned outlet";
  }
  return null;
}

// GET /admin/staff
/** No query params at all now: `businessId` comes from the calling session, never the client. `.strict()` still catches a stray one rather than silently ignoring it. */
export const AdminStaffListQuerySchema = z.object({}).strict();
export type AdminStaffListQuery = z.infer<typeof AdminStaffListQuerySchema>;

/**
 * `outlets` is the business's outlets (for the outlet-assignment picker's
 * choices), bundled with the list so the screen needs no second call — same
 * reasoning as `AdminOrderListResponseSchema`.
 */
export const AdminStaffListResponseSchema = listResponseSchema(PublicStaffUserSchema).extend({
  outlets: z.array(OutletRefSchema),
});
export type AdminStaffListResponse = z.infer<typeof AdminStaffListResponseSchema>;

// GET /admin/staff/:id
/** Bundles `outlets` too, for the same reason: the edit form's picker needs the full list regardless of this staff member's own assignment. */
export const AdminStaffDetailResponseSchema = z.object({
  staff: PublicStaffUserSchema,
  outlets: z.array(OutletRefSchema),
});
export type AdminStaffDetailResponse = z.infer<typeof AdminStaffDetailResponseSchema>;

/** `hq_admin`/`area_manager` need a password to log into HQ; `outlet_staff` never do (no HQ-scoped action at all — dev spec Section 11). */
export function needsHqPassword(role: z.infer<typeof StaffRoleSchema>): boolean {
  return role === "hq_admin" || role === "area_manager";
}

// POST /admin/staff
/** `businessId` comes from the calling session — creating a staff member in another business is not something a request can ask for. */
export const CreateStaffRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    phone: GuestPhoneSchema,
    role: StaffRoleSchema,
    assignedOutletIds: z.array(z.string().min(1)),
    pin: StaffPinSchema,
    // Optional here (unlike `pin`, always required): required for
    // hq_admin/area_manager, forbidden for outlet_staff — checked below,
    // same "role decides which fields are legal" pattern as
    // checkStaffOutletAssignment.
    password: StaffPasswordSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const problem = checkStaffOutletAssignment(value.role, value.assignedOutletIds);
    if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["assignedOutletIds"], message: problem });

    const needsPassword = needsHqPassword(value.role);
    if (needsPassword && value.password === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "HQ Admin and Area Manager accounts need a password to log into HQ" });
    }
    if (!needsPassword && value.password !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "Outlet Staff never log into HQ — no password here" });
    }
  });
export type CreateStaffRequest = z.input<typeof CreateStaffRequestSchema>;
export type ParsedCreateStaffRequest = z.output<typeof CreateStaffRequestSchema>;

export const CreateStaffResponseSchema = PublicStaffUserSchema;
export type CreateStaffResponse = z.infer<typeof CreateStaffResponseSchema>;

// PATCH /admin/staff/:id
/**
 * Master fields only — never `pin`/`pinHash` (that is `reset-pin`, its own action
 * with its own confirmation) and never `isActive` (that is `deactivate`/`reactivate`).
 * At least one of `name`/`phone`/`role`/`assignedOutletIds` is required. If `role`
 * changes without `assignedOutletIds` in the same request, the invariant is checked
 * against the EXISTING assignment (a role change that leaves a now-invalid outlet
 * list, e.g. hq_admin promoted from outlet_staff while still "assigned" to one
 * outlet, must be rejected, not silently kept) — the backend re-validates using
 * whichever of the two changed.
 */
export const UpdateStaffRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    phone: GuestPhoneSchema.optional(),
    role: StaffRoleSchema.optional(),
    assignedOutletIds: z.array(z.string().min(1)).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.name === undefined && value.phone === undefined && value.role === undefined && value.assignedOutletIds === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "send at least one field to change" });
    }
    // The role/outlet-count invariant needs the row this staff member ALREADY
    // has (see checkStaffOutletAssignment's doc comment) — the backend
    // re-checks it against the merged values. Only what zod alone can see:
    // no outlet listed twice.
    if (value.assignedOutletIds && new Set(value.assignedOutletIds).size !== value.assignedOutletIds.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["assignedOutletIds"], message: "the same outlet is listed twice" });
    }
  });
export type UpdateStaffRequest = z.input<typeof UpdateStaffRequestSchema>;
export type ParsedUpdateStaffRequest = z.output<typeof UpdateStaffRequestSchema>;

export const UpdateStaffResponseSchema = PublicStaffUserSchema;
export type UpdateStaffResponse = z.infer<typeof UpdateStaffResponseSchema>;

// POST /admin/staff/:id/reset-pin
export const ResetStaffPinRequestSchema = z.object({ pin: StaffPinSchema }).strict();
export type ResetStaffPinRequest = z.infer<typeof ResetStaffPinRequestSchema>;

export const ResetStaffPinResponseSchema = PublicStaffUserSchema;
export type ResetStaffPinResponse = z.infer<typeof ResetStaffPinResponseSchema>;

// POST /admin/staff/:id/reset-password
/** Also how a staff member promoted INTO hq_admin/area_manager gets their first password — "reset" whether or not one already existed, same as reset-pin. Rejected outright for an outlet_staff target (400): they can never log into HQ. */
export const ResetStaffPasswordRequestSchema = z.object({ password: StaffPasswordSchema }).strict();
export type ResetStaffPasswordRequest = z.infer<typeof ResetStaffPasswordRequestSchema>;

export const ResetStaffPasswordResponseSchema = PublicStaffUserSchema;
export type ResetStaffPasswordResponse = z.infer<typeof ResetStaffPasswordResponseSchema>;

// POST /admin/staff/:id/deactivate, POST /admin/staff/:id/reactivate
export const SetStaffActiveResponseSchema = PublicStaffUserSchema;
export type SetStaffActiveResponse = z.infer<typeof SetStaffActiveResponseSchema>;
